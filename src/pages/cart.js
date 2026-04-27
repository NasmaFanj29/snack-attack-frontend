import React, { useEffect, useState } from "react";
import axios from "axios";
import "../style/cart.css";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

const BACKEND = "https://snack-attack-backend.onrender.com";

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
  const [displayCart, setDisplayCart] = useState([]);

  const activeTable =
    searchParams.get("table") ||
    localStorage.getItem("activeTable") ||
    "1";

  useEffect(() => {
    if (!isJoinMode && Array.isArray(cart)) {
      setDisplayCart(cart);
    }
  }, [cart, isJoinMode]);

  // ── Financials ──
  const subtotal = (displayCart || []).reduce(
    (acc, item) =>
      acc + (Number(item.price || item.price_at_time) || 0) * (Number(item.quantity) || 0),
    0
  );
  const vat = subtotal * 0.11;
  const totalPrice = subtotal + vat;

  // ── Join Mode Fetch ──
  useEffect(() => {
    if (isJoinMode && urlOrderId) {
      axios.get(`${BACKEND}/orders/${urlOrderId}`)
        .then((res) => {
          if (res.data) {
            setDisplayCart(Array.isArray(res.data.items) ? res.data.items : []);
            setOrderStatus(res.data.order?.status || "");
            setIsWaiting(true);
          }
        })
        .catch((err) => console.error("Join Mode Fetch Error:", err));
    }
  }, [isJoinMode, urlOrderId]);

  // ── Polling Logic ──
  useEffect(() => {
    let interval;
    const activeId = orderId || urlOrderId;
    if (activeId && (isWaiting || isJoinMode)) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${BACKEND}/orders/${activeId}`);
          const currentStatus = res.data.order?.status || "";
          setOrderStatus(currentStatus);
          if (Array.isArray(res.data.items)) setDisplayCart(res.data.items);
          
          const s = String(currentStatus).toLowerCase();
          
          // ✅ FIX: If PAID -> Redirect to Receipt & Clear Cart
          if (s === "paid") {
            setIsWaiting(false);
            setIsOrdered(true);
            clearInterval(interval);
            // Clear local cart storage so it's empty next time
            localStorage.removeItem("cart");
            // Redirect to checkout receipt
            navigate(`/checkout?orderId=${activeId}`);
          }
          
          // Kitchen working states
          if (["preparing", "paid-accepted", "paid-preparing", "paid-ready", "ready", "served"].includes(s)) {
            setIsWaiting(false);
            setIsOrdered(true);
          }

          if (s === "rejected") {
            setIsRejected(true);
            clearInterval(interval);
          }
        } catch {}
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWaiting, orderId, urlOrderId, isJoinMode, navigate]);

  // ── Place Order ──
  const handleProceedToPayment = async () => {
    if (!displayCart || displayCart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    setPlacingOrder(true);
    try {
      const validItems = displayCart.filter(
        (item) => item && typeof item === "object" && item.name
      );

      const mappedItems = validItems.map((item) => {
        const dbId =
          item.databaseId ||
          item.item_id  ||
          item.menu_id  ||
          item.id       ||
          null;

        return {
          id:          dbId,
          databaseId:  dbId,
          item_id:     dbId,
          name:        item.name        || "Item",
          price:       Number(item.price || item.price_at_time || 0),
          quantity:    Number(item.quantity || 1),
          specialNote: item.specialNote || item.special_note || null,
          removedExtras: item.removedExtras || item.removed_extras || null,
          isCustom: item.isCustom || false,
          selectedExtras: item.selectedExtras || item.selected_extras || [],
          customOrderData: item.customOrderData || null
        };
      });

      console.log("Placing order with items:", mappedItems);

      const res = await axios.post(`${BACKEND}/place-order`, {
        customer: { name: "Guest", phone: "000000" },
        items: mappedItems,
        total_price: totalPrice.toFixed(2),
        table_id: activeTable || "1",
        payment_splits: [],
        status: "Requested",
      });

      if (res.data && res.data.success) {
        // ✅ Clear cart immediately after placing order
        localStorage.removeItem("cart");
        
        navigate("/checkout", {
          state: {
            orderId: res.data.orderId,
            cartItems: validItems,
            tableId: activeTable || "1",
            totalPrice: totalPrice.toFixed(2),
          },
        });
      } else {
        alert("Backend issue, order not placed.");
      }
    } catch (err) {
      console.error("BACKEND ERROR:", err);
      alert("Error sending order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Join Mode Update ──
  const handleJoinModeUpdate = async (item, action) => {
    const activeId = orderId || urlOrderId;
    if (!activeId) return;
    try {
      await axios.post(`${BACKEND}/orders/${activeId}/update-item`, {
        action,
        item,
      });
    } catch (err) {
      console.error("Error updating shared cart", err);
    }
  };

  // ── Status Screens ──
  if (isRejected)
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="cart-status-card">
            <h2>❌ ORDER REJECTED</h2>
            <button className="cart-back-btn" onClick={() => window.location.href = "/"}>
              GO BACK
            </button>
          </div>
        </div>
      </div>
    );

  if (isOrdered) {
    // If paid, we already navigated away in useEffect. 
    // This is for "Preparing" etc. where we wait.
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="cart-status-card">
            <h2>{String(orderStatus).toUpperCase()} ✅</h2>
            <p>Order #{orderId || urlOrderId}</p>
            <button className="cart-back-btn" onClick={() => navigate(`/checkout?orderId=${orderId || urlOrderId}`)}>
              VIEW ORDER
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Render ──
  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-card">
          <h2 className="cart-title">🛒 YOUR ORDER</h2>
          <p className="cart-table-tag">Table #{activeTable}</p>

          {displayCart.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="cart-items">
              {displayCart.map((item, i) => {
                if (!item || typeof item !== "object") return null;
                const basePrice = Number(item.price || item.price_at_time || 0);
                const lineTotal = basePrice * Number(item.quantity || 1);
                let extrasText = "";
                if (Array.isArray(item.selectedExtras)) {
                  extrasText = item.selectedExtras
                    .map((e) => String(e.name || e))
                    .join(", ");
                }

                return (
                  <div key={String(item.id || i)} className="cart-item">
                    <div className="cart-item-left">
                      <span className="cart-item-name">{item.name || "Item"}</span>
                      {extrasText && (
                        <span className="cart-item-extras">+ {extrasText}</span>
                      )}
                      <span className="cart-item-each">${basePrice.toFixed(2)} each</span>
                    </div>

                    <div className="cart-item-right">
                      <div className="cart-qty">
                        <button
                          className="cart-qty-btn"
                          onClick={() =>
                            isJoinMode
                              ? handleJoinModeUpdate(item, "remove")
                              : removeFromCart(item)
                          }
                        >−</button>
                        <span className="cart-qty-num">{item.quantity}</span>
                        <button
                          className="cart-qty-btn"
                          onClick={() =>
                            isJoinMode
                              ? handleJoinModeUpdate(item, "add")
                              : addToCart(item)
                          }
                        >+</button>
                      </div>
                      <span className="cart-item-total">${lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="cart-summary-row vat-row">
              <span>VAT (11%)</span>
              <span>${vat.toFixed(2)}</span>
            </div>
            <div className="cart-summary-divider"></div>
            <div className="cart-summary-row cart-final-row">
              <span>TOTAL</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="cart-action">
            {!isJoinMode ? (
              <button
                className="cart-pay-btn"
                onClick={handleProceedToPayment}
                disabled={placingOrder || displayCart.length === 0}
              >
                {placingOrder ? "SENDING... 👨‍🍳" : "PROCEED TO PAYMENT ▶"}
              </button>
            ) : (
              <button
                className="cart-pay-btn"
                onClick={() => navigate(`/checkout?orderId=${urlOrderId}&mode=add`)}
              >
                PAY MY SHARE 💳
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;