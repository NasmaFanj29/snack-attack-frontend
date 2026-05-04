import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import "../style/navbar.css";

export default function Navbar({ cartCount = 0, cartItems = [], removeFromCart, addToCart }) {
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const desktopCartRef = useRef(null);
  const mobileCartRef = useRef(null);
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handler = (e) => {
      const clickedDesktop = desktopCartRef.current && desktopCartRef.current.contains(e.target);
      const clickedMobile = mobileCartRef.current && mobileCartRef.current.contains(e.target);
      if (!clickedDesktop && !clickedMobile) setCartOpen(false);
    };
    if (cartOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cartOpen]);

  // ✅ Fix NaN — كل قيمة بتتحقق
  const totalPrice = cartItems.reduce((acc, item) => {
    const basePrice = Number(item.price) || 0;
    const extras = Array.isArray(item.selectedExtras)
      ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0)
      : 0;
    const qty = Number(item.quantity) || 1;
    return acc + (basePrice + extras) * qty;
  }, 0);

  const popupContent = (
    <>
      <div className="nav-cart-popup-header">
        <span>My Order</span>
        <span className="nav-cart-popup-total">${totalPrice.toFixed(2)}</span>
      </div>
      <div className="nav-cart-popup-body">
        {cartItems.length === 0 ? (
          <p className="nav-cart-popup-empty">Cart is empty</p>
        ) : (
          cartItems.map((item, idx) => {
            const basePrice = Number(item.price) || 0;
            const extras = Array.isArray(item.selectedExtras)
              ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0)
              : 0;
            const qty = Number(item.quantity) || 1;
            const lineTotal = (basePrice + extras) * qty;
            return (
              <div key={idx} className="nav-cpi">
                <div className="nav-cpi-left">
                  <span className="nav-cpi-name">{item.name}</span>
                  {Array.isArray(item.selectedExtras) && item.selectedExtras.length > 0 && (
                    <span className="nav-cpi-extras">+ {item.selectedExtras.map(e => e.name).join(", ")}</span>
                  )}
                  {Array.isArray(item.removedExtras) && item.removedExtras.length > 0 && (
                    <span className="nav-cpi-removed">✕ No {item.removedExtras.map(e => e.name).join(", ")}</span>
                  )}
                  {item.specialNote && (
                    <span className="nav-cpi-note">📝 {item.specialNote}</span>
                  )}
                </div>
                <div className="nav-cpi-right">
                  <span className="nav-cpi-qty">×{qty}</span>
                  <span className="nav-cpi-price">${lineTotal.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="nav-cart-popup-footer">
        <div className="nav-cart-popup-subtotal">
          <span>Total</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>
        <button
          className="nav-cart-popup-btn"
          onClick={() => { setCartOpen(false); navigate("/cart"); }}
        >
          Proceed to Checkout →
        </button>
      </div>
    </>
  );

  const ThemeBtn = () => (
    <button className="theme-toggle-btn" onClick={toggle} title={isDark ? "Light Mode" : "Dark Mode"}>
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">{isDark ? "🌙" : "☀️"}</span>
      </span>
    </button>
  );

  return (
    <>
      <nav className={`navbar ${isHome ? "nav-home" : ""}`}>
        <div className="navbar-inner">

          {/* Desktop Links */}
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/menu" className={`nav-link ${location.pathname === "/menu" ? "active" : ""}`}>Menu</Link>
          </div>

          {/* Desktop Actions */}
          <div className="nav-actions">
            <a href="tel:+96103231506" className="nav-phone">📞 03 231 506</a>
            <div className="nav-cart-popup-wrap" ref={desktopCartRef}>
              <button
                className="nav-cart"
                onClick={() => cartCount > 0 ? setCartOpen(o => !o) : navigate("/cart")}
              >
                🛒
                {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
              </button>
              <div className={`nav-cart-popup ${cartOpen ? "open" : ""}`}>
                {popupContent}
              </div>
            </div>
            <div className="nav-theme-toggle"><ThemeBtn /></div>
          </div>

          {/* Mobile Buttons */}
          <div className="nav-mobile-btns">
            <ThemeBtn />
            <div className="nav-cart-popup-wrap" ref={mobileCartRef}>
              <button
                className="nav-cart-m"
                onClick={() => cartCount > 0 ? setCartOpen(o => !o) : navigate("/cart")}
              >
                🛒
                {cartCount > 0 && <span className="nav-badge-m">{cartCount}</span>}
              </button>
              <div className={`nav-cart-popup nav-cart-popup-mobile ${cartOpen ? "open" : ""}`}>
                {popupContent}
              </div>
            </div>
            <button className="nav-burger" onClick={() => setOpen(true)}>☰</button>
          </div>

        </div>
      </nav>

      {/* Dim */}
      <div className={`nav-dim ${open ? "on" : ""}`} onClick={() => setOpen(false)} />

      {/* Drawer */}
      <div className={`nav-drawer ${open ? "on" : ""}`}>
        <button className="nav-x" onClick={() => setOpen(false)}>✕</button>
        <div className="nav-drawer-body">
          <div className="nav-d-theme">
            <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
            <ThemeBtn />
          </div>
          <Link to="/" className="nav-d-link" onClick={() => setOpen(false)}>Home</Link>
          <div className="nav-d-sep" />
          <Link to="/menu" className="nav-d-link" onClick={() => setOpen(false)}>Menu</Link>
          <div className="nav-d-sep" />
          <a href="tel:+96103231506" className="nav-d-phone">📞 03 231 506</a>
          <Link to="/cart" className="nav-d-cart" onClick={() => setOpen(false)}>
            🛒 Cart
            {cartCount > 0 && <span className="nav-d-badge">{cartCount}</span>}
          </Link>
        </div>
      </div>
    </>
  );
}