import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";

import "../../styles/productDetails.css";
import ColorOptions from "../component/colorOptions";
import SizeOptions from "../component/sizeOptions";
import { useCart } from "../store/CartContext";

export const ProductDetails = () => {
  const { store, actions } = useContext(Context);
  const params = useParams();
  const navigate = useNavigate();

  const [productInfo, setProductInfo] = useState(null);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [newOrder, setNewOrder] = useState({
    id: params.theid,
    color: null,
    size: null,
    quantity: 1,
    price: null,
    description: null,
    img: null,
  });

  const { addToCart } = useCart();

  // Fetch product
  useEffect(() => {
    actions.getProducts({ product_id: params.theid });
  }, [params.theid]);

  // Set product info
  useEffect(() => {
    if (store.products && store.products.length > 0) {
      setProductInfo(store.products[0]);
    }
  }, [store.products]);

  // Fetch colors & sizes
  useEffect(() => {
    if (productInfo) {
      const colorIds = productInfo.stock.map((s) => s.color_id);
      const sizeIds = productInfo.stock.map((s) => s.size_id);

      actions.getColorsByIds(colorIds).then(setColors);
      actions.getSizesByIds(sizeIds).then(setSizes);
    }
  }, [productInfo, actions]);

  // Auto-select first available color & size
  useEffect(() => {
    if (colors.length > 0 && sizes.length > 0 && productInfo) {
      const firstColor = colors[0];
      const firstSize = sizes[0];
      const stockItem = productInfo.stock.find(
        (s) => s.color_id === firstColor.id && s.size_id === firstSize.id
      );
      const stockQty = stockItem ? stockItem.quantity : 0;

      setNewOrder({
        ...newOrder,
        color: firstColor,
        size: firstSize,
        quantity: stockQty > 0 ? 1 : 0,
        price: productInfo.price,
        description: productInfo.description,
        img: productInfo.img,
      });
    }
  }, [colors, sizes, productInfo]);

  const handleColorSelect = (colorObj) => {
    if (!newOrder.size || !productInfo) return;

    const stockItem = productInfo.stock.find(
      (s) => s.color_id === colorObj.id && s.size_id === newOrder.size.id
    );
    const stockDisponible = stockItem ? stockItem.quantity : 0;

    setNewOrder((prev) => ({
      ...prev,
      color: colorObj,
      quantity: stockDisponible > 0 ? 1 : 0,
    }));
  };

  const handleSizeSelect = (sizeObj) => {
    if (!newOrder.color || !productInfo) return;

    const stockItem = productInfo.stock.find(
      (s) => s.color_id === newOrder.color.id && s.size_id === sizeObj.id
    );
    const stockDisponible = stockItem ? stockItem.quantity : 0;

    setNewOrder((prev) => ({
      ...prev,
      size: sizeObj,
      quantity: stockDisponible > 0 ? 1 : 0,
    }));
  };

  const handleQuantityChange = (change) => {
    if (!productInfo || !newOrder.color || !newOrder.size) return;

    const stockItem = productInfo.stock.find(
      (s) => s.color_id === newOrder.color.id && s.size_id === newOrder.size.id
    );

    if (!stockItem || stockItem.quantity === 0) {
      alert("⚠ Este color/talla no tiene stock");
      return;
    }

    const nuevaCantidad = newOrder.quantity + change;
    if (nuevaCantidad < 1 || nuevaCantidad > stockItem.quantity) return;

    setNewOrder((prev) => ({ ...prev, quantity: nuevaCantidad }));
  };

  const handleAddToCart = () => {
    if (!newOrder.color || !newOrder.size) {
      alert("Selecciona color y talla");
      return;
    }

    const stockItem = productInfo.stock.find(
      (s) => s.color_id === newOrder.color.id && s.size_id === newOrder.size.id
    );

    const stockDisponible = stockItem ? stockItem.quantity : 0;

    if (newOrder.quantity > stockDisponible) {
      alert(`⚠ No puedes agregar más. Stock disponible: ${stockItem.quantity}`);
      return;
    }

    addToCart({
      product: productInfo,
      color: newOrder.color,
      size: newOrder.size,
      quantity: newOrder.quantity,
      stockQuantity: stockDisponible
    });

    alert("Producto agregado al carrito");
  };

  const handleBuyNow = () => {
    handleAddToCart(); // ✅ Reutilizamos la misma validación
    navigate("/checkout");
  };

  return productInfo ? (
    <div className="product-detail container">
      <div className="row">
        <div className="link-tree pt-4 ms-2">
          <p>home - {productInfo.name}</p>
        </div>
      </div>

      <div className="row pt-3 g-0">
        <div className="col-md-7">
          <div className="foto pe-2">
            <img src={productInfo.img} className="img-fluid" alt={productInfo.name} />
          </div>
        </div>
        <div className="col-md-5 ps-5">
          <h2>{productInfo.name}</h2>
          <h5 className="fw-light mb-3">{productInfo.description}</h5>
          <h2 className="my-3">$ {productInfo.price}</h2>

          <p className="fw-bold">Color: {newOrder.color?.name || ""}</p>
          <ColorOptions colors={colors} selectedColor={newOrder.color?.id} onColorSelect={handleColorSelect} />

          <p className="fw-bold">Size: {newOrder.size?.name || ""}</p>
          <SizeOptions sizes={sizes} selectedSize={newOrder.size?.id} onSizeSelect={handleSizeSelect} />

          <p className="fw-bold">Quantity: {newOrder.quantity}</p>
          <div className="d-flex mb-3">
            <p className="size-text" onClick={() => handleQuantityChange(-1)}>-</p>
            <p className="size-text">{newOrder.quantity}</p>
            <p className="size-text" onClick={() => handleQuantityChange(1)}>+</p>
          </div>

          <div className="d-flex mt-2">
            <p className="button-black me-3" onClick={handleAddToCart}>ADD TO CART</p>
            <p className="button-black" onClick={handleBuyNow}>BUY NOW</p>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <h2>Loading...</h2>
  );
};
