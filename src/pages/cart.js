import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../style/cart.css";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

const BACKEND = "https://snack-attack-backend.onrender.com";

const REMOVE_IDS = {
  "Burgers":    [1,2,3,4,5,8,9,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,31,32,35,36,37],
  "Salad":      [1,7,10,11,12,25,26,27,28,29,30,31,32,33,34,35,37],
  "Sandwiches": [1,2,3,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,31,32,35,36,37],
};

// ── Item Edit Modal ───────────────────────────────────────────────
function EditItemModal({ item, onClose, onSave }) {
  const [selectedExtras,  setSelectedExtras]  = useState(Array.isArray(item.selectedExtras) ? item.selectedExtras : []);
  const [pendingNote,     setPendingNote]      = useState(item.specialNote || item.special_note || "");
  const [pendingRemoved,  setPendingRemoved]   = useState(Array.isArray(item.removedExtras) ? item.removedExtras : []);
  const [itemExtras,      setItemExtras]       = useState([]);
  const [removableExtras, setRemovableExtras]  = useState([]);
  const [subView,         setSubView]          = useState("main"); // main | note | remove

  useEffect(() => {
    const id = item.databaseId || item.item_id || item.id;
    if (!id) return;
    axios.get(`${BACKEND}/item-extras/${id}`)
      .then(res => {
        const all = res.data || [];
        setItemExtras(all);
        const ids = REMOVE_IDS[item.category] || [];
        setRemovableExtras(all.filter(e => ids.includes(e.id)));
      })
      .catch(() => { setItemExtras([]); setRemovableExtras([]); });
  }, []);

  const toggleExtra  = (extra) => setSelectedExtras(prev =>
    prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]);
  const toggleRemove = (extra) => setPendingRemoved(prev =>
    prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]);

  const modalPrice = Number(item.price || 0) +
    selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0);

  const handleSave = () => onSave({ ...item, selectedExtras, removedExtras: pendingRemoved, specialNote: pendingNote || null });

  // ── Note sub-view ──
  if (subView === "note") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={() => setSubView("main")}>×</button>
        <div className="modal-header">
          <h2>Special Instructions</h2>
          <p style={{ color:"#666", fontSize:"14px" }}>For {item.name}</p>
        </div>
        <div className="modal-scroll-area">
          <textarea className="notes-textarea" placeholder="e.g., Cut in half, No onions..."
            value={pendingNote} onChange={e => setPendingNote(e.target.value)} rows="5" />
        </div>
        <div className="modal-footer" style={{ display:"flex", gap:"8px" }}>
          <button className="add-btn-final"
            style={{ background:"var(--surface-3)", color:"var(--text-muted)", flex:"0 0 auto", width:"auto", padding:"16px 20px" }}
            onClick={() => setSubView("main")}>← Back</button>
          <button className="add-btn-final" onClick={() => setSubView("main")} disabled={!pendingNote.trim()}>
            Save Note ✓</button>
        </div>
      </div>
    </div>
  );

  // ── Remove sub-view ──
  if (subView === "remove") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={() => setSubView("main")}>×</button>
        <div className="modal-header">
          <h2>Remove Ingredients</h2>
          <p style={{ color:"var(--text-muted)", fontSize:"13px", textAlign:"center" }}>from {item.name}</p>
        </div>
        <div className="modal-scroll-area">
          {removableExtras.length > 0 ? (
            <div className="extras-section">
              <div className="extra-group">
                {removableExtras.map(extra => (
                  <label key={extra.id} className="extra-label">
                    <div className="extra-info">
                      <input type="checkbox"
                        checked={pendingRemoved.some(e => e.id === extra.id)}
                        onChange={() => toggleRemove(extra)} />
                      <span>{extra.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ textAlign:"center", color:"#999", padding:"20px" }}>No removable ingredients</p>
          )}
        </div>
        <div className="modal-footer" style={{ display:"flex", gap:"8px" }}>
          <button className="add-btn-final"
            style={{ background:"var(--surface-3)", color:"var(--text-muted)", flex:"0 0 auto", width:"auto", padding:"16px 20px" }}
            onClick={() => setSubView("main")}>← Back</button>
          <button className="add-btn-final" onClick={() => setSubView("main")}
            disabled={pendingRemoved.length === 0}
            style={{ backgroundColor: pendingRemoved.length > 0 ? "#d90d0d" : "var(--surface-3)",
              color: pendingRemoved.length > 0 ? "#fff" : "var(--text-muted)" }}>
            Confirm Remove ✕</button>
        </div>
      </div>
    </div>
  );

  // ── Main view ──
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>×</button>
        <div className="modal-header">
          {item.image && <img src={`${BACKEND}/images/${item.image}`} alt={item.name} />}
          <h2>{item.name}</h2>
          {item.description && <p>{item.description}</p>}
        </div>

        {/* Action buttons */}
        <div className="modal-actions">
          <button className="menu-action-btn notes-btn" onClick={() => setSubView("note")}>
            📝 {pendingNote ? "Edit Note" : "Add Note"}
          </button>
          {!["Beverages","Appetizers","Dips"].includes(item.category) && (
            <button className="menu-action-btn remove-btn" onClick={() => setSubView("remove")}>
              ✕ {pendingRemoved.length > 0 ? "Edit Remove" : "Remove Ingredients"}
            </button>
          )}
        </div>

        {/* Pending preview */}
        {(pendingRemoved.length > 0 || pendingNote) && (
          <div style={{ padding:"0 20px 12px" }}>
            {pendingRemoved.length > 0 && (
              <div style={{ padding:"8px 12px", borderRadius:"8px", marginBottom:"6px",
                background:"rgba(255,80,80,0.08)", border:"1px solid rgba(255,80,80,0.2)",
                fontSize:"12px", color:"rgba(255,90,90,0.9)" }}>
                ✕ No {pendingRemoved.map(e => e.name).join(", ")}
              </div>
            )}
            {pendingNote && (
              <div style={{ padding:"8px 12px", borderRadius:"8px",
                background:"rgba(255,194,14,0.08)", border:"1px solid rgba(255,194,14,0.2)",
                fontSize:"12px", color:"rgba(255,194,14,0.95)" }}>
                📝 {pendingNote}
              </div>
            )}
          </div>
        )}

        {/* Add-on extras */}
        <div className="modal-scroll-area">
          {itemExtras.length > 0 && (
            <div className="extras-section">
              <h3>Customize Your Order</h3>
              <div className="extra-group">
                <div className="extra-group-title">Add Extras</div>
                {itemExtras.map(extra => (
                  <label key={extra.id} className="extra-label">
                    <div className="extra-info">
                      <input type="checkbox"
                        checked={selectedExtras.some(e => e.id === extra.id)}
                        onChange={() => toggleExtra(extra)} />
                      <span>{extra.name}</span>
                    </div>
                    <span className="extra-price">+${Number(extra.price).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="add-btn-final" onClick={handleSave}>
            Save Changes — ${modalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cart ──────────────────────────────────────────────────────────
function Cart({ cart, addToCart, removeFromCart, isJoinMode = false }) {
  const navigate = useNavigate();
  const { orderId: urlOrderId } = useParams();
  const [searchParams] = useSearchParams();

  const [isOrdered,    setIsOrdered]    = useState(false);
  const [isWaiting,    setIsWaiting]    = useState(false);
  const [orderId,      setOrderId]      = useState(urlOrderId || null);
  const [orderStatus,  setOrderStatus]  = useState("");
  const [isRejected,   setIsRejected]   = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [displayCart,  setDisplayCart]  = useState([]);

  // ── Block poll from overwriting local edits for 5s after save ──
  const ignorePollUntil = useRef(0);

  // ── Edit modal state ──
  const [editingItem,  setEditingItem]  = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  // ── Menu map for images/category/description ──
  const [menuMap, setMenuMap] = useState({}); // { itemId: { image, category, description } }

  useEffect(() => {
    axios.get(`${BACKEND}/menu`)
      .then(res => {
        const map = {};
        (res.data || []).forEach(m => { map[m.id] = m; });
        setMenuMap(map);
      })
      .catch(() => {});
  }, []);

  const enrichItem = (item) => {
    const id = item.databaseId || item.item_id || item.id;
    const meta = menuMap[id] || {};
    return {
      ...item,
      image:       item.image       || meta.image       || null,
      category:    item.category    || meta.category    || null,
      description: item.description || meta.description || null,
    };
  };

  const activeTable =
    searchParams.get("table") ||
    localStorage.getItem("activeTable") ||
    "1";

  // Detect join mode: either prop OR has a urlOrderId (came from checkout ✏️)
  const isEditMode = isJoinMode || !!urlOrderId;

  useEffect(() => {
    if (!isEditMode && Array.isArray(cart)) {
      setDisplayCart(cart);
    }
  }, [cart, isEditMode]);

  // ── Financials ──
  const subtotal = (displayCart || []).reduce((acc, item) => {
    const base   = Number(item.price || item.price_at_time) || 0;
    const extras = Array.isArray(item.selectedExtras)
      ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0) : 0;
    return acc + (base + extras) * (Number(item.quantity) || 0);
  }, 0);
  const vat        = subtotal * 0.11;
  const totalPrice = subtotal + vat;

  // ── Fetch order ONCE on mount only — never re-fetches after edits ──
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!urlOrderId || initialFetchDone.current) return;
    initialFetchDone.current = true;
    axios.get(`${BACKEND}/orders/${urlOrderId}`)
      .then(res => {
        if (res.data) {
          setDisplayCart(Array.isArray(res.data.items) ? res.data.items : []);
          setOrderStatus(res.data.order?.status || "");
          setIsWaiting(true);
        }
      })
      .catch(err => console.error("Fetch Error:", err));
  }, []);

  // ── Polling — only runs when waiting for status (not in edit mode) ──
  useEffect(() => {
    let interval;
    const activeId = orderId || urlOrderId;
    // If we came from checkout ✏️ (urlOrderId set), we're editing — no polling needed
    // Only poll when isJoinMode (shared cart waiting for acceptance)
    if (activeId && isWaiting && isJoinMode) {
      interval = setInterval(async () => {
        try {
          const res           = await axios.get(`${BACKEND}/orders/${activeId}`);
          const currentStatus = res.data.order?.status || "";
          setOrderStatus(currentStatus);
          if (Array.isArray(res.data.items) && Date.now() > ignorePollUntil.current) {
            setDisplayCart(res.data.items);
          }
          const s = String(currentStatus).toLowerCase();
          if (s === "paid") {
            setIsWaiting(false); setIsOrdered(true);
            clearInterval(interval);
            localStorage.removeItem("cart");
            navigate(`/checkout?orderId=${activeId}`);
          }
          if (["preparing","paid-accepted","paid-preparing","paid-ready","ready","served"].includes(s)) {
            setIsWaiting(false); setIsOrdered(true);
          }
          if (s === "rejected") { setIsRejected(true); clearInterval(interval); }
        } catch {}
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isWaiting, orderId, urlOrderId, isJoinMode, navigate]);

  // ── Place Order (normal mode only) ──
  const handleProceedToPayment = async () => {
    if (!displayCart || displayCart.length === 0) { alert("Your cart is empty!"); return; }
    setPlacingOrder(true);
    try {
      const validItems  = displayCart.filter(item => item && typeof item === "object" && item.name);
      const mappedItems = validItems.map(item => {
        const dbId = item.databaseId || item.item_id || item.menu_id || item.id || null;
        return {
          id: dbId, databaseId: dbId, item_id: dbId,
          name:            item.name || "Item",
          price:           Number(item.price || item.price_at_time || 0),
          quantity:        Number(item.quantity || 1),
          specialNote:     item.specialNote || item.special_note || null,
          removedExtras:   item.removedExtras || item.removed_extras || null,
          isCustom:        item.isCustom || false,
          selectedExtras:  item.selectedExtras || item.selected_extras || [],
          customOrderData: item.customOrderData || null,
        };
      });
      const res = await axios.post(`${BACKEND}/place-order`, {
        customer: { name: "Guest", phone: "000000" },
        items: mappedItems, total_price: totalPrice.toFixed(2),
        table_id: activeTable || "1", payment_splits: [], status: "Requested",
      });
      if (res.data && res.data.success) {
        localStorage.removeItem("cart");
        navigate("/checkout", {
          state: { orderId: res.data.orderId, cartItems: validItems, tableId: activeTable || "1", totalPrice: totalPrice.toFixed(2) },
        });
      } else { alert("Backend issue, order not placed."); }
    } catch (err) {
      console.error("BACKEND ERROR:", err);
      alert("Error sending order. Please try again.");
    } finally { setPlacingOrder(false); }
  };

  // ── Join/Edit Mode: qty update ──
  const handleJoinModeUpdate = async (item, action) => {
    const activeId = orderId || urlOrderId;
    if (!activeId) return;
    try {
      await axios.post(`${BACKEND}/orders/${activeId}/update-item`, { action, item });
    } catch (err) { console.error("Error updating shared cart", err); }
  };

  // ── Edit mode: save edited item ──
  const handleSaveEditedItem = async (updatedItem) => {
    const activeId = orderId || urlOrderId;
    // Merge the updated item into display cart
    const newItems = displayCart.map((it, idx) => idx === editingIndex ? { ...it, ...updatedItem } : it);
    // Update UI immediately and close modal
    setDisplayCart(newItems);
    setEditingItem(null);
    setEditingIndex(null);
    // Persist to backend (fire and forget — no re-fetch, no polling to undo it)
    if (activeId) {
      axios.put(`${BACKEND}/admin/orders/${activeId}/status`, { items: newItems })
        .catch(err => console.error("Error saving item edits:", err));
    }
  };

  // ── Helpers ──
  const getLinePrice = (item) => {
    const base   = Number(item.price || item.price_at_time) || 0;
    const extras = Array.isArray(item.selectedExtras)
      ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0) : 0;
    return base + extras;
  };

  // ── Status Screens ──
  if (isRejected) return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-status-card">
          <h2>❌ ORDER REJECTED</h2>
          <button className="cart-back-btn" onClick={() => window.location.href = "/"}>GO BACK</button>
        </div>
      </div>
    </div>
  );

  if (isOrdered) return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-status-card">
          <h2>{String(orderStatus).toUpperCase()} ✅</h2>
          <p>Order #{orderId || urlOrderId}</p>
          <button className="cart-back-btn"
            onClick={() => navigate(`/checkout?orderId=${orderId || urlOrderId}`)}>
            VIEW ORDER
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main Render ──
  return (
    <div className="cart-page">
      {/* Edit modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => { setEditingItem(null); setEditingIndex(null); }}
          onSave={handleSaveEditedItem}
        />
      )}

      <div className="cart-container">
        <div className="cart-card">
          <h2 className="cart-title">🛒 YOUR ORDER</h2>
          <p className="cart-table-tag">Table #{activeTable}</p>

          {displayCart.length === 0 ? (
            <div className="cart-empty"><p>Your cart is empty</p></div>
          ) : (
            <div className="cart-items">
              {displayCart.map((item, i) => {
                if (!item || typeof item !== "object") return null;
                const lineUnitPrice = getLinePrice(item);
                const lineTotal     = lineUnitPrice * Number(item.quantity || 1);

                return (
                  <div key={String(item.id || i)} className="cart-item">
                    {/* ── Left: info ── */}
                    <div className="cart-item-left">
                      <span className="cart-item-name">{item.name || "Item"}</span>

                      {Array.isArray(item.selectedExtras) && item.selectedExtras.length > 0 && (
                        <span className="cart-item-extras">
                          + {item.selectedExtras.map(e => e.name || e).join(", ")}
                        </span>
                      )}
                      {Array.isArray(item.removedExtras) && item.removedExtras.length > 0 && (
                        <span className="cart-item-removed">
                          ✕ No {item.removedExtras.map(e => e.name || e).join(", ")}
                        </span>
                      )}
                      {(item.specialNote || item.special_note) && (
                        <span className="cart-item-note">
                          📝 {item.specialNote || item.special_note}
                        </span>
                      )}
                      <span className="cart-item-each">${lineUnitPrice.toFixed(2)} each</span>
                    </div>

                    {/* ── Right: controls column ── */}
                    <div className="cart-item-right">
                      <div className="cart-item-controls">
                        <div className="cart-qty">
                          <button className="cart-qty-btn"
                            onClick={() => isEditMode
                              ? handleJoinModeUpdate(item, "remove")
                              : removeFromCart(item)
                            }>−</button>
                          <span className="cart-qty-num">{item.quantity}</span>
                          <button className="cart-qty-btn"
                            onClick={() => isEditMode
                              ? handleJoinModeUpdate(item, "add")
                              : addToCart(item)
                            }>+</button>
                        </div>

                        {/* ✏️ Edit button */}
                        <button
                          className="cart-edit-btn"
                          onClick={() => { setEditingItem(enrichItem(item)); setEditingIndex(i); }}
                          title="Edit item"
                        >✏️</button>
                      </div>

                      <span className="cart-item-total">${lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Summary ── */}
          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="cart-summary-row vat-row">
              <span>VAT (11%)</span><span>${vat.toFixed(2)}</span>
            </div>
            <div className="cart-summary-divider"></div>
            <div className="cart-summary-row cart-final-row">
              <span>TOTAL</span><span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Action ── */}
          <div className="cart-action">
            {!isEditMode ? (
              <button className="cart-pay-btn"
                onClick={handleProceedToPayment}
                disabled={placingOrder || displayCart.length === 0}>
                {placingOrder ? "SENDING... 👨‍🍳" : "PROCEED TO PAYMENT ▶"}
              </button>
            ) : (
              <button className="cart-pay-btn"
                onClick={() => navigate(`/checkout?orderId=${urlOrderId}`)}>
                ← BACK TO PAYMENT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;