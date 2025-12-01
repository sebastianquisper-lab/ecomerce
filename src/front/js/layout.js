import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { BackendURL } from "./component/backendURL";

import { Home } from "./pages/home";
import { Favorites } from "./pages/favorites";
import { Register } from "./pages/register";
import { Catalogue } from "./pages/catalogue";
import { ProductDetails } from "./pages/productDetails";
import injectContext from "./store/appContext";

import { Navbar } from "./component/navbar";
import { JumbotronNavBar } from "./component/jumbotronNavBar";
import { Footer } from "./component/footer";
import SupportWidget from "./component/SupportWidget";
import { Checkout } from "./pages/checkout"; 



// Importa tu CartProvider
import { CartProvider } from "./store/CartContext";


const Layout = () => {
  const basename = process.env.BASENAME || "";

  if (!process.env.BACKEND_URL || process.env.BACKEND_URL === "")
    return <BackendURL />;

  return (
    // Envuelve todo en CartProvider
    <CartProvider>
      <div>
        <BrowserRouter basename={basename}>
          <ScrollToTop>
            <Navbar />
            <JumbotronNavBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/register" element={<Register />} />
              <Route path="/catalogue/:theid" element={<Catalogue />} />
              <Route path="/productDetails/:theid" element={<ProductDetails />} />
              <Route path="/checkout" element={<Checkout />} />

          
              <Route path="*" element={<h1>Not found!</h1>} />
            </Routes>
            <Footer />
          </ScrollToTop>

          {/* Widget flotante */}
          <SupportWidget defaultCreatorEmail={""} />
        </BrowserRouter>
      </div>
    </CartProvider>
  );
};

export default injectContext(Layout);
