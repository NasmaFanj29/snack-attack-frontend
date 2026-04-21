import React, { useEffect, useState } from "react";
import "../style/home.css";
import { Link } from "react-router-dom";
import burgerImg from "../assets/try1122.jpg";
import logoburger from "../assets/logoburger.png";

// ── WiFi config — change these ─────────────────────────────────
const WIFI_NAME = "SnackAttack_Guest";
const WIFI_PASS = "snack2024!";

function Home() {
  const [loaded, setLoaded] = useState(false);
  const [wifiOpen, setWifiOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  const copyPassword = () => {
    navigator.clipboard.writeText(WIFI_PASS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`home-wrapper ${loaded ? "loaded" : ""}`}>

      {/* Background */}
      <div className="full-image-bg" style={{ backgroundImage: `url(${burgerImg})` }} />
      <div className="grain-overlay" />

      {/* WiFi Button — top right, always visible */}
      <button className="wifi-fab" onClick={() => setWifiOpen(true)} title="WiFi Password">
        📶
      </button>

      {/* WiFi Modal */}
      {wifiOpen && (
        <div className="wifi-overlay" onClick={() => setWifiOpen(false)}>
          <div className="wifi-modal" onClick={e => e.stopPropagation()}>
            <div className="wifi-modal-icon">📶</div>
            <h3 className="wifi-modal-title">Free WiFi</h3>
            <p className="wifi-modal-sub">Connect and enjoy your meal!</p>

            <div className="wifi-field">
              <span className="wifi-label">Network</span>
              <span className="wifi-value">{WIFI_NAME}</span>
            </div>

            <div className="wifi-field wifi-field--pass">
              <span className="wifi-label">Password</span>
              <span className="wifi-value wifi-pass">{WIFI_PASS}</span>
              <button className="wifi-copy-btn" onClick={copyPassword}>
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>

            <button className="wifi-close-btn" onClick={() => setWifiOpen(false)}>
              Got it! 👍
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="home-content">
        <div className="hero-eyebrow">
          <span className="eyebrow-line" />
          <span className="eyebrow-text">Boldly crafted.&nbsp;&nbsp;Dangerously good.</span>
          <span className="eyebrow-line" />
        </div>

        <div className="logo-title-container">
          <span className="sticker-letter yellow-text">SN</span>
          <img src={logoburger} alt="Snack Attack logo" className="sticker-logo-img" />
          <span className="sticker-letter yellow-text">CK</span>
          <span className="sticker-letter green-text">ATTACK</span>
        </div>

        <p className="hero-tagline">Hamra · Bliss Street</p>

        <div className="hero-divider">
          <span className="hero-divider-dot" />
          <span className="hero-divider-line" />
          <span className="hero-divider-icon">🍔</span>
          <span className="hero-divider-line" />
          <span className="hero-divider-dot" />
        </div>

        <div className="hero-cta">
          <Link to="/menu" className="btn-primary">View Menu</Link>
         
        </div>

        <div className="hero-badge">
          <span className="badge-pulse" />
          <span className="badge-text">Open Now · 11am – 11pm</span>
        </div>
      </div>
    </div>
  );
}

export default Home;
