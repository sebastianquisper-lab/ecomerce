import React, { useState, useEffect } from "react";
import { CartItem } from "./CartItem";
import { useNavigate } from "react-router-dom";

export const OffCanvasCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const navigate = useNavigate();

  const calculateSubtotal = (cart) => cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const loadCart = () => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(storedCart);
    setSubTotal(calculateSubtotal(storedCart));
  };

  useEffect(() => {
    loadCart();
    window.addEventListener("cartUpdated", loadCart);
    return () => window.removeEventListener("cartUpdated", loadCart);
  }, []);

  const updateCartItem = (index, newQuantity) => {
    const updatedCart = [...cartItems];
    const item = updatedCart[index];

    if (newQuantity < 1 || newQuantity > item.availableStock) {
      alert(`⚠ No puedes agregar más. Stock disponible: ${item.availableStock}`);
      return;
    }

    updatedCart[index].quantity = newQuantity;
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setSubTotal(calculateSubtotal(updatedCart));
  };

  const removeCartItem = (index) => {
    const updatedCart = [...cartItems];
    updatedCart.splice(index, 1);
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setSubTotal(calculateSubtotal(updatedCart));
  };

  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      alert("El carrito está vacío");
      return;
    }
    navigate("/checkout");
  };

  return (
    <div className="offcanvas offcanvas-end" data-bs-scroll="true" tabIndex="-1" id="offcanvasRight">
      <div className="offcanvas-header pb-0 ps-1">
        <h4 className="fw-bold">Shopping Cart</h4>
        <button type="button" className="btn-close" data-bs-dismiss="offcanvas"></button>
      </div>

      <div className="offcanvas-body pt-0">
        {cartItems.length > 0 ? (
          <>
            <h5 className="fw-light py-3">{cartItems.length} items</h5>
            <hr />
            {cartItems.map((item, index) => (
              <CartItem
                key={index}
                item={item}
                index={index}
                updateCartItem={updateCartItem}
                removeCartItem={removeCartItem}
              />
            ))}
            <hr />
            <h5>Subtotal: ${subTotal}</h5>
            <button className="btn btn-dark w-100 mt-3" onClick={proceedToCheckout}>
              Proceed to Checkout
            </button>
          </>
        ) : (
          <p className="text-center">Tu carrito está vacío</p>
        )}
      </div>
    </div>
  );
};
