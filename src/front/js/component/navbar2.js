// src/front/js/component/navbar2.js
import React from "react";
import { Link, useLocation } from "react-router-dom";

import { OffCanvasCart } from "./offCanvasCart";
import { SignInOffcanvas } from "./signInOffcanvas";
import SearchBar from "./SearchBar";

export const Navbar2 = ({ store, actions, isLogin, setIsLogin, location: parentLocation }) => {
  const location = parentLocation || useLocation();

  // decide la fuente segura para SearchBar (mismo fallback que en desktop)
  const searchSource =
    Array.isArray(store?.products) && store.products.length > 1
      ? store.products
      : Array.isArray(store?.offers) && store.offers.length > 0
      ? store.offers
      : [];

  return (
    <nav className="navbar navbar-light bg-light">
      <button
        className="navbar-toggler ms-3"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasNavbar"
        aria-controls="offcanvasNavbar"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      <div
        className="offcanvas offcanvas-start"
        tabIndex="-1"
        id="offcanvasNavbar"
        aria-labelledby="offcanvasNavbarLabel"
      >
        <div className="offcanvas-header bg-dark text-white">
          <h4 className="offcanvas-title" id="offcanvasNavbarLabel">
            Menu
          </h4>
          <button
            type="button"
            className="btn-close btn btn-light"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body">
          {/* Search bar dentro del offcanvas (móvil) */}
          <div className="mb-3">
            <SearchBar
              key={location.pathname}
              resetKey={location.pathname}
              products={searchSource}
            />
          </div>

          <ul className="navbar-nav justify-content-end flex-grow-1 pe-3">
            <li className="nav-item">
              <Link to={"/catalogue/" + "allproducts"} className="d-flex align-items-center" data-bs-dismiss="offcanvas">
                <img src="" className="circle" alt="" />
                <h4 className="black">All our products</h4>
              </Link>
              <hr />
            </li>
            {Array.isArray(store?.collections) &&
              store.collections.map((item) => {
                return (
                  <li className="nav-item" key={item.id}>
                    <Link to={"/catalogue/" + item.name} className="d-flex align-items-center">
                      <img src={item.img} className="circle" alt={item.name} />
                      <h4 className="black">{item.name}</h4>
                    </Link>
                    <hr />
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      <div>
        <Link to="/">
          <span className="navbar-brand mb-0 h1">your name</span>
        </Link>
      </div>

      <div className="d-flex me-3">
        {!isLogin && (
          <>
            <button className="btn p-0" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasExample" aria-controls="offcanvasExample">
              <i className="fa-regular fa-user login"></i>
            </button>
            <SignInOffcanvas setIsLogin={setIsLogin} />
          </>
        )}
        {isLogin && (
          <>
            <button className="btn" type="button" onClick={() => { actions.resetUser(); setIsLogin(false); }}>
              <h5>Log out </h5>
            </button>
          </>
        )}
        <button className="btn btn-light" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasRight" aria-controls="offcanvasRight">
          <i className="fa-solid fa-cart-shopping"></i>
        </button>
        <OffCanvasCart />
      </div>
    </nav>
  );
};

export default Navbar2;
