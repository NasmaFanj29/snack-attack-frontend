import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import "../style/menu.css";
import { endSession } from '../utils/sessionReset';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://snack-attack-backend.onrender.com';
const EXCHANGE_RATE = 89500;

// ============================================================================
// EDIT ITEM MODAL
// ============================================================================
function EditItemModal({ item, onClose, onSave }) {
  const [selectedExtras, setSelectedExtras] = useState(
    Array.isArray(item.selectedExtras) ? item.selectedExtras : item.selected_extras || []
  );
  const [pendingNote, setPendingNote] = useState(item.specialNote || item.special_note || "");
  const [pendingRemoved, setPendingRemoved] = useState(Array.isArray(item.removedExtras) ? item.removedExtras : []);
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
    menuService.getItemExtras(id).then(res => {
      const list = res?.success ? (res.data || []) : [];
      setItemExtras(list);
      setRemovableExtras(list.filter(e => (REMOVE_IDS[item.category] || []).includes(e.id)));
    }).catch(() => { setItemExtras([]); setRemovableExtras([]); });
  }, [item.id, item.item_id, item.databaseId, item.category]);

  const toggleExtra = e => setSelectedExtras(p => p.find(x => x.id === e.id) ? p.filter(x => x.id !== e.id) : [...p, e]);
  const toggleRemove = e => setPendingRemoved(p => p.find(x => x.id === e.id) ? p.filter(x => x.id !== e.id) : [...p, e]);
  const modalPrice = Number(item.price || 0) + selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0);
  const handleSave = () => onSave({ ...item, selectedExtras, removedExtras: pendingRemoved, specialNote: pendingNote || null });

  if (subView === "note") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={() => setSubView("main")}>×</button>
        <div className="modal-header"><h2>Special Instructions</h2><p style={{ color: "#666", fontSize: "14px" }}>For {item.name}</p></div>
        <div className="modal-scroll-area"><textarea className="notes-textarea" placeholder="e.g. No onions..." rows="5" value={pendingNote} onChange={e => setPendingNote(e.target.value)} /></div>
        <div className="modal-footer" style={{ display: "flex", gap: "8px" }}>
          <button className="add-btn-final" style={{ background: "var(--surface-3)", color: "var(--text-muted)", flex: "0 0 auto", width: "auto", padding: "16px 20px" }} onClick={() => setSubView("main")}>← Back</button>
          <button className="add-btn-final" onClick={() => setSubView("main")} disabled={!pendingNote.trim()}>Save Note ✓</button>
        </div>
      </div>
    </div>
  );

  if (subView === "remove") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={() => setSubView("main")}>×</button>
        <div className="modal-header"><h2>Remove Ingredients</h2><p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>from {item.name}</p></div>
        <div className="modal-scroll-area">
          {removableExtras.length > 0
            ? <div className="extras-section"><div className="extra-group">{removableExtras.map(x => (
              <label key={x.id} className="extra-label"><div className="extra-info"><input type="checkbox" checked={pendingRemoved.some(e => e.id === x.id)} onChange={() => toggleRemove(x)} /><span>{x.name}</span></div></label>
            ))}</div></div>
            : <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>No removable ingredients</p>}
        </div>
        <div className="modal-footer" style={{ display: "flex", gap: "8px" }}>
          <button className="add-btn-final" style={{ background: "var(--surface-3)", color: "var(--text-muted)", flex: "0 0 auto", width: "auto", padding: "16px 20px" }} onClick={() => setSubView("main")}>← Back</button>
          <button className="add-btn-final" onClick={() => setSubView("main")} disabled={pendingRemoved.length === 0} style={{ backgroundColor: pendingRemoved.length > 0 ? "#d90d0d" : "var(--surface-3)", color: pendingRemoved.length > 0 ? "#fff" : "var(--text-muted)" }}>Confirm Remove ✕</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>×</button>
        <div className="modal-header">
          {item.image && <img src={getImageUrl(item.image)} alt={item.name} />}
          <h2>{item.name}</h2>{item.description && <p>{item.description}</p>}
        </div>
        <div className="modal-actions">
          <button className="menu-action-btn notes-btn" onClick={() => setSubView("note")}>📝 {pendingNote ? "Edit Note" : "Add Note"}</button>
          {!["Beverages", "Appetizers", "Dips"].includes(item.category) && (
            <button className="menu-action-btn remove-btn" onClick={() => setSubView("remove")}>✕ {pendingRemoved.length > 0 ? "Edit Remove" : "Remove Ingredients"}</button>
          )}
        </div>
        <div className="modal-scroll-area">
          {itemExtras.length > 0 && <div className="extras-section"><h3>Customize Your Order</h3><div className="extra-group"><div className="extra-group-title">Add Extras</div>
            {itemExtras.map(x => (<label key={x.id} className="extra-label"><div className="extra-info"><input type="checkbox" checked={selectedExtras.some(e => e.id === x.id)} onChange={() => toggleExtra(x)} /><span>{x.name}</span></div><span className="extra-price">+${Number(x.price).toFixed(2)}</span></label>))}
          </div></div>}
        </div>
        <div className="modal-footer"><button className="add-btn-final" onClick={handleSave}>Save Changes — ${modalPrice.toFixed(2)}</button></div>
      </div>
    </div>
  );
}

// ============================================================================
// JOIN POPUP
// ============================================================================
function JoinPopup({ orderId, tableId, orderTotal, onJoined }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) { setErr("Please enter your name"); return; }
    if (!phone.trim()) { setErr("Please enter your phone number"); return; }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/split/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), joined_at: new Date().toISOString() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      socket.emit("split:join", { orderId, participant: { id: data.participantId, name: name.trim(), phone: phone.trim(), joined_at: new Date().toISOString(), amount: 0, paid: false } });
      onJoined({ id: data.participantId, name: name.trim(), phone: phone.trim() });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "360px", background: "var(--surface,#fff)", borderRadius: "20px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 16px 48px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: "2px solid #FFC20E", background: "linear-gradient(135deg,#fffde7,#fff8e1)", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "6px" }}>👥</div>
          <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "900", color: "#111827" }}>Join Split Payment</h3>
          <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#6b7280" }}>Table #{tableId} — Order #{orderId}</p>
          {orderTotal > 0 && <div style={{ display: "inline-block", padding: "5px 14px", borderRadius: "99px", background: "rgba(255,194,14,0.18)", color: "#92400e", fontSize: "12px", fontWeight: "800", border: "1px solid rgba(255,194,14,0.35)" }}>Order Total: ${Number(orderTotal).toFixed(2)}</div>}
        </div>
        <form onSubmit={submit} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <input type="text" placeholder="Your Full Name" value={name} onChange={e => setName(e.target.value)} className="glass-input-main" style={{ background: "#f8f9fa", color: "#111827", border: "1px solid rgba(0,0,0,0.12)" }} autoComplete="name" autoFocus />
          <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="glass-input-main" style={{ background: "#f8f9fa", color: "#111827", border: "1px solid rgba(0,0,0,0.12)" }} autoComplete="tel" />
          {err && <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600", padding: "8px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>⚠️ {err}</div>}
          <button type="submit" disabled={busy} style={{ padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#FFC20E,#ff9f0a)", color: "#000", fontWeight: "900", fontSize: "14px", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, boxShadow: "0 4px 14px rgba(255,194,14,0.35)" }}>
            {busy ? "Joining..." : "✓ JOIN SESSION"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CHECKOUT COMPONENT
// ============================================================================
function Checkout({ setCart }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlOrderId = searchParams.get("orderId");
  const { orderId: stateOrderId, cartItems: stateCartItems = [], tableId: stateTableId = "1" } = location.state || {};
  const activeOrderId = stateOrderId || urlOrderId;
  const isScanner = !!(urlOrderId && searchParams.get("mode") === "add");

  const { isDark } = useTheme();

  const [showJoinPopup, setShowJoinPopup] = useState(isScanner);
  const [scannerIdentity, setScannerIdentity] = useState(null);
  const [orderedItems, setOrderedItems] = useState(stateCartItems);
  const [tableId, setTableId] = useState(stateTableId);
  const [serverTotal, setServerTotal] = useState(0);
  const [step, setStep] = useState(isScanner ? "payment" : (stateOrderId ? "payment" : "waiting"));
  const [payers, setPayers] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showCardGateway, setShowCardGateway] = useState(false);
  const [activeCardPayer, setActiveCardPayer] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [tipCurrency, setTipCurrency] = useState("USD");
  const [tipCustomInput, setTipCustomInput] = useState("");
  const [tipPreset, setTipPreset] = useState(null);

  const ignoreUpdatesUntil = useRef(0);
  const syncTimerRef = useRef(null);
  const tableKey = `userId_table_${activeOrderId || 'default'}`;
  const myUserId = useRef(localStorage.getItem(tableKey));
  if (!myUserId.current) { myUserId.current = Date.now().toString(); localStorage.setItem(tableKey, myUserId.current); }

  // Calculate base total
  const rawSub = (orderedItems || []).reduce((a, i) => a + Number(i.price || i.price_at_time || 0) * (i.quantity || 1), 0);
  const base = serverTotal > 0 ? serverTotal : rawSub * 1.11;
  const subtot = base / 1.11;
  const vat = base - subtot;

  // Helper: Sanitize input
  const san = r => r.replace(/[^0-9.]/g, "").replace(/(\..*)\./, "$1");

  // Helper: Block non-numeric keys
  const bk = e => {
    const ok = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Enter", "Home", "End"];
    if (ok.includes(e.key) || /^[0-9.]$/.test(e.key)) return;
    e.preventDefault();
  };

  // Create default payer object
  const dp = id => ({
    id: id || Date.now(),
    name:  localStorage.getItem('guestName')  || "",
    phone: localStorage.getItem('guestPhone') || "",
    amount: 0,
    method: "cash",
    currency: "USD",
    cashHasSplit: false,
    cashSecondAmount: 0,
    transactionId: "",
    paid: false,
    items: [],
    ownerId: myUserId.current,
    tipUSD: 0,
    tipPreset: null,
    tipCurrency: "USD",
  });

  // Convert payer amount to USD
  const pusd = p => {
    if (p.method === "card") return Number(p.amount) || 0;
    const f = p.currency === "USD" ? Number(p.amount) || 0 : (Number(p.amount) || 0) / EXCHANGE_RATE;
    const s = p.cashHasSplit ? (p.currency === "USD" ? (Number(p.cashSecondAmount) || 0) / EXCHANGE_RATE : Number(p.cashSecondAmount) || 0) : 0;
    return f + s;
  };

  // ✅ CORRECT CALCULATION
  // remaining = total - amounts paid (tips ADD to remaining!)
  const totalTips = payers.reduce((a, p) => a + Number(p.tipUSD || 0), 0);
  const total = base + totalTips;  // e.g. $7.77 + $3 = $10.77

  const totalAmountsPaid = payers.reduce((a, p) => a + pusd(p), 0);
  const rem = Math.max(0, total - totalAmountsPaid);  // e.g. $10.77 - $5 = $5.77 ✅

  // Sync payers to database
  const sync = async up => {
    if (!activeOrderId) return;
    const allTips = up.reduce((a, p) => a + Number(p.tipUSD || 0), 0);
    try {
      await ordersService.updateOrderSplits(activeOrderId, { payment_splits: up, tip_amount: allTips });
    } catch (e) {
      console.error(e);
    }
  };

  // Update payer field
  const upd = (id, f, v) => {
    ignoreUpdatesUntil.current = Date.now() + 1000;
    setPayers(prev => {
      const u = prev.map(p => p.id !== id ? p : { ...p, [f]: v });
      socket.emit("split:payers-updated", { orderId: activeOrderId, payers: u });
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => sync(u), 800);
      return u;
    });
  };

  // Set tip for payer
  const setPayerTip = (payerId, v, none = false) => {
    const payer = payers.find(p => p.id === payerId);
    if (!payer) return;
    if (none || payer.tipPreset === v) {
      upd(payerId, "tipUSD", 0);
      upd(payerId, "tipPreset", null);
      return;
    }
    const amt = (payer.tipCurrency || tipCurrency) === "USD" ? v : v / EXCHANGE_RATE;
    upd(payerId, "tipUSD", amt);
    upd(payerId, "tipPreset", v);
  };

  const qrValue = `${window.location.origin}/checkout?orderId=${activeOrderId}&mode=add`;

  // Load order on mount
  useEffect(() => {
    if (!activeOrderId) return;
    ordersService.getOrder(activeOrderId).then(resp => {
      if (!resp?.success) return;
      const o = resp.data?.order || {};
      setOrderedItems(o.items || []);
      setTableId(o.table_id || "1");
      setServerTotal(Number(o.total_price || 0));
      let sp = [];
      try {
        const r = o.payment_splits;
        if (r) {
          const p = typeof r === "string" ? JSON.parse(r) : r;
          sp = Array.isArray(p) ? p : [];
        }
      } catch { }
      setPayers(sp.length > 0 ? sp : [dp(1)]);
      if (isScanner) return;
      const st = (o.status || "").trim().toLowerCase();
      if (st === "paid" || st === "paid-accepted") { setStep("receipt"); return; }
      if (["accepted", "preparing", "ready", "served"].includes(st)) setStep("payment");
    }).catch(console.error);
  }, [activeOrderId]);

  // Socket listeners
  useEffect(() => {
    if (!activeOrderId) return;
    socket.emit("joinOrder", activeOrderId);
    socket.on("split:participant-joined", () => {
      ordersService.getOrder(activeOrderId).then(resp => {
        if (!resp?.success) return;
        const r = resp.data?.order?.payment_splits;
        if (r) {
          try {
            const p = typeof r === "string" ? JSON.parse(r) : r;
            if (Array.isArray(p) && p.length > 0) setPayers(p);
          } catch { }
        }
      });
    });
    socket.on("split:payers-updated", ({ payers: u }) => {
      if (Date.now() < ignoreUpdatesUntil.current) return;
      setPayers(u);
    });
    socket.on("cartUpdated", () => {
      ordersService.getOrder(activeOrderId).then(resp => {
        if (resp?.success) setOrderedItems(resp.data?.order?.items || []);
      });
    });
    return () => {
      socket.off("split:participant-joined");
      socket.off("split:payers-updated");
      socket.off("cartUpdated");
    };
  }, [activeOrderId]);

  // Poll order status
  useEffect(() => {
    if (!["waitingForPayment", "cooking"].includes(step) || !activeOrderId) return;
    const iv = setInterval(async () => {
      try {
        const resp = await ordersService.getOrder(activeOrderId);
        if (!resp?.success) return;
        const st = (resp.data?.order?.status || "").trim().toLowerCase();
        if (st === "paid" || st === "paid-accepted") { clearInterval(iv); setStep("receipt"); return; }
        if (step === "waitingForPayment" && ["paid-accepted", "paid-preparing", "paid-ready"].includes(st)) { clearInterval(iv); setStep("cooking"); return; }
        if (st === "rejected") { clearInterval(iv); setStep("rejected"); }
      } catch { }
    }, 3000);
    return () => clearInterval(iv);
  }, [step, activeOrderId]);

  // Card payment success
  const handleCardSuccess = async txRef => {
    if (!activeCardPayer) return;
    try {
      const r = await fetch(`${API_URL}/api/orders/${activeOrderId}/payment/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: 'card', amount_usd: Number(activeCardPayer.amount || 0), currency: 'USD', payer_name: activeCardPayer.name || 'Guest', payer_phone: activeCardPayer.phone || '000', owner_id: activeCardPayer.ownerId || myUserId.current })
      });
      if (r.ok) {
        const d = await r.json();
        await fetch(`${API_URL}/api/orders/${activeOrderId}/payment/stripe-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: d.payment?.id, stripeChargeId: txRef, stripeIntentId: txRef, cardBrand: 'visa', cardLast4: '4242', receiptUrl: '' })
        });
      }
    } catch (e) {
      console.error(e);
    }
    const u = payers.map(p => p.id === activeCardPayer.id ? { ...p, transactionId: txRef, paid: true } : p);
    setPayers(u);
    sync(u);
    socket.emit("split:payers-updated", { orderId: activeOrderId, payers: u });
    setShowCardGateway(false);
    setActiveCardPayer(null);
    socket.emit("orderPaymentSubmitted", activeOrderId);
    setStep("waitingForPayment");
  };

  // Confirm payment
  const handleConfirm = async e => {
    e.preventDefault();
    if (payers.some(p => p.paid === true)) {
      socket.emit("orderPaymentSubmitted", activeOrderId);
      setStep("waitingForPayment");
      return;
    }
    const toVal = isScanner
      ? payers.filter(p => scannerIdentity && (p.id === scannerIdentity.id || p.name === scannerIdentity.name))
      : payers.filter(p => p.ownerId === myUserId.current);
    for (const p of toVal) {
      if (!p.name || !p.phone) { alert("Please enter name and phone number"); return; }
      if (Number(p.amount || 0) <= 0) { alert("Please enter the amount you're paying"); return; }
    }
    setLoading(true);
    try {
      for (const p of toVal) {
        const r = await fetch(`${API_URL}/api/orders/${activeOrderId}/payment/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: (p.method || 'cash').toLowerCase(), amount_usd: Number(p.amount || 0), currency: p.currency || 'USD', payer_name: p.name.trim(), payer_phone: p.phone.trim(), owner_id: p.ownerId || myUserId.current })
        });
        if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || `Error ${r.status}`); }
      }
      socket.emit("split:payers-updated", { orderId: activeOrderId, payers });
      socket.emit("orderPaymentSubmitted", activeOrderId);
      setStep("waitingForPayment");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = u => {
    setOrderedItems(orderedItems.map((it, i) => i === editingIndex ? { ...it, ...u } : it));
    setEditingItem(null);
    setEditingIndex(null);
  };
   useEffect(() => {
    if (step === "receipt") {
      endSession();
    }
  }, [step]);

  // ========== WAITING SCREEN ==========
  if (step === "waiting" || step === "waitingForPayment" || step === "cooking") return (
    <div className="checkout-page">
      <div className="overlay" style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div className="info-form-card" style={{ padding: "50px", maxWidth: "420px" }}>
          <img src={logo} alt="Logo" width="160" style={{ marginBottom: "20px" }} />
          <h2>{step === "waiting" ? "KITCHEN IS COOKING 👨‍🍳" : step === "cooking" ? "ORDER CONFIRMED — BEING PREPARED 🔥" : "WAITING FOR ADMIN 💰"}</h2>
          <div className="loader-line"></div>
        </div>
      </div>
    </div>
  );

  // ========== PAYMENT SCREEN ==========
  if (step === "payment") {
    const named = payers.filter(p => p.name);
    const myPs = isScanner
      ? payers.filter(p => scannerIdentity && (p.id === scannerIdentity.id || p.name === scannerIdentity.name))
      : payers.filter(p => p.ownerId === myUserId.current).length > 0
        ? payers.filter(p => p.ownerId === myUserId.current)
        : payers.filter(p => !p.ownerId).length > 0
          ? payers.filter(p => !p.ownerId)
          : [payers[0]].filter(Boolean);
    const tpArr = tipCurrency === "USD" ? [1, 2, 3] : [100000, 150000, 200000];

    return (
      <>
        <div className="checkout-page">
          {isScanner && showJoinPopup && (
            <JoinPopup orderId={activeOrderId} tableId={tableId} orderTotal={base}
              onJoined={id => {
                setScannerIdentity(id);
                setShowJoinPopup(false);
                setPayers(prev => {
                  const a = prev.find(p => p.id === id.id || p.name === id.name);
                  if (a) return prev;
                  return [...prev, { ...dp(id.id), id: id.id, name: id.name, phone: id.phone }];
                });
              }}
            />
          )}

          {showCardGateway && activeCardPayer && (
            <div className="co-card-gateway-overlay">
              <div className="co-card-gateway-box">
                {!activeOrderId
                  ? <div style={{ color: '#f87171', padding: 16, textAlign: 'center' }}>⚠️ Order not found. Please refresh.</div>
                  : <PaymentGateway amount={Number(activeCardPayer.amount || 0)} orderId={activeOrderId} onSuccess={handleCardSuccess} onCancel={() => { setShowCardGateway(false); setActiveCardPayer(null); }} />
                }
              </div>
            </div>
          )}

          {showQR && (
            <div className="qr-popup-overlay">
              <div className="qr-popup-content">
                <h3 style={{ color: "var(--co-text,#111)", marginTop: 0, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "2px", fontSize: "22px" }}>Scan to Join</h3>
                <p style={{ fontSize: "12px", color: "var(--co-muted)", margin: "-10px 0 0" }}>Table #{tableId} · {named.length} participant{named.length !== 1 ? "s" : ""}</p>
                <QRCodeCanvas value={qrValue} size={200} />
                <button onClick={() => setShowQR(false)}>DONE</button>
              </div>
            </div>
          )}

          <div className="overlay">
            <div className="co-shell">
              {editingItem && <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveItem} />}

              <div className="co-card">
                <div className="co-card-head" style={{ padding: "22px 22px 0" }}>
                  <div className="co-title">💳 Payment</div>
                  <div className="co-sub">Order #{activeOrderId} · Table #{tableId}</div>
                </div>

                <div className="co-block">
                  <div className="co-block-label">📋 Order Items</div>
                  {(orderedItems || []).map((item, i) => {
                    const ex = Array.isArray(item.selectedExtras) ? item.selectedExtras : Array.isArray(item.selected_extras) ? item.selected_extras : [];
                    const rm = Array.isArray(item.removedExtras) ? item.removedExtras : Array.isArray(item.removed_extras) ? item.removed_extras : [];
                    const note = item.specialNote || item.special_note || "";
                    const et = ex.reduce((s, e) => s + Number(e.price || 0), 0);
                    const lt = (Number(item.price || item.price_at_time || 0) + et) * (item.quantity || 1);
                    return (
                      <div key={i} className="co-oi">
                        <div style={{ flex: 1 }}>
                          <div className="co-oi-name">{item.quantity || 1}× {item.name}</div>
                          {ex.length > 0 && <div className="co-oi-add">➕ {ex.map(e => e.name || e).join(", ")}</div>}
                          {rm.length > 0 && <div className="co-oi-rem">✕ No {rm.map(e => e.name || e).join(", ")}</div>}
                          {note && <div className="co-oi-note">📝 {note}</div>}
                        </div>
                        <div className="co-oi-price">${lt.toFixed(2)}</div>
                      </div>
                    );
                  })}
                  <div className="co-totals">
                    <div className="co-tr"><span>Subtotal</span><span>${subtot.toFixed(2)}</span></div>
                    <div className="co-tr"><span>VAT (11%)</span><span>${vat.toFixed(2)}</span></div>
                    {totalTips > 0 && <div className="co-tr tip"><span>Tips (all)</span><span>+${totalTips.toFixed(2)}</span></div>}
                    <div className="co-tr grand"><span>Total</span><span>${total.toFixed(2)}</span></div>
                  </div>
                </div>

                {named.length > 0 && (
                  <div className="co-block">
                    <div className="co-block-label">👥 Split — {named.length} participant{named.length !== 1 ? "s" : ""}</div>
                    {named.map((p, i) => {
                      const me = isScanner
                        ? (scannerIdentity && (p.id === scannerIdentity.id || p.name === scannerIdentity.name))
                        : p.ownerId === myUserId.current;
                      const pTip = Number(p.tipUSD || 0);
                      // ✅ FIX #1: REMOVED + pTip from pTotal calculation
                      const pTotal = pusd(p);
                      return (
                        <div key={p.id || i} className={`co-pp ${me ? "me" : ""}`}>
                          <div className="co-pp-left">
                            <div className={`co-av ${me ? "" : "other"}`}>{(p.name || "?")[0].toUpperCase()}</div>
                            <div>
                              <div className="co-pp-name">
                                {p.paid ? "✓ " : ""}{p.name}
                                {me && <span className="co-you-pill">you</span>}
                              </div>
                              {p.phone && <div className="co-pp-phone">📞 {p.phone}</div>}
                              {pTip > 0 && (
                                <div style={{ fontSize: "11px", color: "var(--co-green-deep,#4a7c00)", fontWeight: "700", marginTop: "2px" }}>
                                  🙏 Tip: +${pTip.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {pTotal > 0 && <div className="co-pp-amt">${pTotal.toFixed(2)}</div>}
                            {p.paid && <div className="co-pp-paid">PAID</div>}
                          </div>
                        </div>
                      );
                    })}
                    <div className={`co-rem-pill ${rem >= 0.01 && named.some(p => pusd(p) > 0) ? "unpaid" : ""}`}>
                      <span>Remaining</span>
                      <span>{rem < 0.01 ? "✅ Fully Covered" : `$${rem.toFixed(2)}`}</span>
                      {rem >= 0.01 && <div style={{ fontSize: "10px", color: "var(--co-muted)", marginTop: "4px" }}>{Math.round(rem * EXCHANGE_RATE).toLocaleString()} LBP</div>}
                    </div>
                  </div>
                )}

                <div className="co-section-head" style={{ paddingTop: "4px" }}>
                  💰 {isScanner ? "Your Payment" : "Who's Paying?"}
                </div>

                {myPs.map(payer => {
                  const mine = isScanner
                    ? (scannerIdentity && (payer.id === scannerIdentity.id || payer.name === scannerIdentity.name))
                    : payer.ownerId === myUserId.current;
                  const sec = payer.currency === "USD" ? "LBP" : "USD";
                  const myTipArr = (payer.tipCurrency || tipCurrency) === "USD" ? [1, 2, 3] : [100000, 150000, 200000];

                  return (
                    <div key={payer.id} className="payer-card payer-mine">
                      <input type="text" placeholder="Name" value={payer.name || ""} onChange={e => upd(payer.id, "name", e.target.value)} className="glass-input-main" disabled={isScanner} />
                      <input type="tel" placeholder="Phone" value={payer.phone || ""} onChange={e => upd(payer.id, "phone", e.target.value)} className="glass-input-main" disabled={isScanner} />

                      <div className="method-btn-group">
                        {[{ id: "cash", label: "💵 Cash" }, { id: "card", label: "💳 Card" }].map(m => (
                          <button key={m.id} type="button" className={`method-btn ${payer.method === m.id ? "active" : ""}`} onClick={() => upd(payer.id, "method", m.id)}>{m.label}</button>
                        ))}
                      </div>

                      {payer.method === "cash" && (
                        <div className="cash-extras-wrapper">
                          <div className="cash-amount-row">
                            <input type="text" inputMode="decimal" placeholder="Your share (bill only)" className="glass-input-small cash-amount-input" value={payer.amount || ""} disabled={!mine} onKeyDown={bk} onChange={e => upd(payer.id, "amount", san(e.target.value))} />
                            <div className="cash-currency-toggle">
                              {["USD", "LBP"].map(c => (<button key={c} type="button" className={`cc-btn ${payer.currency === c ? "active" : ""}`} onClick={() => mine && upd(payer.id, "currency", c)}>{c}</button>))}
                            </div>
                            {mine && !payer.cashHasSplit && (
                              <button type="button" onClick={() => upd(payer.id, "cashHasSplit", true)} style={{ marginLeft: "8px", width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--co-acc-border,rgba(255,194,14,0.4))", background: "var(--co-acc-soft,rgba(255,194,14,0.1))", color: "var(--co-acc,#FFC20E)", fontSize: "20px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                            )}
                          </div>

                          {payer.cashHasSplit && (
                            <div style={{ marginTop: "10px" }}>
                              <div style={{ fontSize: "11px", color: "var(--co-muted,#888)", letterSpacing: "0.8px", marginBottom: "6px", textTransform: "uppercase" }}>+ Also paying in {sec}</div>
                              <div className="cash-amount-row">
                                <input type="text" inputMode="decimal" placeholder="0" className="glass-input-small cash-amount-input" value={payer.cashSecondAmount || ""} disabled={!mine} onKeyDown={bk} onChange={e => upd(payer.id, "cashSecondAmount", san(e.target.value))} />
                                <div className="cash-currency-toggle"><button type="button" className="cc-btn active" style={{ pointerEvents: "none" }}>{sec}</button></div>
                                {mine && <button type="button" onClick={() => { upd(payer.id, "cashHasSplit", false); upd(payer.id, "cashSecondAmount", 0); }} style={{ marginLeft: "8px", width: "36px", height: "36px", borderRadius: "50%", border: "1px solid rgba(255,80,80,0.4)", background: "rgba(255,80,80,0.1)", color: "#ff6b6b", fontSize: "20px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>}
                              </div>
                            </div>
                          )}

                          {mine && named.length > 1 && (
                            <div className="co-quick">
                              <button type="button" onClick={() => { upd(payer.id, "currency", "USD"); upd(payer.id, "amount", (base / named.length).toFixed(2)); }}>Split evenly</button>
                            </div>
                          )}

                          {!isScanner && myPs.indexOf(payer) === 0 && (
                            <button type="button" className="co-share" style={{ marginTop: "10px", width: "100%" }} onClick={() => setShowQR(true)}>
                              📲 Share split link (👥 {named.length} joined)
                            </button>
                          )}
                        </div>
                      )}

                      {payer.method === "card" && (
                        <div className="co-cardbox">
                          <div className="co-cardbox-head">
                            <div><div className="t">Credit / Debit Card</div><div className="d">Visa · Mastercard · AMEX</div></div>
                            <div className="co-secured">SECURED</div>
                          </div>
                          {mine && (
                            <>
                              <input type="text" inputMode="decimal" placeholder="Your share (bill only)" className="glass-input-main" value={payer.amount || ""} onKeyDown={bk} onChange={e => upd(payer.id, "amount", san(e.target.value))} />
                              {!payer.paid
                                ? <button type="button" onMouseDown={e => e.preventDefault()} onClick={e => { e.preventDefault(); e.stopPropagation(); if (!payer.amount || Number(payer.amount) <= 0) { alert("Please enter a valid amount"); return; } setActiveCardPayer(payer); setShowCardGateway(true); }} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#FFC20E,#ff9f0a)", color: "#000", fontWeight: "900", fontSize: "13px", letterSpacing: "2px", cursor: "pointer", marginTop: "4px" }}>
                                  PAY NOW 💳
                                </button>
                                : <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "12px", padding: "12px", textAlign: "center", color: "#10b981", fontWeight: "800", marginTop: "4px" }}>✓ PAYMENT COMPLETED</div>
                              }
                              {payer.transactionId && <div style={{ marginTop: "8px", textAlign: "center", color: "var(--co-muted)", fontSize: "11px" }}>Ref: {payer.transactionId}</div>}
                            </>
                          )}
                          {!mine && <div style={{ textAlign: "center", padding: "16px", color: "var(--co-muted)" }}>💳 {payer.name || "Guest"} will pay ${Number(payer.amount || 0).toFixed(2)}{payer.paid && <div style={{ marginTop: "6px", color: "#10b981" }}>✓ Payment completed</div>}</div>}

                          {!isScanner && myPs.indexOf(payer) === 0 && (
                            <button type="button" className="co-share" style={{ marginTop: "10px", width: "100%" }} onClick={() => setShowQR(true)}>
                              📲 Share split link (👥 {named.length} joined)
                            </button>
                          )}
                        </div>
                      )}

                      {/* ✅ FIX #2: REMOVED + Number(payer.tipUSD || 0) from Paying line */}
                      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--co-muted)" }}>
                        <span>Paying:</span><b style={{ color: "var(--co-text)" }}>${pusd(payer).toFixed(2)}</b>
                      </div>

                      <div className="co-tip" style={{ marginTop: "12px", marginLeft: 0, marginRight: 0 }}>
                        <div className="co-tip-head">
                          <div>
                            <div className="t">🙏 Leave a tip</div>
                            <div className="d" style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "600" }}>⚠️ Added on top of payment amount</div>
                          </div>
                          <div className="cash-currency-toggle">
                            {["USD", "LBP"].map(c => (
                              <button key={c} type="button"
                                className={`cc-btn ${(payer.tipCurrency || tipCurrency) === c ? "active" : ""}`}
                                onClick={() => {
                                  upd(payer.id, "tipCurrency", c);
                                  upd(payer.id, "tipUSD", 0);
                                  upd(payer.id, "tipPreset", null);
                                }}>
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="co-tip-grid">
                          {myTipArr.map(v => {
                            const label = (payer.tipCurrency || tipCurrency) === "USD" ? `$${v}` : `${(v / 1000).toFixed(0)}k`;
                            return (
                              <button key={v} type="button"
                                className={payer.tipPreset === v ? "active" : ""}
                                onClick={() => setPayerTip(payer.id, v)}>
                                {label}
                              </button>
                            );
                          })}
                          <button type="button"
                            className={payer.tipPreset === "other" ? "active" : ""}
                            onClick={() => {
                              upd(payer.id, "tipPreset", "other");
                              upd(payer.id, "tipUSD", 0);
                            }}>
                            Other
                          </button>
                        </div>
                        {payer.tipPreset === "other" && (
                          <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--co-muted)", flexShrink: 0 }}>
                              {(payer.tipCurrency || tipCurrency) === "USD" ? "$" : "LBP"}
                            </span>
                            <input
                              type="text" inputMode="decimal"
                              placeholder="Enter amount"
                              className="glass-input-main"
                              style={{ margin: 0, flex: 1 }}
                              value={payer.tipCustomInput || ""}
                              onKeyDown={bk}
                              onChange={e => {
                                const v = san(e.target.value);
                                upd(payer.id, "tipCustomInput", v);
                                const amt = (payer.tipCurrency || tipCurrency) === "USD" ? Number(v) || 0 : (Number(v) || 0) / EXCHANGE_RATE;
                                upd(payer.id, "tipUSD", amt);
                              }}
                            />
                          </div>
                        )}
                        {Number(payer.tipUSD || 0) > 0 && (
                          <div className="co-tip-added">
                            <span>Tip added:</span>
                            <b>+${Number(payer.tipUSD).toFixed(2)}</b>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div style={{ height: "90px" }} />
              </div>
            </div>
          </div>
        </div>

        {createPortal(
          <div className="co-paybar">
            <div className="co-paybar-inner">
              <div className="co-paybar-due">
                <div className="k">Remaining</div>
                <div className={`v ${rem < 0.01 ? "covered" : ""}`}>{rem < 0.01 ? "✅ Covered" : "$" + rem.toFixed(2)}</div>
                {rem > 0.01 && <div className="lbp">{Math.round(rem * EXCHANGE_RATE).toLocaleString()} LBP</div>}
              </div>
              <button className="co-confirm-btn" disabled={loading || (!isScanner && rem > 0.5)} onClick={handleConfirm}>
                {loading ? "Confirming..." : isScanner ? "Submit 💰" : "Confirm 💳"}
              </button>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // ========== RECEIPT SCREEN ==========
  if (step === "receipt") {
    const rs = base / 1.11;
    const rv = base - rs;
    return (
      <div className="checkout-page">
        <div className="overlay" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "60px", paddingBottom: "60px", minHeight: "100vh", overflowY: "auto" }}>
          <div className="receipt-paper" style={{ maxWidth: "420px", width: "85%", margin: "0 auto" }}>
            <img src={logo} alt="Logo" className="receipt-logo-bw" />
            <div className="receipt-branch-info"><h1>Snack Attack</h1><h3>Hamra - Bliss Street</h3><p>Tel: 03 231 506</p></div>
            <div className="receipt-header-info"><p><strong>Order #:</strong> {activeOrderId}</p><p><strong>Table:</strong> #{tableId}</p><p><strong>Date:</strong> {new Date().toLocaleDateString()}</p></div>
            <div className="receipt-divider">-------------------------------------------</div>
            <div className="receipt-items">
              {orderedItems.map((item, idx) => {
                const bp = Number(item.price || item.price_at_time || 0);
                const ex = Array.isArray(item.selectedExtras) ? item.selectedExtras : Array.isArray(item.selected_extras) ? item.selected_extras : [];
                const rm = Array.isArray(item.removedExtras) ? item.removedExtras : Array.isArray(item.removed_extras) ? item.removed_extras : [];
                const note = item.specialNote || item.special_note || '';
                const et = ex.reduce((s, e) => s + Number(e.price || 0), 0);
                const lt = (bp + et) * (item.quantity || 1);
                return (<div key={idx} className="r-item-container">
                  <div className="r-item-row"><span>{item.quantity}x {item.name}</span><span>${lt.toFixed(2)}</span></div>
                  {ex.length > 0 && <div className="r-extras" style={{ color: '#FFC20E', fontSize: '11px' }}>➕ {ex.map(e => e.name || e).join(', ')}</div>}
                  {rm.length > 0 && <div className="r-extras" style={{ color: '#ff6b6b', fontSize: '11px' }}>✕ No {rm.map(e => e.name || e).join(', ')}</div>}
                  {note && <div className="r-extras" style={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>📝 {note}</div>}
                </div>);
              })}
            </div>
            <div className="receipt-divider">-------------------------------------------</div>
            <div className="receipt-summary">
              <div className="r-summary-line"><span>Subtotal:</span><span>${rs.toFixed(2)}</span></div>
              <div className="r-summary-line"><span>VAT (11%):</span><span>${rv.toFixed(2)}</span></div>
              {totalTips > 0 && <div className="r-summary-line" style={{ color: "#FFC20E" }}><span>Tips:</span><span>+${totalTips.toFixed(2)}</span></div>}
              <div className="receipt-total-row"><span>TOTAL:</span><span>${total.toFixed(2)}</span></div>
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

  // ========== REJECTED SCREEN ==========
  if (step === "rejected") return (
    <div className="checkout-page">
      <div className="overlay" style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div className="info-form-card" style={{ padding: "50px", maxWidth: "420px" }}>
          <h2>❌ ORDER REJECTED</h2>
          <button onClick={() => window.location.href = "/"} className="back-btn-new" style={{ marginTop: "20px" }}>Go Back</button>
        </div>
      </div>
    </div>
  );

  return null;
}

export default Checkout;