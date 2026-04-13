import React, { useEffect, useState } from "react";
import axios from "axios";
import "../style/cart.css";

import { useParams, useSearchParams, useNavigate } from "react-router-dom";

function Cart({ cart, addToCart, removeFromCart, isJoinMode = false }) {
  const navigate = useNavigate();
  const { orderId: urlOrderId } = useParams();
  const [searchParams] = useSearchParams();

  const [isOrdered, setIsOrdered] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [orderId, setOrderId] = useState(urlOrderId || null);
  const [orderStatus, setOrderStatus] = useState("");
  const [isRejected, setIsRejected] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [formData, setFormData] = useState({ fullName: "", phone: "" });

  const activeTable =
    searchParams.get("table") ||
    localStorage.getItem("activeTable") ||
    "1";

  const [displayCart, setDisplayCart] = useState([]);

  useEffect(() => {
  if (!isJoinMode && Array.isArray(cart)) {
    setDisplayCart(cart);
  }
}, [cart, isJoinMode]);

  // --- Financial Logic ---
  const subtotal = (displayCart || []).reduce(
    (acc, item) =>
      acc + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

  const vat = subtotal * 0.11;
  const totalPrice = subtotal + vat;

  // --- Join Mode Logic ---
  useEffect(() => {
    if (isJoinMode && urlOrderId) {
      axios
        .get(
          `https://snack-attack-backend.onrender.com/order/${urlOrderId}`
        )
        .then((res) => {
          if (res.data) {
            setDisplayCart(
              Array.isArray(res.data.items) ? res.data.items : []
            );
            setOrderStatus(res.data.order?.status || "");
            setIsWaiting(true);
          }
        })
        .catch((err) => console.error("Join Mode Fetch Error:", err));
    }
  }, [isJoinMode, urlOrderId]);

  // --- Real-time Sync ---
  useEffect(() => {
    let interval;
    const activeId = orderId || urlOrderId;

    if (activeId && (isWaiting || isJoinMode)) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(
            `https://snack-attack-backend.onrender.com/order-status/${activeId}`
          );

          setOrderStatus(res.data.status);

          const statusLower = String(res.data.status).toLowerCase();

          if (
            ["preparing", "paid", "served", "ready"].includes(statusLower)
          ) {
            setIsWaiting(false);
            setIsOrdered(true);
          }

          if (statusLower === "rejected") {
            setIsRejected(true);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error...");
        }
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [isWaiting, orderId, urlOrderId, isJoinMode]);

 // ✅ PLACE ORDER (FIXED)
// ✅ (cart.js) - Zabbte el-mapping kirmal ma yi-ba3at null IDs
const handleProceedToPayment = async () => {
  if (displayCart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  setPlacingOrder(true);

  try {
    const res = await axios.post(
      "https://snack-attack-backend.onrender.com/place-order",
      {
        customer: { name: "Guest", phone: "000000" },
        // ✅ IMPORTANT: Map item.id correctly so Backend finds it
        items: displayCart.map((item) => ({
        id: item.menu_id, 
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      })),
        total_price: totalPrice.toFixed(2),
        table_id: activeTable,
        payment_splits: [],
        status: "Requested",
      }
    );

    if (res.data.success) {
      navigate("/checkout", {
        state: {
          orderId: res.data.orderId,
          cartItems: displayCart,
          tableId: activeTable,
          totalPrice: totalPrice.toFixed(2),
        },
      });
    }
  } catch (err) {
    console.log("BACKEND ERROR:", err.response?.data);
    console.log("STATUS:", err.response?.status);
    console.error("ORDER ERROR:", err.response ? err.response.data : err.message);
    alert("Error sending order. Check backend on Render.");
  } finally {
    setPlacingOrder(false);
  }
};

  if (isRejected)
    return (
      <div className="cart-page-glass">
        <h2>REJECTED ❌</h2>
      </div>
    );

  if (isOrdered)
    return (
      <div className="cart-page-glass">
        <h2>{String(orderStatus).toUpperCase()} ✅</h2>
      </div>
    );

  return (
    <div className="cart-page-glass">
      <div className="unified-glass-container">
        <div className="glass-panel order-panel">
          <h2 className="glass-title">ORDER SUMMARY</h2>

          <div className="glass-items-list">
            {displayCart.map((item, i) => {
              if (!item || typeof item !== "object") return null;

              const safeName = String(item.name || "Item");

              let extrasText = "";
              if (Array.isArray(item.selectedExtras)) {
                extrasText = item.selectedExtras
                  .map((e) => String(e.name || e))
                  .join(", ");
              }

              return (
                <div
                  key={String(item.id || i)}
                  className="item-container glass-item-card slide-down"
                >
                  <div className="glass-item-row">
                    <div className="item-details">
                      <span className="item-name">{safeName}</span>

                      {extrasText && (
                        <span
                          className="item-extras"
                          style={{
                            fontSize: "0.75rem",
                            color: "#FFC20E",
                            display: "block",
                          }}
                        >
                          + {extrasText}
                        </span>
                      )}

                      <span className="item-price-each">
                        ${Number(item.price).toFixed(2)} each
                      </span>
                    </div>

                    <div className="quantity-controls">
                      <button
                        className="q-btn minus"
                        onClick={() => removeFromCart(item)}
                        disabled={isJoinMode}
                      >
                        −
                      </button>

                      <span className="q-count">{item.quantity}</span>

                      <button
                        className="q-btn plus"
                        onClick={() => addToCart(item)}
                        disabled={isJoinMode}
                      >
                        +
                      </button>
                    </div>

                    <span className="item-total-price">
                      $
                      {(
                        Number(item.price) * Number(item.quantity)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {!isJoinMode && (
            <div
              className="glass-form-wrapper"
              style={{ marginTop: "20px" }}
            >
              <button
                className="glass-complete-btn-final"
                onClick={handleProceedToPayment}
                disabled={placingOrder || displayCart.length === 0}
              >
                {placingOrder
                  ? "SENDING REQUEST... 👨‍🍳"
                  : "PROCEED TO PAYMENT ▶"}
              </button>
            </div>
          )}

          <div className="glass-total-section">
            <div className="total-row final-total">
              <div className="g-total-label">TOTAL AMOUNT</div>
              <div className="g-total-value">
                ${totalPrice.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;