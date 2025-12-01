const getState = ({ getStore, getActions, setStore }) => {
  return {
    store: {
      message: null,
      products: [],        // <-- inicializar como array para evitar null
      offers: [],
      collections: [],     // <-- inicializar como array
      sizes: [],           // <-- inicializar como array
      priceRange: null,
      colors: [],          // <-- inicializar como array
      user: null,
      cartFromStorage: JSON.parse(localStorage.getItem("cart")) || [],
      cartFromBackend: [],
    },
    actions: {
      getUser: async () => {
        const token = sessionStorage.getItem("token");
        const options = {
          method: "GET",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
        };
        const response = await fetch(
          process.env.BACKEND_URL + "/api/user",
          options
        );
        const data = await response.json();
        if (response.ok) {
          setStore({ user: data });
          console.log("User found");
        }
      },

      getOffers: async () => {
        const response = await fetch(
          process.env.BACKEND_URL + "/api/products/filter",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        await setStore({ offers: data });
      },

      getProducts: async (filterOptions = {}) => {
        const BASE = process.env.BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";
        console.log("Flux getProducts (BASE):", BASE, "filters:", filterOptions);

        try {
          const url = new URL(BASE + "/api/products/filter");
          const params = new URLSearchParams();

          const appendParam = (param, value) => {
            if (typeof value !== "undefined" && value !== null && value !== "") {
              params.append(param, value);
            }
          };

          appendParam("product_id", filterOptions?.product_id);

          filterOptions?.collection_names?.forEach((collectionName) => {
            if (collectionName !== "allproducts") params.append("collection_names[]", collectionName);
          });

          appendParam("min_price", filterOptions?.min_price);
          appendParam("max_price", filterOptions?.max_price);

          filterOptions?.size_ids?.forEach((sizeId) => params.append("size_ids[]", sizeId));
          filterOptions?.color_ids?.forEach((colorId) => params.append("color_ids[]", colorId));

          appendParam("color_ids", filterOptions?.colorId);
          appendParam("in_stock", filterOptions?.inStock);

          url.search = params.toString();
          console.log("getProducts -> fetching URL:", url.toString());

          const response = await fetch(url.toString(), { method: "GET", headers: { "Content-Type": "application/json" } });
          const text = await response.text();
          let data;
          try { data = JSON.parse(text); } catch (e) { console.error("getProducts - invalid JSON:", text); data = []; }

          console.log("getProducts -> status:", response.status, "data length:", Array.isArray(data) ? data.length : 0, "sample:", data && data[0]);

          // **FIX**: guardar los productos devueltos (no un array vacío)
          await setStore({ products: Array.isArray(data) ? data : [] });
        } catch (error) {
          console.error("getProducts error:", error);
          await setStore({ products: [] });
        }
      },

      getCollections: async () => {
        const response = await fetch(
          process.env.BACKEND_URL + "/api/collections",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        await setStore({ collections: data });
      },

      getSizes: async () => {
        const response = await fetch(process.env.BACKEND_URL + "/api/sizes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        await setStore({ sizes: data });
      },

      getPriceRange: async () => {
        const response = await fetch(
          process.env.BACKEND_URL + "/api/products/price-range",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        await setStore({ priceRange: data });
      },

      getColors: async () => {
        const response = await fetch(process.env.BACKEND_URL + "/api/colors", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        await setStore({ colors: data });
      },

      getColorsByIds: async (colorIds) => {
          if (!colorIds || colorIds.length === 0) return [];
          try {
              const idsParam = colorIds.join(",");
              const response = await fetch(
                  process.env.BACKEND_URL + "/api/colors/" + idsParam,
                  { method: "GET", headers: { "Content-Type": "application/json" } }
              );
              if (!response.ok) return [];
              const data = await response.json();
              return data; // ya es un array plano de colores
          } catch (error) {
              console.error("Error fetching colors:", error);
              return [];
          }
      },
      getSizesByIds: async (sizeIds) => {
          if (!sizeIds || sizeIds.length === 0) return [];
          try {
              const idsParam = sizeIds.join(",");
              const response = await fetch(
                  process.env.BACKEND_URL + "/api/sizes/" + idsParam,
                  { method: "GET", headers: { "Content-Type": "application/json" } }
              );
              if (!response.ok) return [];
              const data = await response.json();
              return data; // array plano con sizes
          } catch (error) {
              console.error("Error fetching sizes:", error);
              return [];
          }
      },



      getCartFromBackend: async () => {
        const token = sessionStorage.getItem("token");

        const response = await fetch(
          process.env.BACKEND_URL + "/api/cart",
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStore({ cartFromBackend: data.cart });
        }
      },

      addCartItem: async (item) => {
        const token = sessionStorage.getItem("token");

        const newCartItem = {
          product_id: item.product_id,
          color_id: item.color_id,
          size_id: item.size_id,
          quantity: item.quantity,
        };

        const response = await fetch(
          process.env.BACKEND_URL + "/api/cart-item",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newCartItem),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          alert(data.message);
          return;
        }

        // Actualizar carrito real
        getActions().getCartFromBackend();
      },

      getCartFromStorage: () => {
          const cart = JSON.parse(localStorage.getItem("cart")) || [];
          setStore({ cartFromStorage: cart });
      },

      addToCart: (item) => {
          const store = getStore();

          const newItem = {
              product_id: item.product_id,
              name: item.name,
              price: item.price,
              img: item.img,
              color_id: item.color_id,
              size_id: item.size_id,
              quantity: item.quantity,
              stock: item.stock
          };

          const existingCart = JSON.parse(localStorage.getItem("cart")) || [];

          existingCart.push(newItem);

          localStorage.setItem("cart", JSON.stringify(existingCart));

          setStore({ cartFromStorage: existingCart });
      },

      

      addFavorite: async (favorite) => {
        const store = getStore();

        if (store.user.id) {
          const token = sessionStorage.getItem("token");
          const newFav = {
            user_id: store.user.id,
            product_id: favorite,
            key: "product_id",
          };

          const response = await fetch(
            process.env.BACKEND_URL + "/api/favorites",
            {
              method: "POST",
              headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              body: JSON.stringify(newFav),
            }
          );
          if (response.ok) {
            getActions().getUser();
          }
        }
      },

      deleteFavorite: async (id) => {
        const token = sessionStorage.getItem("token");

        const response = await fetch(
          process.env.BACKEND_URL + "/api/favorites/" + id,
          {
            method: "DELETE",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
        if (response.ok) {
          await getActions().getUser();
        }
      },
      
      updateStock: async (productId, colorId, sizeId, quantityPurchased) => {
        const store = getStore();
        const product = store.products.find(p => p.id === productId);
        if (!product) return;

        const stockItem = product.stock.find(
          s => s.color_id === colorId && s.size_id === sizeId
        );
        if (!stockItem) return;

        // 🔹 Reducir stock disponible local
        stockItem.quantity -= quantityPurchased;
        if (stockItem.quantity < 0) stockItem.quantity = 0;

        setStore({ products: [...store.products] });

        // 🔹 Actualizar stock en backend
        try {
          const response = await fetch(`${process.env.BACKEND_URL}/api/products/update-stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId, color_id: colorId, size_id: sizeId, quantity: quantityPurchased }),
          });

          const data = await response.json();
          if (!response.ok) {
            console.error("Error actualizando stock:", data.message);
          }
        } catch (error) {
          console.error("Error fetch updateStock:", error);
        }
      },



      resetUser() {
        setStore({ user: null });
        sessionStorage.removeItem("token");
      },
    },
  };
};

export default getState;
