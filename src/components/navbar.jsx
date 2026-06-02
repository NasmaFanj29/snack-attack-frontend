import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import socket from "../socket";
import "../style/navbar.css";

/* ── SVG Icons ── */
const IconCart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="3" y1="7" x2="21" y2="7"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="9" y1="17" x2="21" y2="17"/>
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16z"/>
  </svg>
);

export default function Navbar({ cartCount = 0, cartItems = [], removeFromCart, addToCart }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tableCount, setTableCount] = useState(1);
  const desktopCartRef = useRef(null);
  const mobileCartRef = useRef(null);
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  const tableId = localStorage.getItem('activeTable') || '1';

  /* ── Live table counter ── */
  /* ── Live table counter ── */
  useEffect(() => {
    // Guests aren't logged in — make sure the socket is connected
    if (!socket.isConnected()) socket.connectGuest();

    const join = () => socket.emit('joinTable', tableId);
    join();
    socket.on('connect', join);   // re-join if socket reconnects

    const handler = ({ tableId: tid, count }) => {
      if (String(tid) === String(tableId)) setTableCount(count);
    };
    socket.on('tableCount', handler);

    return () => {
      socket.off('tableCount', handler);
      socket.off('connect', join);
    };
  }, [tableId]);

  /* ── Scroll shadow ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  useEffect(() => {
    const handler = (e) => {
      const inDesktop = desktopCartRef.current?.contains(e.target);
      const inMobile = mobileCartRef.current?.contains(e.target);
      if (!inDesktop && !inMobile) setCartOpen(false);
    };
    if (cartOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cartOpen]);

  useEffect(() => {
    setCartOpen(false);
    setDrawerOpen(false);
  }, [location.pathname]);

  const totalPrice = cartItems.reduce((acc, item) => {
    const base = Number(item.price) || 0;
    const extras = Array.isArray(item.selectedExtras)
      ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0) : 0;
    return acc + (base + extras) * (Number(item.quantity) || 1);
  }, 0);

  const CartPopup = () => (
    <div className="nav-cart-popup">
      <div className="ncp-header">
        <span className="ncp-title">Your Order</span>
        <span className="ncp-total">${totalPrice.toFixed(2)}</span>
      </div>
      <div className="ncp-body">
        {cartItems.length === 0 ? (
          <div className="ncp-empty">
            <span className="ncp-empty-icon">🛒</span>
            <p>Your cart is empty</p>
          </div>
        ) : (
          cartItems.map((item, idx) => {
            const base = Number(item.price) || 0;
            const extras = Array.isArray(item.selectedExtras)
              ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0) : 0;
            const qty = Number(item.quantity) || 1;
            const total = (base + extras) * qty;
            return (
              <div key={idx} className="ncp-item">
                <div className="ncp-item-info">
                  <span className="ncp-item-name">{item.name}</span>
                  {item.selectedExtras?.length > 0 && (
                    <span className="ncp-item-extras">
                      + {item.selectedExtras.map(e => e.name).join(", ")}
                    </span>
                  )}
                  {item.removedExtras?.length > 0 && (
                    <span className="ncp-item-removed">
                      ✕ No {item.removedExtras.map(e => e.name).join(", ")}
                    </span>
                  )}
                  {item.specialNote && (
                    <span className="ncp-item-note">📝 {item.specialNote}</span>
                  )}
                </div>
                <div className="ncp-item-right">
                  <span className="ncp-item-qty">×{qty}</span>
                  <span className="ncp-item-price">${total.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="ncp-footer">
        <div className="ncp-subtotal">
          <span>Order Total</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>
        <button
          className="ncp-checkout-btn"
          onClick={() => { setCartOpen(false); navigate("/cart"); }}
        >
          Proceed to Checkout →
        </button>
      </div>
    </div>
  );

  const ThemeToggle = () => (
    <button
      className="nav-theme-btn"
      onClick={toggle}
      title={isDark ? "Switch to Light" : "Switch to Dark"}
      aria-label="Toggle theme"
    >
     
    </button>
  );

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className={[
        "navbar",
        isHome ? "navbar--home" : "navbar--page",
        scrolled ? "navbar--scrolled" : "",
      ].filter(Boolean).join(" ")}>

        <div className="navbar-inner">

          {/* ✅ Live Table Counter (replaces logo) */}
          <Link to="/" className="nav-logo" aria-label="Snack Attack Home" style={{ textDecoration: 'none' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(255,194,14,0.2), rgba(255,194,14,0.05))',
              border: '1px solid rgba(255,194,14,0.4)',
              borderRadius: '12px', 
              padding: '6px 14px',
              minWidth: '90px',
            }}>
              <span style={{ 
                fontSize: '10px', 
                color: 'rgba(0,0,0,0.5)', 
                fontWeight: 700, 
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                Table {tableId}
              </span>
              <span style={{ 
                fontSize: '14px', 
                color: '#5a7a00', 
                fontWeight: 900,
                marginTop: '2px',
              }}>
                👥 {tableCount} {tableCount === 1 ? 'guest' : 'guests'}
              </span>
            </div>
          </Link>

          <div className="nav-links">
            <Link to="/" className={`nav-link ${isActive("/") ? "nav-link--active" : ""}`}>Home</Link>
            <Link to="/menu" className={`nav-link ${isActive("/menu") ? "nav-link--active" : ""}`}>Menu</Link>
          </div>

          <div className="nav-actions">
            <a href="tel:+96103231506" className="nav-phone-link">
              <IconPhone /> 03 231 506
            </a>

            <div className="nav-cart-wrap" ref={desktopCartRef}>
              <button
                className="nav-cart-btn"
                onClick={() => cartCount > 0 ? setCartOpen(o => !o) : navigate("/cart")}
                aria-label={`Cart (${cartCount} items)`}
              >
                <IconCart />
                <span className="nav-cart-label">Cart</span>
                {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
              </button>
              {cartOpen && (
                <div className="nav-cart-dropdown">
                  <CartPopup />
                </div>
              )}
            </div>

            
          </div>

          <div className="nav-mobile-actions">
            

            <div className="nav-cart-wrap" ref={mobileCartRef}>
              <button
                className="nav-cart-btn nav-cart-btn--mobile"
                onClick={() => cartCount > 0 ? setCartOpen(o => !o) : navigate("/cart")}
                aria-label="Cart"
              >
                <IconCart />
                {cartCount > 0 && (
                  <span className="nav-badge nav-badge--mobile">{cartCount}</span>
                )}
              </button>
              {cartOpen && (
                <div className="nav-cart-dropdown nav-cart-dropdown--mobile">
                  <CartPopup />
                </div>
              )}
            </div>

            <button
              className="nav-hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <IconMenu />
            </button>
          </div>

        </div>
      </nav>

      <div
        className={`nav-overlay ${drawerOpen ? "nav-overlay--open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <div className={`nav-drawer ${drawerOpen ? "nav-drawer--open" : ""}`} role="dialog" aria-modal="true">
        <div className="nav-drawer-header">
          <span className="nav-drawer-brand">🍔 Snack Attack</span>
          <button
            className="nav-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <IconClose />
          </button>
        </div>

        <div className="nav-drawer-body">
          <div className="nav-drawer-theme">
            
            
          </div>

          <div className="nav-drawer-divider" />

          <Link
            to="/"
            className={`nav-drawer-link ${isActive("/") ? "nav-drawer-link--active" : ""}`}
            onClick={() => setDrawerOpen(false)}
          >
            <span>🏠</span> Home
          </Link>

          <Link
            to="/menu"
            className={`nav-drawer-link ${isActive("/menu") ? "nav-drawer-link--active" : ""}`}
            onClick={() => setDrawerOpen(false)}
          >
            <span>📖</span> Menu
          </Link>

          <div className="nav-drawer-divider" />

          <a href="tel:+96103231506" className="nav-drawer-link">
            <span>📞</span> 03 231 506
          </a>

          <Link
            to="/cart"
            className="nav-drawer-cart"
            onClick={() => setDrawerOpen(false)}
          >
            <span>🛒 View Cart</span>
            {cartCount > 0 && <span className="nav-drawer-badge">{cartCount}</span>}
          </Link>

        </div>
      </div>
    </>
  );
}