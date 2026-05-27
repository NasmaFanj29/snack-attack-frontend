import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ordersService from '../services/ordersService';
import menuService from '../services/menuService';
import getImageUrl from '../utils/imageUrl';
import { QRCodeCanvas } from "qrcode.react";
import socket from "../socket";
import useTheme from "../hooks/useTheme";
import PaymentGateway from "../components/PaymentGateway";
import logo from "../assets/logo.png";
import "../style/checkout.css";

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://snack-attack-backend.onrender.com';
const EXCHANGE_RATE = 89500;

/* ───────────────────────────────────────────────────────────── */
/* EDIT ITEM MODAL                                               */
/* ───────────────────────────────────────────────────────────── */

function EditItemModal({ item, onClose, onSave }) {
  const [selectedExtras, setSelectedExtras] = useState(
    Array.isArray(item.selectedExtras)
      ? item.selectedExtras
      : item.selected_extras || []
  );
  const [pendingNote, setPendingNote] = useState(
    item.specialNote || item.special_note || ""
  );
  const [pendingRemoved, setPendingRemoved] = useState(
    Array.isArray(item.removedExtras) ? item.removedExtras : []
  );
  const [itemExtras, setItemExtras] = useState([]);
  const [removableExtras, setRemovableExtras] = useState([]);
  const [subView, setSubView] = useState("main");

  const REMOVE_IDS = {
    Burgers: [1,2,3,4,5,8,9,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,31,32,35,36,37],
    Salad: [1,7,10,11,12,25,26,27,28,29,30,31,32,33,34,35,37],
    Sandwiches: [1,2,3,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,31,32,35,36,37],
  };

  useEffect(() => {
    if (!item.id && !item.item_id && !item.databaseId) return;
    const id = item.databaseId || item.item_id || item.id;
    menuService.getItemExtras(id)
      .then((res) => {
        const list = res?.success ? (res.data || []) : [];
        setItemExtras(list);
        const ids = REMOVE_IDS[item.category] || [];
        setRemovableExtras(list.filter((e) => ids.includes(e.id)));
      })
      .catch(() => { setItemExtras([]); setRemovableExtras([]); });
  }, []);

  const toggleExtra = (extra) =>
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );

  const toggleRemove = (extra) =>
    setPendingRemoved((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );

  const modalPrice =
    Number(item.price || 0) +
    selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0);

  const handleSave = () =>
    onSave({ ...item, selectedExtras, removedExtras: pendingRemoved, specialNote: pendingNote || null });

  if (subView === "note") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={() => setSubView("main")}>×</button>
        <div className="modal-header">
          <h2>Special Instructions</h2>
          <p style={{ color: "#666", fontSize: "14px" }}>For {item.name}</p>
        </div>
        <div className="modal-scroll-area">
          <textarea className="notes-textarea" placeholder="e.g. No onions..." rows="5"
            value={pendingNote} onChange={(e) => setPendingNote(e.target.value)} />
        </div>
        <div className="modal-footer" style={{ display: "flex", gap: "8px" }}>
          <button className="add-btn-final"
            style={{ background: "var(--surface-3)", color: "var(--text-muted)", flex: "0 0 auto", width: "auto", padding: "16px 20px" }}
            onClick={() => setSubView("main")}>← Back</button>
          <button className="add-btn-final" onClick={() => setSubView("main")} disabled={!pendingNote.trim()}>
            Save Note ✓</button>
        </div>
      </div>
    </div>
  );

  if (subView === "remove") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={() => setSubView("main")}>×</button>
        <div className="modal-header">
          <h2>Remove Ingredients</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>from {item.name}</p>
        </div>
        <div className="modal-scroll-area">
          {removableExtras.length > 0 ? (
            <div className="extras-section">
              <div className="extra-group">
                {removableExtras.map((extra) => (
                  <label key={extra.id} className="extra-label">
                    <div className="extra-info">
                      <input type="checkbox"
                        checked={pendingRemoved.some((e) => e.id === extra.id)}
                        onChange={() => toggleRemove(extra)} />
                      <span>{extra.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>No removable ingredients</p>
          )}
        </div>
        <div className="modal-footer" style={{ display: "flex", gap: "8px" }}>
          <button className="add-btn-final"
            style={{ background: "var(--surface-3)", color: "var(--text-muted)", flex: "0 0 auto", width: "auto", padding: "16px 20px" }}
            onClick={() => setSubView("main")}>← Back</button>
          <button className="add-btn-final" onClick={() => setSubView("main")}
            disabled={pendingRemoved.length === 0}
            style={{
              backgroundColor: pendingRemoved.length > 0 ? "#d90d0d" : "var(--surface-3)",
              color: pendingRemoved.length > 0 ? "#fff" : "var(--text-muted)",
            }}>
            Confirm Remove ✕</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>×</button>
        <div className="modal-header">
          {item.image && <img src={getImageUrl(item.image)} alt={item.name} />}
          <h2>{item.name}</h2>
          {item.description && <p>{item.description}</p>}
        </div>
        <div className="modal-actions">
          <button className="menu-action-btn notes-btn" onClick={() => setSubView("note")}>
            📝 {pendingNote ? "Edit Note" : "Add Note"}
          </button>
          {!["Beverages", "Appetizers", "Dips"].includes(item.category) && (
            <button className="menu-action-btn remove-btn" onClick={() => setSubView("remove")}>
              ✕ {pendingRemoved.length > 0 ? "Edit Remove" : "Remove Ingredients"}
            </button>
          )}
        </div>
        <div className="modal-scroll-area">
          {itemExtras.length > 0 && (
            <div className="extras-section">
              <h3>Customize Your Order</h3>
              <div className="extra-group">
                <div className="extra-group-title">Add Extras</div>
                {itemExtras.map((extra) => (
                  <label key={extra.id} className="extra-label">
                    <div className="extra-info">
                      <input type="checkbox"
                        checked={selectedExtras.some((e) => e.id === extra.id)}
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

/* ───────────────────────────────────────────────────────────── */
/* SCANNER JOIN MODAL - When QR is scanned                        */
/* ───────────────────────────────────────────────────────────── */

function ScannerJoinModal({ onJoin, scannerName, setScannerName, scannerPhone, setScannerPhone, menu }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [showMenu, setShowMenu] = useState(false);

  const handleAddItem = (item) => {
    const existingItem = selectedItems.find(i => i.id === item.id);
    if (existingItem) {
      setSelectedItems(selectedItems.map(i =>
        i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (itemId) => {
    setSelectedItems(selectedItems.filter(i => i.id !== itemId));
  };

  const getItemTotal = (item) => {
    const base = Number(item.price || 0);
    const extras = Array.isArray(item.selectedExtras)
      ? item.selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0)
      : 0;
    return (base + extras) * (item.quantity || 1);
  };

  const selectedTotal = selectedItems.reduce((sum, item) => sum + getItemTotal(item), 0);

  const handleJoin = () => {
    if (!scannerName.trim() || !scannerPhone.trim()) {
      alert("Please enter name and phone");
      return;
    }
    if (selectedItems.length === 0) {
      alert("Please select at least one item");
      return;
    }
    onJoin({
      name: scannerName.trim(),
      phone: scannerPhone.trim(),
      items: selectedItems,
      total: selectedTotal,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.9)",
      backdropFilter: "blur(10px)",
      zIndex: 99999,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.5)",
      }}>
        <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "900", margin: 0 }}>
          👥 Join Payment
        </h2>
        <p style={{ color: "var(--text-muted, #888)", fontSize: "12px", margin: "4px 0 0 0" }}>
          Enter your details and pick your items
        </p>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", gap: "20px" }}>
        
        {/* Left: Form */}
        <div style={{ minWidth: "280px", maxWidth: "280px" }}>
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "16px",
          }}>
            <h3 style={{ color: "#fff", fontSize: "13px", fontWeight: "800", marginTop: 0, marginBottom: "12px" }}>
              Your Details
            </h3>

            <input
              type="text"
              placeholder="Your Name"
              value={scannerName}
              onChange={(e) => setScannerName(e.target.value)}
              className="glass-input-main"
              style={{ marginBottom: "12px" }}
            />

            <input
              type="tel"
              placeholder="Phone Number"
              value={scannerPhone}
              onChange={(e) => setScannerPhone(e.target.value)}
              className="glass-input-main"
              style={{ marginBottom: "20px" }}
            />

            {/* Selected Items Summary */}
            <h3 style={{ color: "#FFC20E", fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>
              Your Items ({selectedItems.length})
            </h3>

            {selectedItems.length === 0 ? (
              <p style={{ color: "var(--text-muted, #888)", fontSize: "12px", textAlign: "center", padding: "16px 0" }}>
                👉 Select items from menu
              </p>
            ) : (
              <div style={{
                background: "rgba(255,194,14,0.08)",
                border: "1px solid rgba(255,194,14,0.2)",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "16px",
                maxHeight: "200px",
                overflowY: "auto",
              }}>
                {selectedItems.map((item, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: idx < selectedItems.length - 1 ? "1px solid rgba(255,194,14,0.1)" : "none",
                    fontSize: "11px",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: "700" }}>×{item.quantity} {item.name}</div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "8px" }}>
                      <div style={{ color: "#FFC20E", fontWeight: "800" }}>
                        ${getItemTotal(item).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        style={{
                          background: "rgba(255,80,80,0.2)",
                          border: "none",
                          color: "#ff6b6b",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "10px",
                          cursor: "pointer",
                          marginTop: "2px",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div style={{
              background: "rgba(255,194,14,0.12)",
              border: "1px solid rgba(255,194,14,0.3)",
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "16px",
              textAlign: "center",
            }}>
              <div style={{ color: "var(--text-muted, #888)", fontSize: "11px", marginBottom: "4px" }}>
                Your Total
              </div>
              <div style={{ color: "#FFC20E", fontSize: "18px", fontWeight: "900" }}>
                ${selectedTotal.toFixed(2)}
              </div>
            </div>

            {/* Join Button */}
            <button
              onClick={handleJoin}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg,#FFC20E 0%,#ff9f0a 100%)",
                color: "#000",
                fontWeight: "900",
                fontSize: "12px",
                cursor: "pointer",
                letterSpacing: "1px",
              }}
            >
              ✓ JOIN PAYMENT
            </button>
          </div>
        </div>

        {/* Right: Menu */}
        <div style={{ flex: 1 }}>
          <h3 style={{ color: "#fff", fontSize: "13px", fontWeight: "800", marginTop: 0, marginBottom: "12px" }}>
            📋 Select Your Items
          </h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "12px",
          }}>
            {menu.map((item) => {
              const isSelected = selectedItems.some(i => i.id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(255,194,14,0.3), rgba(255,194,14,0.1))"
                      : "rgba(255,255,255,0.04)",
                    border: isSelected
                      ? "2px solid #FFC20E"
                      : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    padding: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = isSelected ? "linear-gradient(135deg, rgba(255,194,14,0.4), rgba(255,194,14,0.15))" : "rgba(255,255,255,0.06)"}
                  onMouseOut={(e) => e.currentTarget.style.background = isSelected ? "linear-gradient(135deg, rgba(255,194,14,0.3), rgba(255,194,14,0.1))" : "rgba(255,255,255,0.04)"}
                >
                  <div style={{ color: "#fff", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>
                    {item.name}
                  </div>
                  <div style={{ color: "#FFC20E", fontSize: "13px", fontWeight: "900" }}>
                    ${Number(item.price).toFixed(2)}
                  </div>
                  {isSelected && (
                    <div style={{
                      marginTop: "8px",
                      padding: "6px",
                      background: "rgba(255,194,14,0.2)",
                      borderRadius: "6px",
                      textAlign: "center",
                      color: "#FFC20E",
                      fontSize: "11px",
                      fontWeight: "800",
                    }}>
                      ✓ Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* CHECKOUT COMPONENT                                            */
/* ───────────────────────────────────────────────────────────── */

function Checkout({ setCart }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlOrderId = searchParams.get("orderId");
  const { orderId: stateOrderId, cartItems: stateCartItems = [], tableId: stateTableId = "1" } = location.state || {};
  const activeOrderId = stateOrderId || urlOrderId;
  const isScanner = !!(urlOrderId && searchParams.get("mode") === "add");
  
  const [scannerName, setScannerName] = useState("");
  const [scannerPhone, setScannerPhone] = useState("");
  const [showScannerModal, setShowScannerModal] = useState(isScanner);
  const [menu, setMenu] = useState([]);
  const [joinedPeopleCount, setJoinedPeopleCount] = useState(1);

  const { isDark } = useTheme();

  const [orderedItems, setOrderedItems] = useState(stateCartItems);
  const [tableId, setTableId] = useState(stateTableId);
  const [step, setStep] = useState(stateOrderId ? "payment" : "waiting");
  const [payers, setPayers] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txIdSubmitted, setTxIdSubmitted] = useState(false);
  const [liveCount, setLiveCount] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showCardGateway, setShowCardGateway] = useState(false);
  const [activeCardPayer, setActiveCardPayer] = useState(null);
  const [serverTotal, setServerTotal] = useState(0);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // ── Tip state ──
  const [tipCurrency, setTipCurrency] = useState("USD");
  const [tipAmountUSD, setTipAmountUSD] = useState(0);
  const [showTipOther, setShowTipOther] = useState(false);
  const [tipCustomInput, setTipCustomInput] = useState("");
  const [selectedTipPreset, setSelectedTipPreset] = useState(null);

  const myPayerIdRef = useRef(null);
  const ignoreUpdatesUntil = useRef(0);
  const syncTimerRef = useRef(null);
  const cartClearedRef = useRef(false);
  const myUserId = useRef(localStorage.getItem("userId"));

  if (!myUserId.current) {
    myUserId.current = Date.now().toString();
    localStorage.setItem("userId", myUserId.current);
  }

  const rawSubtotal     = (orderedItems || []).reduce(
    (acc, item) => acc + Number(item.price || item.price_at_time || 0) * (item.quantity || 1), 0
  );
  const rawVAT          = rawSubtotal * 0.11;
  const baseFinal       = serverTotal > 0 ? serverTotal : rawSubtotal + rawVAT;
  const subtotal        = baseFinal / 1.11;
  const totalVAT        = baseFinal - subtotal;
  const finalTotal = baseFinal + tipAmountUSD;
  const receiptSubtotal = subtotal;
  const receiptVAT      = totalVAT;
 
  // ── Tip helpers ──
  const USD_TIPS = [1, 2];
  const LBP_TIPS = [100000, 150000];

  const handleTipPreset = (value) => {
    if (selectedTipPreset === value) {
      setSelectedTipPreset(null);
      setTipAmountUSD(0);
      setShowTipOther(false);
      return;
    }
    setSelectedTipPreset(value);
    setShowTipOther(false);
    setTipCustomInput("");
    if (tipCurrency === "USD") {
      setTipAmountUSD(value);
    } else {
      setTipAmountUSD(value / EXCHANGE_RATE);
    }
  };

  const handleTipOther = () => {
    setSelectedTipPreset("other");
    setShowTipOther(true);
    setTipAmountUSD(0);
    setTipCustomInput("");
  };

  const handleTipCustomChange = (raw) => {
    setTipCustomInput(raw);
    const num = parseFloat(raw) || 0;
    if (tipCurrency === "USD") {
      setTipAmountUSD(num);
    } else {
      setTipAmountUSD(num / EXCHANGE_RATE);
    }
  };

  const handleTipCurrencyChange = (curr) => {
    setTipCurrency(curr);
    setSelectedTipPreset(null);
    setTipAmountUSD(0);
    setShowTipOther(false);
    setTipCustomInput("");
  };

  const qrValue = `${window.location.origin}/checkout?orderId=${activeOrderId}&mode=add`;

  const isEditing = () => Date.now() < ignoreUpdatesUntil.current;

  /* ── Payer helpers ── */

  function getPayerUsdTotal(payer) {
    if (payer.method === "card") return Number(payer.amount) || 0;
    let total = 0;
    const first = Number(payer.amount) || 0;
    const second = Number(payer.cashSecondAmount) || 0;
    const secondCurrency = payer.currency === "USD" ? "LBP" : "USD";
    total += payer.currency === "USD" ? first : first / EXCHANGE_RATE;
    if (payer.cashHasSplit) {
      total += secondCurrency === "USD" ? second : second / EXCHANGE_RATE;
    }
    return total;
  }

  const totalPaidSoFar = payers.reduce((acc, p) => acc + getPayerUsdTotal(p), 0);
  const remainingBalance = finalTotal - totalPaidSoFar;

  /* ── Default payer ── */


const defaultPayer = (id) => ({
  id: id || Date.now(),
  name: localStorage.getItem('guestName') || "",  // ✅
  phone: localStorage.getItem('guestPhone') || "", // ✅
  amount: 0,
  method: "cash", currency: "USD",
  cashHasSplit: false, cashSecondAmount: 0,
  whishCode: null, whishConfirmed: false,
  transactionId: "", txIdRequested: false,
  ownerId: myUserId.current, paid: false,
  items: [],
});

  /* ── Backend sync ── */

  const syncPayersToBackend = async (updatedPayers) => {
    if (!activeOrderId) return;
    try {
      await ordersService.updateOrderSplits(activeOrderId, {
        payment_splits: updatedPayers,
        tip_amount: tipAmountUSD,
      });
    } catch (err) { console.error('[syncPayersToBackend]', err); }
  };

  const handleSaveEditedItem = async (updatedItem) => {
    const newItems = orderedItems.map((it, idx) => idx === editingIndex ? { ...it, ...updatedItem } : it);
    setOrderedItems(newItems);
    setEditingItem(null);
    setEditingIndex(null);
  };

  /* ── Add/Remove Payers ── */
  const addPayer = () => {
    setPayers([...payers, defaultPayer()]);
  };

  const removePayer = (id) => {
    if (payers.length > 1) {
      setPayers(payers.filter(p => p.id !== id));
    }
  };

  /* ── Handle Scanner Join ── */
  const handleScannerJoin = (joinData) => {
    const newPayer = {
      ...defaultPayer(),
      name: joinData.name,
      phone: joinData.phone,
      items: joinData.items,
      amount: joinData.total,
      ownerId: myUserId.current,
    };
    
    setPayers([...payers, newPayer]);
    setShowScannerModal(false);
    setScannerName("");
    setScannerPhone("");
    
    // Broadcast to all users that someone joined
    socket.emit("person:joined-payment", {
      orderId: activeOrderId,
      person: { name: joinData.name, itemCount: joinData.items.length },
      totalPeople: payers.length + 1,
    });
    
    setJoinedPeopleCount(payers.length + 1);
  };

  /* ── Fetch order on mount ── */

  useEffect(() => {
    if (!activeOrderId) return;
    ordersService.getOrder(activeOrderId)
      .then((resp) => {
        if (!resp || !resp.success) throw new Error(resp?.error || 'Failed to fetch order');
        const res = resp.data || {};
        setOrderedItems(res.order?.items || []);
        setTableId(res.order?.table_id || "1");
        setServerTotal(Number(res.order?.total_price || 0));
        let existingSplits = [];
        try {
          const raw = res.order?.payment_splits;
          if (raw) {
            const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            existingSplits = Array.isArray(parsed) ? parsed : [];
          }
        } catch { existingSplits = []; }
        const status = (res.order?.status || "").trim().toLowerCase();
        if (status === "paid" || status === "paid-accepted") {
          const savedTip = Number(res.order?.tip_amount || 0);
          if (savedTip > 0) setTipAmountUSD(savedTip);
          setStep("receipt");
          return;
        }
        if (["accepted", "preparing", "ready", "served"].includes(status)) setStep("payment");
        setPayers(existingSplits.length > 0 ? existingSplits : [defaultPayer(1)]);
      })
      .catch(console.error);
  }, [activeOrderId]);

  /* ── Fetch menu for scanner modal ── */
  useEffect(() => {
    menuService.getMenu()
  .then((res) => {
    if (res?.success) setMenu(res.data?.menu || []);
  })
      .catch(console.error);
  }, []);

  /* ── Socket ── */

  useEffect(() => {
    if (!activeOrderId) return;
    socket.emit("joinOrder", activeOrderId);
    
    socket.on("cartUpdated", () => {
      ordersService.getOrder(activeOrderId)
        .then((resp) => { if (resp?.success) setOrderedItems(resp.data?.items || []); })
        .catch(() => {});
    });
    
    socket.on("presenceUpdate", ({ count }) => setLiveCount(count));
    
    socket.on("person:joined-payment", ({ totalPeople }) => {
      setJoinedPeopleCount(totalPeople);
    });
    
    return () => { 
      socket.off("cartUpdated");
      socket.off("presenceUpdate");
      socket.off("person:joined-payment");
    };
  }, [activeOrderId]);

  useEffect(() => {
    if (!["waitingForPayment", "cooking"].includes(step) || !activeOrderId) return;

    const interval = setInterval(async () => {
      try {
        const resp = await ordersService.getOrder(activeOrderId);
        if (!resp?.success) return;
        const status = (resp.data?.order?.status || "").trim().toLowerCase();
        const savedTip = Number(resp.data?.order?.tip_amount || 0);

        if (status === "paid" || status === "paid-accepted") {
          clearInterval(interval);
          if (savedTip > 0) setTipAmountUSD(savedTip);
          setStep("receipt");
          return;
        }

        if (step === "waitingForPayment" && ["paid-accepted", "paid-preparing", "paid-ready"].includes(status)) {
          clearInterval(interval);
          if (savedTip > 0) setTipAmountUSD(savedTip);
          setStep("cooking");
          return;
        }

        if (status === "rejected") {
          clearInterval(interval);
          setStep("rejected");
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [step, activeOrderId]);

  if (step === "waiting" || step === "waitingForPayment" || step === "cooking") {
    return (
      <div className="checkout-page">
        <div className="overlay" style={{ display: "flex", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div className="info-form-card glass-effect" style={{ padding: "50px" }}>
            <img src={logo} alt="Logo" width="160" style={{ marginBottom: "20px" }} />
            <h2>
              {step === "waiting"
                ? "KITCHEN IS COOKING 👨‍🍳"
                : step === "cooking"
                ? "ORDER CONFIRMED — BEING PREPARED 🔥"
                : "WAITING FOR ADMIN 💰"}
            </h2>
            <div className="loader-line"></div>
          </div>
        </div>
      </div>
    );
  }

  const updatePayer = (id, field, value) => {
    ignoreUpdatesUntil.current = Date.now() + 2500;
    setPayers((prev) => {
      const updated = prev.map((p) => p.id !== id ? p : { ...p, [field]: value });
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => syncPayersToBackend(updated), 800);
      return updated;
    });
  };

  /* ── Card gateway ── */

  const openCardGateway = (payer) => { setActiveCardPayer(payer); setShowCardGateway(true); };

  const handleCardPaymentSuccess = async (transactionRef) => {
  if (!activeCardPayer) return;

  try {
    // ✅ سجّل الـ payment في الـ DB
    const res = await fetch(`${API_URL}/api/orders/${activeOrderId}/payment/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: 'card',
        amount_usd: Number(activeCardPayer.amount || 0),
        currency: 'USD',
        payer_name: activeCardPayer.name || 'Guest',
        payer_phone: activeCardPayer.phone || '000',
        owner_id: activeCardPayer.ownerId || myUserId.current || 'anonymous',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // أكّد الـ Stripe payment
      await fetch(`${API_URL}/api/orders/${activeOrderId}/payment/stripe-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: data.payment?.id,
          stripeChargeId: transactionRef,
          stripeIntentId: transactionRef,
          cardBrand: 'visa',
          cardLast4: '4242',
          receiptUrl: '',
        }),
      });
    }
  } catch (err) {
    console.error('Card payment record error:', err);
  }

  const updated = payers.map((p) =>
    p.id === activeCardPayer.id
      ? { ...p, transactionId: transactionRef, paid: true, method: 'card' }
      : p
  );

  setPayers(updated);
  setShowCardGateway(false);
  setActiveCardPayer(null);
  socket.emit("orderPaymentSubmitted", activeOrderId);
  setStep("waitingForPayment");
};

  /* ── Confirm payment ── */

const handleConfirmPayment = async (e) => {
  e.preventDefault();
  
  const hasCardPaid = payers.some(p => p.paid === true);
  
  if (hasCardPaid) {
    socket.emit("orderPaymentSubmitted", activeOrderId);
    setStep("waitingForPayment");
    return;
  }
  
  // ✅ VALIDATE before sending
  for (const payer of payers) {
    if (!payer.name || !payer.phone) {
      alert("All payers must have a name and phone number");
      return;
    }
    if (Number(payer.amount || 0) <= 0) {
      alert(`${payer.name} must have a valid payment amount`);
      return;
    }
  }
  
  setLoading(true);
  try {
    for (const payer of payers) {
      const payload = {
        method: (payer.method || 'cash').toLowerCase(),
        amount_usd: Number(payer.amount || 0),
        currency: payer.currency || 'USD',
        payer_name: payer.name.trim(),
        payer_phone: payer.phone.trim(),
        owner_id: payer.ownerId || myUserId.current || 'anonymous',
      };
      
      console.log('Sending payment payload:', payload); // 👈 Debug log
      
      const res = await fetch(`${API_URL}/api/orders/${activeOrderId}/payment/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Backend error:', err); // 👈 Debug log
        throw new Error(err.error || `Server error ${res.status}`);
      }
    }

    socket.emit("orderPaymentSubmitted", activeOrderId);
    setStep("waitingForPayment");
    
  } catch (err) {
    alert("Error confirming payment: " + err.message);
  } finally { 
    setLoading(false); 
  }
};

  /* ─────────────────────────────────────────── */
  /* RENDER: Method selector                     */
  /* ─────────────────────────────────────────── */

  const renderMethodSelector = (payer, isMine) => (
    <div className="method-btn-group">
      {[{ id: "cash", label: "💵 Cash" }, { id: "card", label: "💳 Card" }].map((m) => (
        <button key={m.id} type="button"
          className={`method-btn ${payer.method === m.id ? "active" : ""}`}
          onClick={() => isMine && updatePayer(payer.id, "method", m.id)}>
          {m.label}
        </button>
      ))}
    </div>
  );

  const sanitizeAmount = (raw) => raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

  const blockBadKeys = (e) => {
    const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Tab","Enter","Home","End"];
    if (allowed.includes(e.key)) return;
    if (/^[0-9.]$/.test(e.key)) return;
    e.preventDefault();
  };

  const renderCashExtras = (payer, isMine) => {
    const secondCurrency = payer.currency === "USD" ? "LBP" : "USD";

    return (
      <div className="cash-extras-wrapper">
        <div className="cash-amount-row">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            className="glass-input-small cash-amount-input"
            value={payer.amount || ""}
            disabled={!isMine}
            onKeyDown={blockBadKeys}
            onChange={(e) => updatePayer(payer.id, "amount", sanitizeAmount(e.target.value))}
          />
          <div className="cash-currency-toggle">
            {["USD", "LBP"].map((c) => (
              <button key={c} type="button"
                className={`cc-btn ${payer.currency === c ? "active" : ""}`}
                onClick={() => isMine && updatePayer(payer.id, "currency", c)}>
                {c}
              </button>
            ))}
          </div>

          {isMine && !payer.cashHasSplit && (
            <button
              type="button"
              onClick={() => updatePayer(payer.id, "cashHasSplit", true)}
              title={`Add ${secondCurrency} amount`}
              style={{
                marginLeft: "8px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "1px solid rgba(255,194,14,0.4)",
                background: "rgba(255,194,14,0.1)",
                color: "#FFC20E",
                fontSize: "20px",
                fontWeight: "700",
                lineHeight: "1",
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          )}
        </div>

        {payer.cashHasSplit && (
          <div style={{ marginTop: "10px" }}>
            <div style={{
              fontSize: "11px",
              color: "var(--text-muted, #888)",
              letterSpacing: "0.8px",
              marginBottom: "6px",
              textTransform: "uppercase",
            }}>
              + Also paying in {secondCurrency}
            </div>
            <div className="cash-amount-row">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                className="glass-input-small cash-amount-input"
                value={payer.cashSecondAmount || ""}
                disabled={!isMine}
                onKeyDown={blockBadKeys}
                onChange={(e) => updatePayer(payer.id, "cashSecondAmount", sanitizeAmount(e.target.value))}
              />
              <div className="cash-currency-toggle">
                <button type="button" className="cc-btn active" style={{ pointerEvents: "none" }}>
                  {secondCurrency}
                </button>
              </div>

              {isMine && (
                <button
                  type="button"
                  onClick={() => {
                    updatePayer(payer.id, "cashHasSplit", false);
                    updatePayer(payer.id, "cashSecondAmount", 0);
                  }}
                  title="Remove second currency"
                  style={{
                    marginLeft: "8px",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "1px solid rgba(255,80,80,0.4)",
                    background: "rgba(255,80,80,0.1)",
                    color: "#ff6b6b",
                    fontSize: "20px",
                    fontWeight: "700",
                    lineHeight: "1",
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTransferFlow = (payer, isMine) => {
    const handlePayNowClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!payer.amount || Number(payer.amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }
      openCardGateway(payer);
    };

    return (
      <div style={{
        marginTop: "16px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "18px",
        padding: "18px",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: "800", fontSize: "15px" }}>Credit / Debit Card</div>
            <div style={{ color: "var(--text-muted, #888)", fontSize: "12px", marginTop: "2px" }}>Visa • Mastercard • AMEX</div>
          </div>
          <div style={{
            background: "rgba(255,194,14,0.12)", color: "#FFC20E",
            border: "1px solid rgba(255,194,14,0.25)", borderRadius: "999px",
            padding: "6px 12px", fontSize: "11px", fontWeight: "700",
          }}>SECURED</div>
        </div>

        {isMine && (
          <>
            <input 
              type="text" 
              inputMode="decimal" 
              placeholder="Enter amount" 
              className="glass-input-main"
              style={{ width: "100%", marginBottom: "14px" }}
              value={payer.amount || ""}
              onKeyDown={blockBadKeys}
              onChange={(e) => updatePayer(payer.id, "amount", sanitizeAmount(e.target.value))} 
            />

            {!payer.paid ? (
              <button 
                type="button"
                onClick={handlePayNowClick}
                style={{
                  width: "100%", 
                  padding: "15px", 
                  borderRadius: "14px", 
                  border: "none",
                  background: "linear-gradient(135deg,#FFC20E 0%,#ff9f0a 100%)",
                  color: "#000", 
                  fontWeight: "900", 
                  fontSize: "13px", 
                  letterSpacing: "2px", 
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                PAY NOW 💳
              </button>
            ) : (
              <div style={{
                background: "rgba(16,185,129,0.12)", 
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: "14px", 
                padding: "14px", 
                textAlign: "center",
                color: "#10b981", 
                fontWeight: "800",
              }}>
                ✓ PAYMENT COMPLETED
              </div>
            )}

            {payer.transactionId && (
              <div style={{ marginTop: "10px", textAlign: "center", color: "var(--text-muted, #888)", fontSize: "11px" }}>
                Ref: {payer.transactionId}
              </div>
            )}
          </>
        )}

        {!isMine && (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted, #888)" }}>
            💳 {payer.name || "Guest"} will pay ${Number(payer.amount || 0).toFixed(2)}
            {payer.paid && <div style={{ marginTop: "8px", color: "#10b981" }}>✓ Payment completed</div>}
          </div>
        )}
      </div>
    );
  };

  const renderTipSection = () => {
    const presets = tipCurrency === "USD" ? USD_TIPS : LBP_TIPS;

    return (
      <div className="payer-card payer-mine" style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <div style={{ color: "var(--text-primary, #1a1a1a)", fontWeight: "800", fontSize: "14px", letterSpacing: "0.5px" }}>
              🙏 Leave a Tip
            </div>
            <div style={{ color: "var(--text-muted, #888)", fontSize: "11px", marginTop: "2px" }}>
              Add a tip if you'd like to support our team (optional) ✨
            </div>
          </div>

          <div style={{ display: "flex", gap: "4px" }}>
            {["USD", "LBP"].map((c) => (
              <button key={c} type="button"
                onClick={() => handleTipCurrencyChange(c)}
                className={`cc-btn ${tipCurrency === c ? "active" : ""}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {presets.map((val) => {
            const isActive = selectedTipPreset === val;
            const label = tipCurrency === "USD"
              ? `$${val}`
              : val >= 1000
                ? `${(val / 1000).toFixed(0)}k LBP`
                : `${val} LBP`;
            return (
              <button key={val} type="button"
                onClick={() => handleTipPreset(val)}
                className={`method-btn ${isActive ? "active" : ""}`}
                style={{ flex: "1", minWidth: "60px", fontSize: "13px", fontWeight: "700", transition: "all 0.15s ease" }}>
                {label}
              </button>
            );
          })}

          <button type="button"
            onClick={handleTipOther}
            className={`method-btn ${selectedTipPreset === "other" ? "active" : ""}`}
            style={{ flex: "1", minWidth: "60px", fontSize: "13px", fontWeight: "700", transition: "all 0.15s ease" }}>
            Other
          </button>
        </div>

        {showTipOther && (
          <div style={{ marginTop: "12px" }}>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted, #888)", fontSize: "13px", fontWeight: "700", pointerEvents: "none",
              }}>
                {tipCurrency === "USD" ? "$" : "LBP"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={tipCurrency === "USD" ? "Enter USD amount" : "Enter LBP amount"}
                className="glass-input-main"
                style={{ paddingLeft: tipCurrency === "USD" ? "30px" : "46px" }}
                value={tipCustomInput}
                onKeyDown={blockBadKeys}
                onChange={(e) => { const v = sanitizeAmount(e.target.value); setTipCustomInput(v); handleTipCustomChange(v); }}
              />
            </div>
            {tipCustomInput && Number(tipCustomInput) > 0 && (
              <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-muted, #888)", paddingLeft: "2px" }}>
                {tipCurrency === "LBP"
                  ? `= $${(Number(tipCustomInput) / EXCHANGE_RATE).toFixed(2)} USD`
                  : `= ${(Number(tipCustomInput) * EXCHANGE_RATE).toLocaleString()} LBP`
                }
              </div>
            )}
          </div>
        )}

        {tipAmountUSD > 0 && (
          <div style={{
            marginTop: "12px", padding: "8px 12px", borderRadius: "10px",
            border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.03)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #888)" }}>Tip added:</span>
            <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text-primary, #1a1a1a)" }}>
              +${tipAmountUSD.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    );
  };

  /* ─────────────────────────────────────────── */
  /* PAYMENT STEP                                */
  /* ─────────────────────────────────────────── */

  if (step === "payment") {
    return (
      <div className="checkout-page">
        <div className="overlay">

          {/* SCANNER MODAL */}
          {showScannerModal && isScanner && (
            <ScannerJoinModal
              onJoin={handleScannerJoin}
              scannerName={scannerName}
              setScannerName={setScannerName}
              scannerPhone={scannerPhone}
              setScannerPhone={setScannerPhone}
              menu={menu}
            />
          )}

          {showCardGateway && activeCardPayer && (
            <div style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              zIndex: 99999,
              display: "flex", justifyContent: "center", alignItems: "center", padding: "20px",
            }}>
              <div style={{
                width: "100%", maxWidth: "460px",
                background: "#0f172a", borderRadius: "28px", padding: "26px",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
              }}>
                {!activeOrderId ? (
                  <div style={{ color: '#f87171', padding: 16, textAlign: 'center' }}>
                    ⚠️ Order not found. Please refresh the page and try again.
                  </div>
                ) : (
                  <PaymentGateway
                    amount={Number(activeCardPayer.amount || 0)}
                    orderId={activeOrderId}
                    onSuccess={handleCardPaymentSuccess}
                    onCancel={() => { setShowCardGateway(false); setActiveCardPayer(null); }}
                  />
                )}
              </div>
            </div>
          )}

          {showQR && (
            <div className="qr-popup-overlay">
              <div className="qr-popup-content slide-down">
                <h3 style={{ color: "#fff", marginTop: 0 }}>👥 {joinedPeopleCount} {joinedPeopleCount === 1 ? "person" : "people"} joining</h3>
                <QRCodeCanvas value={qrValue} size={200} />
                <button onClick={() => setShowQR(false)}>DONE</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            {/* PAYMENT PANEL (CENTERED, NO LEFT PANEL) */}
            <div style={{ width: "100%", maxWidth: "500px" }}>
              {editingItem && (
                <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEditedItem} />
              )}

              <div className="info-form-card glass-effect">
                <h2 className="checkout-title">💳 PAYMENT</h2>
                <p style={{ color: "var(--text-muted, #888)", marginBottom: "20px", fontSize: "13px" }}>
                  Order #{activeOrderId} | Table #{tableId} | 👥 {joinedPeopleCount} {joinedPeopleCount === 1 ? "person" : "people"}
                </p>

                <form onSubmit={handleConfirmPayment}>
                  {/* PAYERS */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4 style={{ color: "#fff", fontWeight: "800", fontSize: "14px", margin: "0 0 12px 0" }}>💰 Who's Paying?</h4>

                    {payers.map((payer) => {
                      const isMine = payer.ownerId === myUserId.current;
                      return (
                        <div key={payer.id} className="payer-card payer-mine" style={{ marginBottom: "12px", position: "relative" }}>
                          {payers.length > 1 && (
                            <button type="button" onClick={() => removePayer(payer.id)} style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: "rgba(255,80,80,0.2)",
                              border: "1px solid rgba(255,80,80,0.3)",
                              color: "#ff6b6b",
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                              ✕
                            </button>
                          )}

                          <input type="text" placeholder="Name" value={payer.name || ""} onChange={(e) => updatePayer(payer.id, "name", e.target.value)} className="glass-input-main" style={{ marginBottom: "8px" }} />
                          <input type="tel" placeholder="Phone" value={payer.phone || ""} onChange={(e) => updatePayer(payer.id, "phone", e.target.value)} className="glass-input-main" style={{ marginBottom: "12px" }} />

                          {Array.isArray(payer.items) && payer.items.length > 0 && (
                            <div style={{ fontSize: "11px", color: "var(--text-muted, #888)", marginBottom: "12px", padding: "8px", background: "rgba(255,194,14,0.1)", borderRadius: "6px" }}>
                              📦 {payer.items.length} item{payer.items.length !== 1 ? "s" : ""} selected
                            </div>
                          )}

                          <div className="method-btn-group" style={{ marginBottom: "12px" }}>
                            {[{ id: "cash", label: "💵 Cash" }, { id: "card", label: "💳 Card" }].map((m) => (
                              <button key={m.id} type="button" className={`method-btn ${payer.method === m.id ? "active" : ""}`}
                                onClick={() => updatePayer(payer.id, "method", m.id)}>
                                {m.label}
                              </button>
                            ))}
                          </div>

                          {payer.method === "cash" && renderCashExtras(payer, isMine)}
                          {payer.method === "card" && renderTransferFlow(payer, isMine)}

                          <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted, #888)" }}>
                            <span>Amount:</span>
                            <span>${getPayerUsdTotal(payer).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* TIP */}
                  {payers.some(p => p.ownerId === myUserId.current) && renderTipSection()}

                  {/* QR */}
                  <button type="button" onClick={() => setShowQR(true)} style={{
                    width: "100%", marginBottom: "16px", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,194,14,0.3)",
                    background: "rgba(255,194,14,0.1)", color: "#FFC20E", fontWeight: "700", fontSize: "12px", cursor: "pointer",
                  }}>
                    📲 Scan to Split (👥 {joinedPeopleCount})
                  </button>

                  {/* REMAINING */}
                  <div style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "12px",
                    marginBottom: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    color: remainingBalance > 0.01 ? "#ff6b6b" : "#10b981",
                    fontWeight: "700",
                  }}>
                    <span>Remaining:</span>
                  <div style={{ textAlign: 'right' }}>
                    <div>${Math.max(0, remainingBalance).toFixed(2)}</div>
                    {remainingBalance > 0.01 && (
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                        {Math.round(remainingBalance * 89500).toLocaleString()} LBP
                      </div>
                    )}
                  </div>
                </div>

                  {/* SUBMIT */}
                  <button type="submit" className="place-order-btn-final" disabled={loading || remainingBalance > 0.5}>
                    {loading 
                      ? "CONFIRMING..." 
                      : paymentConfirmed 
                      ? "SHOW RECEIPT ✅" 
                      : "CONFIRM PAYMENT 💳"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* RECEIPT */
  if (step === "receipt") {
    return (
      <div className="checkout-page">
        <div className="overlay" style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start",
          paddingTop: "120px", paddingBottom: "60px",
          minHeight: "100vh", overflowY: "auto",
        }}>
          <div className="receipt-paper" style={{ maxWidth: "420px", width: "85%", margin: "0 auto" }}>
            <img src={logo} alt="Logo" className="receipt-logo-bw" />
            <div className="receipt-branch-info">
              <h1>Snack Attack</h1>
              <h3>Hamra - Bliss Street</h3>
              <p>Tel: 03 231 506</p>
            </div>
            <div className="receipt-header-info">
              <p><strong>Order #:</strong> {activeOrderId}</p>
              <p><strong>Table:</strong> #{tableId}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            </div>
            <div className="receipt-divider">-------------------------------------------</div>
          <div className="receipt-items">
  {orderedItems.map((item, index) => {
    const basePrice = Number(item.price || item.price_at_time || 0);
    
    const extras = Array.isArray(item.selectedExtras) ? item.selectedExtras
      : Array.isArray(item.selected_extras) ? item.selected_extras : [];
    
    const removed = Array.isArray(item.removedExtras) ? item.removedExtras
      : Array.isArray(item.removed_extras) ? item.removed_extras : [];
    
    const note = item.specialNote || item.special_note || '';
    
    const extrasTotal = extras.reduce((s, e) => s + Number(e.price || 0), 0);
    const lineTotal = (basePrice + extrasTotal) * (item.quantity || 1);

    return (
      <div key={index} className="r-item-container">
        <div className="r-item-row">
          <span>{item.quantity}x {item.name}</span>
          <span>${lineTotal.toFixed(2)}</span>
        </div>
        {extras.length > 0 && (
          <div className="r-extras" style={{ color: '#FFC20E', fontSize: '11px' }}>
            ➕ {extras.map(e => e.name || e).join(', ')}
          </div>
        )}
        {removed.length > 0 && (
          <div className="r-extras" style={{ color: '#ff6b6b', fontSize: '11px' }}>
            ✕ No {removed.map(e => e.name || e).join(', ')}
          </div>
        )}
        {note && (
          <div className="r-extras" style={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
            📝 {note}
          </div>
        )}
      </div>
    );
  })}
</div>
            <div className="receipt-divider">-------------------------------------------</div>
            <div className="receipt-summary">
              <div className="r-summary-line">
                <span>Subtotal:</span><span>${receiptSubtotal.toFixed(2)}</span>
              </div>
              <div className="r-summary-line">
                <span>VAT (11%):</span><span>${receiptVAT.toFixed(2)}</span>
              </div>
              {tipAmountUSD > 0 && (
                <div className="r-summary-line" style={{ color: "#FFC20E" }}>
                  <span>Tip:</span><span>+${tipAmountUSD.toFixed(2)}</span>
                </div>
              )}
              <div className="receipt-total-row"><span>TOTAL:</span><span>${finalTotal.toFixed(2)}</span></div>
            </div>
            <div className="receipt-divider">-------------------------------------------</div>
            <p style={{ textAlign: "center", fontSize: "12px", marginTop: "10px" }}>Thank you for dining with us!</p>
          </div>

          <div style={{ textAlign: "center", width: "100%", maxWidth: "420px", marginTop: "20px" }}>
            <h2 style={{ color: "#fff", fontSize: "28px", fontWeight: "900" }}>✅ PAID! ENJOY!</h2>
            <button className="back-btn-new" onClick={() => window.location.href = "/"}>New Order</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "rejected") {
    return (
      <div className="checkout-page">
        <div className="overlay" style={{ display: "flex", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div className="info-form-card glass-effect" style={{ padding: "50px" }}>
            <h2>❌ ORDER REJECTED</h2>
            <button onClick={() => (window.location.href = "/")}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Checkout;