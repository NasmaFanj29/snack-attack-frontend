// src/components/Footer.jsx

import React from "react";
import { useLocation } from "react-router-dom";
import "../style/footer.css";

const STAFF_PATHS = ["/admin", "/kitchen", "/waiter", "/login"];

function Footer() {
  const location = useLocation();

  // Hide footer on home page + staff pages
  if (location.pathname === "/") return null;
  if (STAFF_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="sa-footer">
      <div className="footer-inner">

        {/* Brand */}
        <span className="footer-brand">Snack Attack</span>

        {/* Info */}
        <div className="footer-info">

          <div className="footer-pill">
            <span className="footer-pill-icon">📍</span>
            <span>Bliss Street, Hamra</span>
          </div>

          <div className="footer-dot" />

          <div className="footer-pill">
            <span className="footer-pill-icon">🕐</span>
            <span>11AM – 11PM</span>
          </div>

          <div className="footer-dot" />

          <div className="footer-pill">
            <span className="footer-pill-icon">📞</span>
            <a href="tel:+96103231506">03 231 506</a>
          </div>

        </div>

        {/* Copyright */}
        <span className="footer-copy">
          © {year} Snack Attack. All rights reserved.
        </span>

      </div>
    </footer>
  );
}

export default Footer;