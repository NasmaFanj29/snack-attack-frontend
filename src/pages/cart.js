import React, { useState, useEffect } from "react";
import axios from "axios";
import "../style/cart.css";

import { useParams, useSearchParams, useNavigate } from "react-router-dom";

function Cart({ cart, addToCart, removeFromCart, isJoinMode = false }) {
  const navigate = useNavigate();
  const { orderId: urlOrderId } = useParams();
  const [searchParams] = useSearchParams(); // ✅ Initialize searchParams
  
  
  const [isOrdered, setIsOrdered] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [orderId, setOrderId] = useState(urlOrderId || null);
  const [orderStatus, setOrderStatus] = useState("");
  const [isRejected, setIsRejected] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // ✅ Fix: Define activeTable and activeOrderId for the QR logic
  const activeTable = searchParams.get('table') || localStorage.getItem('activeTable') || "1";
  const activeOrderId = orderId || urlOrderId;

  const [displayCart, setDisplayCart] = useState(Array.isArray(cart) ? cart : []);
  const [formData, setFormData] = useState({ fullName: "", phone: "" });

  useEffect(() => {
    if (!isJoinMode) setDisplayCart(Array.isArray(cart) ? cart : []);
  }, [cart, isJoinMode]);

  const productionURL = "https://snackattacknasma.netlify.app";
  const qrValue = `${productionURL}/split/${activeOrderId || 'table/' + activeTable}`; 
  // --- Financial Logic ---
  const subtotal = (displayCart || []).reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const vat = subtotal * 0.11;
  const totalPrice = subtotal + vat;

  const [payers, setPayers] = useState([
    { id: 1, name: "Person 1", amount: totalPrice, method: "cash", cardNumber: "" }
  ]);

  // --- Join Mode Logic ---
  useEffect(() => {
    if (isJoinMode && urlOrderId) {
      axios.get(`https://snack-attack-backend.onrender.com/order-details/${urlOrderId}`)
        .then(res => {
          if (res.data) {
            setDisplayCart(Array.isArray(res.data.items) ? res.data.items : []);
            setPayers(Array.isArray(res.data.payment_splits) ? res.data.payment_splits : []);
            setOrderStatus(res.data.status || "");
            setIsWaiting(true);
          }
        })
        .catch(err => console.error("Join Mode Fetch Error:", err));
    }
  }, [isJoinMode, urlOrderId]);

  // --- Real-time Sync ---
  useEffect(() => {
    let interval;
    const activeId = orderId || urlOrderId;
    if (activeId && (isWaiting || isJoinMode)) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`https://snack-attack-backend.onrender.com/order-status/${activeId}`);
          setOrderStatus(res.data.status);
          if (res.data.payment_splits) setPayers(res.data.payment_splits);

          const statusLower = String(res.data.status).toLowerCase();
          if (["preparing", "paid", "served", "ready"].includes(statusLower)) {
            setIsWaiting(false);
            setIsOrdered(true);
          }
          if (statusLower === "served" || statusLower === "rejected") {
            if (statusLower === "rejected") setIsRejected(true);
            clearInterval(interval);
          }
        } catch (err) { console.error("Polling error..."); }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWaiting, orderId, urlOrderId, isJoinMode]);

  

  const updatePayer = (id, field, value) => {
    const updated = payers.map(p => p.id === id ? { ...p, [field]: field === 'amount' ? (parseFloat(value) || 0) : value } : p);
    setPayers(updated);
  };

  const removePayer = (id) => {
    if (payers.length > 1) setPayers(payers.filter(p => p.id !== id));
  };

  const totalPaidSoFar = payers.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const remainingBalance = totalPrice - totalPaidSoFar;

  const handleCompleteOrder = async () => {
    if (!formData.fullName || !formData.phone) {
      alert("Please fill your Name and Phone Number! 🍔");
      return;
    }
    try {
      const res = await axios.post("https://snack-attack-backend.onrender.com/place-order", {
        customer: { name: formData.fullName, phone: formData.phone },
        total_price: totalPrice.toFixed(2),
        payment_splits: payers,
        items: displayCart,
        table_id: activeTable // ✅ Added table_id to the request
      });
      if (res.data.success) {
        setOrderId(res.data.orderId);
        setIsWaiting(true);
      }
    } catch (err) { alert("Order Failed."); }
  };

  if (isRejected) return <div className="cart-page-glass"><h2>REJECTED ❌</h2></div>;
  if (isOrdered) return <div className="cart-page-glass"><h2>{String(orderStatus).toUpperCase()} ✅</h2></div>;

  return (
    <div className="cart-page-glass">
      <div className="unified-glass-container">
        <div className="glass-panel order-panel">
          <h2 className="glass-title">ORDER SUMMARY</h2>
          <div className="glass-items-list">
            {displayCart.map((item, i) => {
              if (!item || typeof item !== 'object') return null;
              const safeName = String(item.name || "Item");
              let extrasText = "";
              if (Array.isArray(item.selectedExtras)) {
                extrasText = item.selectedExtras.map(e => String(e.name || e)).join(", ");
              }
              return (
                <div key={String(item.id || i)} className="item-container glass-item-card slide-down">
                  <div className="glass-item-row">
                    <div className="item-details">
                      <span className="item-name">{safeName}</span>
                      {extrasText && <span className="item-extras" style={{ fontSize: '0.75rem', color: '#FFC20E', display: 'block' }}>+ {extrasText}</span>}
                      <span className="item-price-each">${(Number(item.price) || 0).toFixed(2)} each</span>
                    </div>
                    <div className="quantity-controls">
                      <button className="q-btn minus" onClick={() => removeFromCart(item)} disabled={isJoinMode}>−</button>
                      <span className="q-count">{item.quantity}</span>
                      <button className="q-btn plus" onClick={() => addToCart(item)} disabled={isJoinMode}>+</button>
                    </div>
                    <span className="item-total-price">${((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {!isJoinMode && (
            <div className="glass-form-wrapper" style={{ marginTop: '20px' }}>
             <button 
      className="glass-complete-btn-final" 
      onClick={() => navigate('/checkout')}
      style={{ background: '#95b508', color: '#fff' }} /* Green Snack Attack */
    >
      PROCEED TO PAYMENT <span>▶</span>
    </button></div>
          )}
          <div className="glass-total-section">
            <div className="total-row final-total">
              <div className="g-total-label">TOTAL AMOUNT</div>
              <div className="g-total-value">${totalPrice.toFixed(2)}</div>
            </div>
          </div>
        </div>

        </div>
        </div>
  )
}

export default Cart;