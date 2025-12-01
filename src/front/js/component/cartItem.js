import React from "react";
import { Link } from "react-router-dom";

export const CartItem = ({ item, index, updateCartItem, removeCartItem }) => {
  return (
    <div className="d-flex mb-3">
      <div className="col-3">
        <Link to={"/productDetails/" + item.product_id}>
          <img src={item.img} className="card-img-top" alt={item.name} />
        </Link>
      </div>
      <div className="ps-3 col-9">
        <p className="card-description">{item.name}</p>
        <p>{item.color} / {item.size}</p>
        <h5>${item.price * item.quantity}</h5>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex">
            <button
              className="size-text"
              onClick={() => updateCartItem(index, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >-</button>
            <p className="size-text mx-2">{item.quantity}</p>
            <button
              className="size-text"
              onClick={() => updateCartItem(index, item.quantity + 1)}
              disabled={item.quantity >= item.availableStock}
            >+</button>
          </div>
          <button className="btn-close" onClick={() => removeCartItem(index)}></button>
        </div>
      </div>
    </div>
  );
};
