// src/pages/QRGenerator.jsx
// Route: /qr-generator (admin only)
// Needs: npm install qrcode.react
// Uses QRCodeCanvas already installed from Whish payment

import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import '../style/qr-generator.css';

const RESTAURANT_URL = "https://snack-attack.onrender.com"; // ← change to your URL
const TABLE_COUNT = 10;
const LOGO_URL = "/assets/logoburger.png"; // optional logo in QR center

function QRGenerator() {
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const downloadQR = (tableNum) => {
    const canvas = document.getElementById(`qr-canvas-${tableNum}`);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `table-${tableNum}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const tables = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1);

  return (
    <div className="qr-page">
      <div className="qr-page-header">
        <div className="qr-header-left">
          <h1>QR CODES</h1>
          <p>Print & place on tables</p>
        </div>
        <div className="qr-header-actions">
          <span className="qr-url-badge">{RESTAURANT_URL}</span>
          <button className="qr-print-btn" onClick={handlePrint}>🖨️ Print All</button>
        </div>
      </div>

      <div className="qr-grid" ref={printRef}>
        {tables.map(num => {
          const tableUrl = `${RESTAURANT_URL}/?table=${num}`;
          return (
            <div key={num} className="qr-card">
              {/* Print header */}
              <div className="qr-card-restaurant">
                <span>🍔 SNACK ATTACK</span>
              </div>

              {/* QR Code */}
              <div className="qr-code-wrapper">
                <QRCodeCanvas
                  id={`qr-canvas-${num}`}
                  value={tableUrl}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: LOGO_URL,
                    height: 32,
                    width: 32,
                    excavate: true,
                  }}
                />
              </div>

              {/* Table number */}
              <div className="qr-table-number">{num}</div>
              <div className="qr-table-label">TABLE</div>

              {/* Instruction */}
              <p className="qr-instruction">Scan to order & pay</p>

              {/* Download button (hidden in print) */}
              <button className="qr-download-btn no-print" onClick={() => downloadQR(num)}>
                ⬇ Download
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default QRGenerator;
