// src/front/js/component/navbar1.js
import React from "react";
import { Link, useLocation } from "react-router-dom";

import { OffCanvasCart } from "./offCanvasCart";
import { SignInOffcanvas } from "./signInOffcanvas";
import SearchBar from "./SearchBar";

export const Navbar1 = ({ store, actions, isLogin, setIsLogin, location: parentLocation }) => {
  const location = parentLocation || useLocation();

  // decide la fuente segura para SearchBar: si products parece ser catálogo lo usa,
  // si no, usa offers como fallback (lista global completa)
  const searchSource =
    Array.isArray(store?.products) && store.products.length > 1
      ? store.products
      : Array.isArray(store?.offers) && store.offers.length > 0
      ? store.offers
      : [];

  return (
    <nav className="navbar navbar-light bg-light">
      <div className="container d-flex justify-content-between align-items-center">
        {/* Marca */}
        <Link to="/">
          <span className="navbar-brand mb-0 h1">Jamon X</span>
        </Link>

        {/* Search bar - forzamos remount por pathname y pasamos resetKey */}
        <div style={{ flex: 1, margin: "0 1rem" }}>
          <SearchBar
            key={location.pathname}
            resetKey={location.pathname}
            products={searchSource}
          />
        </div>

        {/* Botones de acciones */}
        <div className="d-flex align-items-center">
          <button
            className="btn btn-light me-3"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasRight"
            aria-controls="offcanvasRight"
          >
            <i className="fa-solid fa-cart-shopping"></i>
            <h5>Shopping Cart</h5>
          </button>
          <OffCanvasCart />

          <Link to="/favorites">
            <button className="btn btn-light me-3">
              <i className="fa-regular fa-heart"></i>
              <h5>Favorites</h5>
            </button>
          </Link>

          {!isLogin && (
            <>
              <button
                className="btn"
                type="button"
                data-bs-toggle="offcanvas"
                data-bs-target="#offcanvasExample"
                aria-controls="offcanvasExample"
              >
                <h5>Sign in</h5>
              </button>
              <SignInOffcanvas setIsLogin={setIsLogin} />

              <h5 className="mx-2">or</h5>
              <Link to="/register">
                <button className="btn">
                  <h5>Create an Account</h5>
                </button>
              </Link>
            </>
          )}

          {isLogin && (
            <>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  actions.resetUser();
                  setIsLogin(false);
                }}
              >
                <h5>Log out</h5>
              </button>
              <h5 className="mx-2">/</h5>
              <Link to="/register">
                <button className="btn">
                  <h5>My Account</h5>
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar1;
