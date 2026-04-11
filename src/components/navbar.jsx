import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom"; 
import ReorderIcon from "@mui/icons-material/Reorder";
import CloseIcon from "@mui/icons-material/Close";
import "../style/navbar.css";
import logo from "../assets/logo.png";
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';

function Navbar({ cart = {} }) {
  const [openMenu, setOpenMenu] = useState(false);
  const location = useLocation(); 

  const toggleMenu = () => setOpenMenu(!openMenu);
  
 
  const cartCount = cart ? Object.values(cart).reduce((a, b) => a + b, 0) : 0;
  
  const isHomePage = location.pathname === "/";

  return (
    <nav className={`navbar ${isHomePage ? "home-nav" : "general-nav"}`}>
      
      
      {!isHomePage && (
        <Link to="/">
          <img src={logo} className="logo" alt="logo" />
        </Link>
      )}

      
      <div className="nav-links desktop">
        <Link to="/">Home</Link>
        <Link to="/menu">Menu</Link>
        <Link to="/customize">Customize Your Own Burger</Link>
        
        
        
        <span className="nav-phone">03 231 506</span>

        <Link to="/cart" className="cart-icon">
          <AddShoppingCartIcon />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </Link>
      </div>

      
      <button className="mobile-menu-icon" onClick={toggleMenu}>
        <ReorderIcon />
      </button>

      
      <div className={`mobile-menu ${openMenu ? "open" : ""}`}>
        <button className="close-menu-icon" onClick={toggleMenu}>
          <CloseIcon />
        </button>
        <Link to="/" onClick={toggleMenu}>Home</Link>
        <Link to="/menu" onClick={toggleMenu}>Menu</Link>
        <Link to="/customize" onClick={toggleMenu}> Customize Your Burger </Link>
        <Link to="/cart" onClick={toggleMenu}>Cart</Link>
      </div>
    </nav>
  );
}

export default Navbar;