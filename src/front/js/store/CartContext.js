import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated")); // Para OffCanvasCart si lo escuchas
  }, [cart]);

  const addToCart = (item) => {
        const existingCart = JSON.parse(localStorage.getItem("cart")) || [];

        const stockItem = item.product.stock.find(
            s => s.color_id === item.color.id && s.size_id === item.size.id
        );

        const newItem = {
            product_id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            img: item.product.img,
            color_id: item.color.id,
            size_id: item.size.id,
            color: item.color.name,
            size: item.size.name,
            quantity: item.quantity,
            availableStock: stockItem?.quantity || 0, // stock actual
        };

        existingCart.push(newItem);
        localStorage.setItem("cart", JSON.stringify(existingCart));
        setCart(existingCart);
    };


  const updateCartItem = (index, quantity) => {
    const item = cart[index];
    if (quantity < 1 || quantity > item.stock) {
      alert(`⚠ No puedes agregar más. Stock disponible: ${item.stock}`);
      return;
    }
    const newCart = [...cart];
    newCart[index].quantity = quantity;
    setCart(newCart);
  };

  const removeCartItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, setCart, addToCart, updateCartItem, removeCartItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
