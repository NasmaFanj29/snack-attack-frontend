
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import '../style/navbar.css';

export default function Navbar({ cartCount = 0 }) {
  const [open, setOpen] = useState(false);
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const ThemeBtn = () => (
    <button className="theme-toggle-btn" onClick={toggle} title={isDark ? 'Light Mode' : 'Dark Mode'}>
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">{isDark ? '🌙' : '☀️'}</span>
      </span>
    </button>
  );

  return (
    <>
      <nav className={`navbar ${isHome ? 'nav-home' : ''}`}>
        <div className="navbar-inner">
          

          {/* Desktop Links */}
          <div className="nav-links">
             <Link to="/" className="nav-link">Home</Link>
            <Link to="/menu" className={`nav-link ${location.pathname === '/menu' ? 'active' : ''}`}>Menu</Link>
            <Link to="/cart" className={`nav-link ${location.pathname === '/cart' ? 'active' : ''}`}>Cart</Link>
          </div>

          {/* Desktop Actions */}
          <div className="nav-actions">
            <a href="tel:+96103231506" className="nav-phone">📞 03 231 506</a>
            <Link to="/cart" className="nav-cart">
              🛒
              {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
            </Link>
            {/* ✅ Theme toggle */}
            <div className="nav-theme-toggle"><ThemeBtn /></div>
          </div>

          {/* Mobile buttons */}
          <div className="nav-mobile-btns">
            
            <ThemeBtn />
            <button className="nav-burger" onClick={() => setOpen(true)}>☰</button>
          </div>
        </div>
      </nav>

      {/* Dim */}
      <div className={`nav-dim ${open ? 'on' : ''}`} onClick={() => setOpen(false)} />

      {/* Drawer */}
      <div className={`nav-drawer ${open ? 'on' : ''}`}>
        <button className="nav-x" onClick={() => setOpen(false)}>✕</button>
        <div className="nav-drawer-body">
           <div className="nav-d-theme">
            <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            <ThemeBtn />
          </div>
          {/* ✅ زيدي لينك الـ Home هون بقلب الموبايل منيو */}
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
