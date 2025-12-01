import React, { useContext, useState, useEffect } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";

export const Checkout = () => {
  const { store, actions } = useContext(Context);
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [subTotal, setSubTotal] = useState(0);

  // Cargar carrito desde localStorage
  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(storedCart);
    calculateSubtotal(storedCart);
  }, []);

  const calculateSubtotal = (cart) => {
    const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    setSubTotal(total);
  };

  // Subir/Bajar cantidad respetando stock
  const updateQuantity = (index, newQuantity) => {
    const updatedCart = [...cartItems];
    const item = updatedCart[index];

    if (newQuantity < 1 || newQuantity > item.availableStock) {
      alert(`⚠ Stock disponible: ${item.availableStock}`);
      return;
    }

    updatedCart[index].quantity = newQuantity;
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    calculateSubtotal(updatedCart);
  };

  // Eliminar item
  const removeItem = (index) => {
    const updatedCart = [...cartItems];
    updatedCart.splice(index, 1);
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    calculateSubtotal(updatedCart);
  };

  // Confirmar compra
    const handlePurchase = async () => {
        if (cartItems.length === 0) {
            alert("El carrito está vacío");
            return;
        }

        // base con fallback
        const BASE = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || "";

        try {
            for (const item of cartItems) {
            const res = await fetch(`${BASE}/api/products/update-stock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                productId: item.product_id,
                colorId: item.color_id,
                sizeId: item.size_id,
                quantityPurchased: item.quantity
                }),
            });

            // leer como texto primero (evita crash si backend devuelve HTML)
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Respuesta del backend (no-JSON):", text);
                throw new Error("El backend devolvió HTML o no devolvió JSON. Revisa la ruta y el servidor.");
            }

            if (!res.ok) {
                throw new Error(data.message || "Error al actualizar stock en backend");
            }

            // opcional: usar data.remaining si el backend lo devuelve
            console.log("Backend update-stock response:", data);
            }

            // si tienes actions.updateStock async y quieres actualizar el store local:
            if (actions && actions.updateStock) {
            for (const item of cartItems) {
                // espera si es async
                await actions.updateStock(item.product_id, item.color_id, item.size_id, item.quantity);
            }
            }

            // limpiar carrito
            localStorage.removeItem("cart");
            setCartItems([]);
            setSubTotal(0);

            alert("¡Compra realizada con éxito!");
            navigate("/");

        } catch (error) {
            console.error("handlePurchase error:", error);
            alert("Error al realizar la compra: " + (error.message || error));
        }
        };




  return (
    <div className="container py-5">
      <h2 className="mb-4">Checkout</h2>

      {cartItems.length === 0 ? (
        <p className="text-center">No tienes productos en el carrito.</p>
      ) : (
        <div className="row">
          <div className="col-md-8">
            {cartItems.map((item, index) => (
              <div key={index} className="card mb-3 shadow-sm">
                <div className="row g-0">
                  <div className="col-3">
                    <img src={item.img} className="img-fluid rounded-start" alt={item.name} />
                  </div>
                  <div className="col-9">
                    <div className="card-body">
                      <h5 className="card-title">{item.name}</h5>
                      <p className="card-text">{item.color} / {item.size}</p>
                      <p className="card-text">Precio: ${item.price}</p>
                      <div className="d-flex align-items-center">
                        <button
                          className="btn btn-outline-dark btn-sm me-2"
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >-</button>
                        <span className="mx-2">{item.quantity}</span>
                        <button
                          className="btn btn-outline-dark btn-sm ms-2"
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                        >+</button>
                        <button
                          className="btn btn-danger btn-sm ms-3"
                          onClick={() => removeItem(index)}
                        >Eliminar</button>
                      </div>
                      <p className="mt-2">Subtotal: ${item.price * item.quantity}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="col-md-4">
            <div className="card p-3 shadow-sm">
              <h4>Resumen de la compra</h4>
              <hr />
              <p>Cantidad de productos: {cartItems.length}</p>
              <p className="fw-bold">Total: ${subTotal}</p>
              <button className="btn btn-dark w-100 mt-3" onClick={handlePurchase}>
                Confirmar Compra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
