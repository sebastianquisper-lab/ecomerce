import React from "react";
import { useCart } from "../store/CartContext";

const Cart = () => {
  const { cart, removeFromCart } = useCart();

  return (
    <div>
      <h2>Mi Carrito</h2>
      {cart.length === 0 && <p>Carrito vacío</p>}
      {cart.map((item, index) => (
        <div key={index}>
          <p>{item.product.name} - {item.color} - {item.size} x {item.quantity}</p>
          <button onClick={() => removeFromCart(index)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
};

export default Cart;
