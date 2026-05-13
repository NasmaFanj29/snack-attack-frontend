import React from "react";
import { useLocation } from "react-router-dom";
import "../style/footer.css";

const STAFF_PATHS = ['/admin', '/kitchen', '/waiter', '/login'];

function Footer() {
  const location = useLocation();

  if (location.pathname === "/") return null;
  if (STAFF_PATHS.some(p => location.pathname.startsWith(p))) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">

        <span className="footer-brand">Snack Attack</span>

        <div className="footer-info">
          <div className="footer-pill">
            <span className="footer-pill-icon">📍</span>
            <span>Hamra, Bliss St</span>
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

        <span className="footer-copy">© {year} Snack Attack</span>

      </div>
    </footer>
  );
}

export default Footer;