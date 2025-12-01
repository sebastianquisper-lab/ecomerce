// src/front/js/component/navbar.js
import React, { useState, useEffect, useContext } from "react";
import { Navbar1 } from "./navbar1";
import { Navbar2 } from "./navbar2";
import { Context } from "../store/appContext"; // <-- ruta corregida, usa appContext
import { useLocation } from "react-router-dom";

const useLoginStatus = () => {
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("token")) {
      setIsLogin(true);
    }
  }, []);

  return { isLogin, setIsLogin };
};

export const Navbar = () => {
  const { store, actions } = useContext(Context);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const location = useLocation();

  // Function to update screen width state on window resize
  const handleResize = () => {
    setScreenWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { isLogin, setIsLogin } = useLoginStatus();

  return (
    <div>
      {screenWidth >= 992 ? (
        <Navbar1
          store={store}
          actions={actions}
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          location={location}
        />
      ) : (
        <Navbar2
          store={store}
          actions={actions}
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          location={location}
        />
      )}
    </div>
  );
};

export default Navbar;
