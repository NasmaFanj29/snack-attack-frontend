import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import logo from "../assets/logo.png";
import '../style/checkout.css';
import { QRCodeCanvas } from "qrcode.react";
import socket from "../socket";
import useTheme from '../hooks/useTheme';

const BACKEND = "https://snack-attack-backend.onrender.com";
const WHISH_NUMBER = "+961 XX XXX XXX";
const EXCHANGE_RATE = 89500;

const generateWhishCode = () => Math.floor(100 + Math.random() * 900).toString();

// ── Inline Edit Modal ─────────────────────────────────────────────
function EditItemModal({ item, onClose, onSave }) {
  const [selectedExtras, setSelectedExtras] = useState(
    Array.isArray(item.selectedExtras) ? item.selectedExtras : []
  );
  const [pendingNote, setPendingNote]           = useState(item.specialNote || item.special_note || "");
  const [pendingRemoved, setPendingRemoved]     = useState(
    Array.isArray(item.removedExtras) ? item.removedExtras : []
  );
  const [itemExtras, setItemExtras]             = useState([]);
  const [removableExtras, setRemovableExtras]   = useState([]);
  const [subView, setSubView]                   = useState("main"); // main | note | remove

  const REMOVE_IDS = {
    "Burgers":     [1,2,3,4,5,8,9,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,31,32,35,36,37],
    "Salad":       [1,7,10,11,12,25,26,27,28,29,30,31,32,33,34,35,37],
    "Sandwiches":  [1,2,3,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,31,32,35,36,37],
  };

  useEffect(() => {
    if (!item.id && !item.item_id && !item.databaseId) return;
    const id = item.databaseId || item.item_id || item.id;
    axios.get(`${BACKEND}/item-extras/${id}`)
      .then(res => {
        const all = res.data || [];
        setItemExtras(all);
        const ids = REMOVE_IDS[item.category] || [];
        setRemovableExtras(all.filter(e => ids.includes(e.id)));
      })
      .catch(() => { setItemExtras([]); setRemovableExtras([]); });
  }, []);

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const toggleRemove = (extra) => {
    setPendingRemoved(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const modalPrice = Number(item.price || 0) +
    selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0);

  const handleSave = () => {
    onSave({
      ...item,
      selectedExtras,
      removedExtras: pendingRemoved,
      specialNote:   pendingNote || null,
    });
  };

  // ── Sub-view: Note ──
  if (subView === "note") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={() => setSubView("main")}>×</button>
        <div className="modal-header">
          <h2>Special Instructions</h2>
          <p style={{ color:"#666", fontSize:"14px" }}>For {item.name}</p>
        </div>
        <div className="modal-scroll-area">
          <textarea
            className="notes-textarea"
            placeholder="e.g., Cut in half, No onions..."
            value={pendingNote}
            onChange={e => setPendingNote(e.target.value)}
            rows="5"
          />
        </div>
        <div className="modal-footer" style={{ display:"flex", gap:"8px" }}>
          <button className="add-btn-final"
            style={{ background:"var(--surface-3)", color:"var(--text-muted)", flex:"0 0 auto", width:"auto", padding:"16px 20px" }}
            onClick={() => setSubView("main")}
          >← Back</button>
          <button className="add-btn-final" onClick={() => setSubView("main")} disabled={!pendingNote.trim()}>
            Save Note ✓
          </button>
        </div>
      </div>
    </div>
  );

  // ── Sub-view: Remove ──
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
                        onChange={() => toggleRemove(extra)}
                      />
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
            onClick={() => setSubView("main")}
          >← Back</button>
          <button className="add-btn-final"
            onClick={() => setSubView("main")}
            disabled={pendingRemoved.length === 0}
            style={{ backgroundColor: pendingRemoved.length > 0 ? "#d90d0d" : "var(--surface-3)", color: pendingRemoved.length > 0 ? "#fff" : "var(--text-muted)" }}
          >Confirm Remove ✕</button>
        </div>
      </div>
    </div>
  );

  // ── Main customize view ──
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>×</button>

        <div className="modal-header">
          {item.image && (
            <img src={`${BACKEND}/images/${item.image}`} alt={item.name} />
          )}
          <h2>{item.name}</h2>
          {item.description && <p>{item.description}</p>}
        </div>

        {/* Action buttons */}
        <div className="modal-actions">
          <button
            className="menu-action-btn notes-btn"
            onClick={() => setSubView("note")}
          >
            📝 {pendingNote ? "Edit Note" : "Add Note"}
          </button>
          {!["Beverages","Appetizers","Dips"].includes(item.category) && (
            <button
              className="menu-action-btn remove-btn"
              onClick={() => setSubView("remove")}
            >
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

        {/* Extras */}
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
                        onChange={() => toggleExtra(extra)}
                      />
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

// ─────────────────────────────────────────────────────────────────
function Checkout({ setCart }) {
  const location       = useLocation();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const urlOrderId  = searchParams.get('orderId');
  const { orderId: stateOrderId, cartItems: stateCartItems = [], tableId: stateTableId = "1" } = location.state || {};
  const { isDark }  = useTheme();
  const activeOrderId = stateOrderId || urlOrderId;
  const isScanner     = !!(urlOrderId && searchParams.get("mode") === "add");

  const [orderedItems, setOrderedItems] = useState(stateCartItems);
  const [tableId,      setTableId]      = useState(stateTableId);
  const [step,         setStep]         = useState("waiting");
  const [payers,       setPayers]       = useState([]);
  const [showQR,       setShowQR]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [txIdSubmitted,setTxIdSubmitted]= useState(false);

  // ── Edit modal state ──
  const [editingItem,  setEditingItem]  = useState(null);  // item object | null
  const [editingIndex, setEditingIndex] = useState(null);  // index in orderedItems

  const myPayerIdRef       = useRef(null);
  const ignoreUpdatesUntil = useRef(0);
  const syncTimerRef       = useRef(null);
  const cartClearedRef     = useRef(false);
  const myUserId           = useRef(localStorage.getItem("userId"));
  if (!myUserId.current) {
    myUserId.current = Date.now().toString();
    localStorage.setItem("userId", myUserId.current);
  }

  const isEditing = () => Date.now() < ignoreUpdatesUntil.current;

  const subtotal    = (orderedItems || []).reduce((acc, item) => acc + (Number(item.price || item.price_at_time || 0) * (item.quantity || 1)), 0);
  const totalVAT    = subtotal * 0.11;
  const finalTotal  = subtotal + totalVAT;
  const totalPaidSoFar   = payers.reduce((acc, p) => acc + getPayerUsdTotal(p), 0);
  const remainingBalance = finalTotal - totalPaidSoFar;
  const qrValue          = `${window.location.origin}/checkout?orderId=${activeOrderId}&mode=add`;

  function getPayerUsdTotal(payer) {
    if (payer.method === 'card') return Number(payer.amount) || 0;
    let total = 0;
    const first  = Number(payer.amount) || 0;
    const second = Number(payer.cashSecondAmount) || 0;
    const secondCurrency = payer.currency === 'USD' ? 'LBP' : 'USD';
    total += payer.currency === 'USD' ? first : first / EXCHANGE_RATE;
    if (payer.cashHasSplit) total += secondCurrency === 'USD' ? second : second / EXCHANGE_RATE;
    return total;
  }

  const defaultPayer = (id) => ({
    id: id || Date.now(), name: "", phone: "", amount: 0,
    method: "cash", currency: "USD", cashHasSplit: false,
    cashSecondAmount: 0, whishCode: null, whishConfirmed: false,
    transactionId: "", txIdRequested: false, ownerId: myUserId.current,
  });

  const syncPayersToBackend = async (updatedPayers) => {
    if (!activeOrderId) return;
    try {
      await axios.put(`${BACKEND}/admin/orders/${activeOrderId}/status`, {
        payment_splits: updatedPayers, replace_splits: true
      });
    } catch (err) { console.error("Sync error:", err); }
  };

  // ── Handle saving edited item ──
  const handleSaveEditedItem = async (updatedItem) => {
    const newItems = orderedItems.map((it, idx) =>
      idx === editingIndex ? { ...it, ...updatedItem } : it
    );
    setOrderedItems(newItems);
    setEditingItem(null);
    setEditingIndex(null);
    // Sync to backend
    try {
      await axios.put(`${BACKEND}/admin/orders/${activeOrderId}/status`, {
        items: newItems
      });
    } catch (err) { console.error("Error updating item:", err); }
  };

  useEffect(() => {
    if (step === "receipt" && !cartClearedRef.current) {
      cartClearedRef.current = true;
      if (setCart) setCart([]);
      try { localStorage.removeItem('cart'); localStorage.removeItem('cartItems'); } catch {}
    }
  }, [step, setCart]);

  useEffect(() => {
    if (!activeOrderId) return;
    axios.get(`${BACKEND}/orders/${activeOrderId}`)
      .then(res => {
        setOrderedItems(res.data.items || []);
        setTableId(res.data.order?.table_id || "1");
        let existingSplits = [];
        try {
          const raw = res.data.order?.payment_splits;
          if (raw) {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            existingSplits = Array.isArray(parsed) ? parsed : [];
          }
        } catch { existingSplits = []; }
        const status = res.data.order?.status?.toLowerCase();
        if (status === "paid") { setStep("receipt"); return; }
        if (status === "rejected") { setStep("rejected"); return; }
        if (status === "paymentpending") setStep("waitingForPayment");
        else if (["paid-accepted","paid-preparing","paid-ready"].includes(status)) setStep("receipt");
        else if (["accepted","preparing","ready","served"].includes(status)) setStep("payment");
        if (isScanner) {
          const newId = Date.now();
          myPayerIdRef.current = newId;
          const myRow  = defaultPayer(newId);
          const merged = [...existingSplits, myRow];
          setPayers(merged);
          syncPayersToBackend(merged);
          setStep("payment"); return;
        }
        if (existingSplits.length > 0) {
          setPayers(existingSplits.map(p => ({ ...defaultPayer(), ...p, ownerId: p.ownerId || "legacy", cashHasSplit: p.cashHasSplit || false, cashSecondAmount: p.cashSecondAmount || 0 })));
        } else {
          setPayers([defaultPayer(1)]);
        }
      })
      .catch(console.error);
  }, [activeOrderId]);

  useEffect(() => {
    if (!activeOrderId) return;
    socket.emit("joinOrder", activeOrderId);
    socket.on("cartUpdated", () => {
      axios.get(`${BACKEND}/orders/${activeOrderId}`)
        .then(res => setOrderedItems(res.data.items || []))
        .catch(() => {});
    });
    return () => { socket.off("cartUpdated"); };
  }, [activeOrderId]);

  useEffect(() => {
    if (!activeOrderId) return;
    const interval = setInterval(async () => {
      try {
        const res    = await axios.get(`${BACKEND}/orders/${activeOrderId}`);
        const status = (res.data.order?.status || "").trim().toLowerCase();
        if (status === "paid") { setStep("receipt"); return; }
        if (status === "rejected") { setStep("rejected"); return; }
        if (status === "paymentpending") setStep("waitingForPayment");
        else if (["paid-accepted","paid-preparing","paid-ready"].includes(status)) setStep("receipt");
        else if (["accepted","ready","served"].includes(status)) setStep("payment");
        const raw = res.data.order?.payment_splits;
        if (raw) {
          try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (!isEditing()) { setPayers(parsed); }
              else {
                setPayers(prev => prev.map(myP => {
                  const serverP = parsed.find(sp => String(sp.id) === String(myP.id));
                  if (!serverP) return myP;
                  return { ...myP, txIdRequested: serverP.txIdRequested };
                }));
              }
            }
          } catch {}
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeOrderId, step]);

  const updatePayer = (id, field, value) => {
    ignoreUpdatesUntil.current = Date.now() + 2500;
    setPayers(prev => {
      const updated = prev.map(p => {
        if (p.id !== id) return p;
        const next = { ...p, [field]: value };
        if (field === 'method' && value === 'card' && !p.whishCode) next.whishCode = generateWhishCode();
        if (field === 'currency' && p.cashHasSplit) { next.cashHasSplit = false; next.cashSecondAmount = 0; }
        return next;
      });
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => syncPayersToBackend(updated), 1000);
      return updated;
    });
  };

  const removePayer = (payer) => {
    if (payer.ownerId !== myUserId.current) return;
    const myRows = payers.filter(p => p.ownerId === myUserId.current);
    if (myRows.length <= 1) return;
    ignoreUpdatesUntil.current = Date.now() + 2500;
    const updated = payers.filter(p => p.id !== payer.id);
    setPayers(updated);
    syncPayersToBackend(updated);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    const unconfirmed = payers.find(p => p.ownerId === myUserId.current && p.method === 'card' && !p.whishConfirmed);
    if (unconfirmed) { alert("⚠️ You must check the confirmation box before proceeding!"); return; }
    setLoading(true);
    try {
      await axios.put(`${BACKEND}/admin/orders/${activeOrderId}/status`, {
        status: "PaymentPending", payment_splits: payers, replace_splits: true
      });
      setStep("waitingForPayment");
    } catch { alert("Error confirming payment!"); }
    finally { setLoading(false); }
  };

  const handleSubmitTxId = async () => {
    const myTxPayers = payers.filter(p => p.ownerId === myUserId.current && p.txIdRequested);
    for (const p of myTxPayers) {
      if (!p.transactionId || p.transactionId.trim() === '') { alert("⚠️ Please enter your Transaction ID first!"); return; }
      if (!p.whishConfirmed) { alert("⚠️ Please confirm you included the reference note in the transfer!"); return; }
    }
    setLoading(true);
    try { await syncPayersToBackend(payers); setTxIdSubmitted(true); }
    catch { alert("Error submitting. Please try again."); }
    finally { setLoading(false); }
  };

  const renderMethodSelector = (payer, isMine) => (
    <div className="method-btn-group">
      {[{ id:'cash', label:'💵 Cash' },{ id:'card', label:'💳 Card' }].map(m => (
        <button key={m.id} type="button"
          className={`method-btn ${payer.method === m.id ? 'active' : ''}`}
          onClick={() => isMine && updatePayer(payer.id, 'method', m.id)}
          disabled={!isMine}
        >{m.label}</button>
      ))}
    </div>
  );

  const renderCashExtras = (payer, isMine) => {
    const secondCurrency = payer.currency === 'USD' ? 'LBP' : 'USD';
    const showRate = payer.currency === 'LBP' || payer.cashHasSplit;
    return (
      <div className="cash-extras-wrapper">
        <div className="cash-amount-row">
          <input type="number" placeholder="0" className="glass-input-small cash-amount-input"
            value={payer.amount || ""} disabled={!isMine}
            onChange={e => updatePayer(payer.id, 'amount', e.target.value)} />
          <div className="cash-currency-toggle">
            {['USD','LBP'].map(c => (
              <button key={c} type="button"
                className={`cc-btn ${payer.currency === c ? 'active' : ''}`}
                onClick={() => isMine && updatePayer(payer.id, 'currency', c)}
                disabled={!isMine}
              >{c === 'USD' ? '🇺🇸 USD' : '🇱🇧 LBP'}</button>
            ))}
          </div>
          {isMine && !payer.cashHasSplit && (
            <button type="button" className="cash-plus-btn" onClick={() => updatePayer(payer.id, 'cashHasSplit', true)}>+</button>
          )}
        </div>
        {showRate && <p className="rate-hint-text">Rate: 1$ = {EXCHANGE_RATE.toLocaleString()} LBPs</p>}
        {payer.cashHasSplit && (
          <div className="cash-amount-row second-cash-row">
            <input type="number" placeholder="0" className="glass-input-small cash-amount-input"
              value={payer.cashSecondAmount || ""} disabled={!isMine}
              onChange={e => updatePayer(payer.id, 'cashSecondAmount', e.target.value)} />
            <span className="cash-currency-locked">{secondCurrency === 'USD' ? '🇺🇸 USD' : '🇱🇧 LBP'}</span>
            {isMine && <button type="button" className="cash-minus-btn" onClick={() => updatePayer(payer.id, 'cashHasSplit', false)}>−</button>}
          </div>
        )}
      </div>
    );
  };

  const renderTransferFlow = (payer, isMine) => {
    const ref = `ORD-${activeOrderId}-${payer.whishCode || '???'}`;
    const showTxInput = isMine && payer.txIdRequested;
    return (
      <div className="transfer-flow-box">
        <div className="transfer-header-row">
          <span className="transfer-brand">📱 Money Transfer</span>
          <span className="transfer-number-tag">{WHISH_NUMBER}</span>
        </div>
        <div className="transfer-code-block">
          <span className="tc-label">Transfer Note:</span>
          <span className="tc-value">{ref}</span>
        </div>
        <p className="transfer-instruction">Send the amount to the number above and include <strong>"{ref}"</strong> in the transfer notes.</p>
        {isMine && (
          <>
            <input type="number" placeholder="Amount $" className="glass-input-main"
              style={{ width:'100%', marginBottom:'10px' }}
              value={payer.amount || ""} onChange={e => updatePayer(payer.id, 'amount', e.target.value)} />
            {showTxInput && (
              <div style={{ marginTop:'10px', padding:'12px', background:'rgba(245,158,11,0.15)', borderRadius:'8px', border:'1px solid rgba(245,158,11,0.4)' }}>
                <p style={{ color:'#f59e0b', fontSize:'12px', margin:'0 0 8px 0', fontWeight:'bold' }}>📩 Admin requested your Transaction ID</p>
                <input type="text" placeholder="Paste Full Transaction ID..." className="glass-input-main"
                  style={{ width:'100%', textAlign:'center' }}
                  value={payer.transactionId || ""} onChange={e => updatePayer(payer.id, 'transactionId', e.target.value)} />
              </div>
            )}
            {isMine && payer.transactionId && !payer.txIdRequested && (
              <div style={{ marginTop:'8px', fontSize:'12px', color:'#95b508', textAlign:'left' }}>
                ✅ TX ID Entered: <strong>{payer.transactionId}</strong>
              </div>
            )}
            <label className="transfer-confirm-label">
              <input type="checkbox" checked={payer.whishConfirmed || false}
                onChange={e => updatePayer(payer.id, 'whishConfirmed', e.target.checked)} />
              <span>I confirm I included <strong>"{ref}"</strong> in the transfer notes</span>
            </label>
          </>
        )}
      </div>
    );
  };

  const renderPayerCard = (payer) => {
    const isMine      = payer.ownerId === myUserId.current;
    const myRowsCount = payers.filter(p => p.ownerId === myUserId.current).length;
    return (
      <div key={payer.id} className={`payer-card ${isMine ? 'payer-mine' : 'payer-others'}`}>
        <div className="payer-card-top" style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'15px' }}>
          <input type="text" placeholder="Full Name" value={payer.name || ''}
            onChange={e => updatePayer(payer.id, 'name', e.target.value.replace(/[0-9]/g,''))}
            className="glass-input-main" style={{ width:'100%', textAlign:'left' }} />
          <input type="tel" placeholder="Phone Number" value={payer.phone || ''}
            onChange={e => updatePayer(payer.id, 'phone', e.target.value.replace(/[^0-9+\s\-]/g,''))}
            className="glass-input-main" style={{ width:'100%', textAlign:'left' }} />
          {isMine && myRowsCount > 1 && (
            <button type="button" className="remove-payer-btn" onClick={() => removePayer(payer)}>✕</button>
          )}
        </div>
        {renderMethodSelector(payer, isMine)}
        {payer.method === 'cash' && renderCashExtras(payer, isMine)}
        {payer.method === 'card' && renderTransferFlow(payer, isMine)}
      </div>
    );
  };

  // ── Steps ─────────────────────────────────────────────────────────
  if (step === "waiting" || step === "waitingForPayment") {
    const myPayers   = payers.filter(p => p.ownerId === myUserId.current);
    const needsAction = myPayers.find(p => p.txIdRequested && !txIdSubmitted);

    if (needsAction) return (
      <div className="checkout-page">
        <div className="overlay" style={{ display:'flex', justifyContent:'center', alignItems:'center', textAlign:'center' }}>
          <div className="info-form-card glass-effect" style={{ padding:'30px', maxWidth:'420px', width:'90%' }}>
            <img src={logo} alt="Logo" width="120" style={{ marginBottom:'20px' }} />
            <h2 style={{ color:'#f59e0b', marginBottom:'8px' }}>ACTION REQUIRED 📩</h2>
            <p style={{ color:'#ccc', marginBottom:'20px', fontSize:'14px' }}>Admin needs your Transaction ID to verify your transfer.</p>
            {myPayers.filter(p => p.txIdRequested).map(payer => (
              <div key={payer.id} className="payer-card payer-mine" style={{ marginBottom:'16px' }}>
                {renderTransferFlow(payer, true)}
              </div>
            ))}
            <button onClick={handleSubmitTxId} disabled={loading}
              style={{ width:'100%', padding:'14px', background: loading ? '#555' : '#f59e0b', color:'#000', fontWeight:'900', fontSize:'13px', letterSpacing:'2px', border:'none', borderRadius:'10px', cursor: loading ? 'not-allowed' : 'pointer', marginTop:'8px', textTransform:'uppercase' }}>
              {loading ? "SUBMITTING..." : "SUBMIT TX ID ✅"}
            </button>
          </div>
        </div>
      </div>
    );

    if (txIdSubmitted) return (
      <div className="checkout-page">
        <div className="overlay" style={{ display:'flex', justifyContent:'center', alignItems:'center', textAlign:'center' }}>
          <div className="info-form-card glass-effect" style={{ padding:'50px' }}>
            <img src={logo} alt="Logo" width="160" style={{ marginBottom:'20px' }} />
            <h2 style={{ color:'#95b508' }}>TX ID SUBMITTED ✅</h2>
            <p style={{ color:'#aaa', marginBottom:'20px' }}>Order #{activeOrderId} — Admin is verifying your transfer...</p>
            <div className="loader-line"></div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="checkout-page">
        <div className="overlay" style={{ display:'flex', justifyContent:'center', alignItems:'center', textAlign:'center' }}>
          <div className="info-form-card glass-effect" style={{ padding:'50px' }}>
            <img src={logo} alt="Logo" width="160" style={{ marginBottom:'20px' }} />
            <h2>{step === "waiting" ? "KITCHEN IS COOKING... 👨‍🍳" : "WAITING FOR ADMIN... 💰"}</h2>
            <p style={{ color:'#aaa' }}>Order #{activeOrderId} — Stay on this page.</p>
            <div className="loader-line"></div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "payment") return (
    <div className="checkout-page">

      <div className="overlay">
        {showQR && (
          <div className="qr-popup-overlay">
            <div className="qr-popup-content slide-down">
              <QRCodeCanvas value={qrValue} size={200} />
              <button onClick={() => setShowQR(false)}>DONE</button>
            </div>
          </div>
        )}
        <div className="layout-wrapper">
          <div className="checkout-container">
            <div className="info-form-card glass-effect">
              <h2 className="checkout-title">✅ COMPLETE PAYMENT</h2>
              <p style={{ color:'#aaa', marginBottom:'15px', fontSize:'14px' }}>Order #{activeOrderId} | Table #{tableId}</p>

              <div className="checkout-section group-split-box">
                {isScanner ? (
                  <>
                    <p className="scanner-share-label">👤 Your Share</p>
                    {payers.filter(p => p.id === myPayerIdRef.current).map(payer => renderPayerCard(payer))}
                    {payers.filter(p => p.id !== myPayerIdRef.current).length > 0 && (
                      <>
                        <p className="others-label">Others at this table:</p>
                        {payers.filter(p => p.id !== myPayerIdRef.current).map((payer, i) => renderOtherPayerRow(payer, i))}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {payers.map(payer => renderPayerCard(payer))}
                    <div className="payer-actions-row">
                      <button type="button" className="add-payer-btn-glass qr-split-btn" onClick={() => setShowQR(true)}>Scan to split 📲</button>
                      
                    </div>
                  </>
                )}
              </div>

              <form onSubmit={handleConfirmPayment}>
                <div className="checkout-summary-mini-glass">
                  <div className="summary-row"><span>Total Bill:</span><span>${finalTotal.toFixed(2)}</span></div>
                  <div className="summary-row" style={{ color: remainingBalance > 0.01 ? '#ff6b6b' : '#95b508' }}>
                    <span>Remaining:</span><span>${remainingBalance.toFixed(2)}</span>
                  </div>
                </div>
                <button type="submit" className="place-order-btn-final" disabled={loading}>
                  {loading ? "CONFIRMING..." : "CONFIRM PAYMENT 💳"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (step === "receipt") return (
    <div className="checkout-page">
      <div className="overlay" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', paddingTop:'120px', paddingBottom:'60px', minHeight:'100vh', overflowY:'auto' }}>
        <div className="receipt-paper" style={{ maxWidth:'420px', width:'85%', margin:'0 auto' }}>
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
          <div className="receipt-divider"></div>
          <div className="receipt-items">
            {orderedItems.map((item, index) => {
              const extras    = item.selected_extras || item.selectedExtras || [];
              const extrasText = extras.map(e => typeof e === 'object' ? e.name : e).join(', ');
              const unitPrice  = item.price || item.price_at_time || 0;
              return (
                <div key={index} className="r-item-container" style={{ marginBottom:'12px' }}>
                  <div className="r-item-row" style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'14px' }}>{item.quantity}x {item.name}</span>
                    <span style={{ fontSize:'14px' }}>${(unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                  {extrasText && <div className="r-item-extras" style={{ fontSize:'11px', color:'#666', paddingLeft:'20px', marginTop:'2px', fontStyle:'italic' }}>+ {extrasText}</div>}
                </div>
              );
            })}
          </div>
          <div className="receipt-divider"></div>
          <div className="receipt-summary">
            <div className="r-summary-line"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="r-summary-line"><span>VAT (11%):</span><span>${totalVAT.toFixed(2)}</span></div>
            <div className="receipt-total-row"><span>TOTAL:</span><span>${finalTotal.toFixed(2)}</span></div>
          </div>
        </div>
        <div style={{ textAlign:'center', width:'100%', maxWidth:'420px' }}>
          <h2 style={{ color:'#fff', fontSize:'32px', fontWeight:'900', textShadow:'0px 4px 15px rgba(0,0,0,0.6)', marginBottom:'20px' }}>✅ PAID! ENJOY!</h2>
          <button className="back-btn-new" onClick={() => window.location.href = '/'}>New Order</button>
        </div>
      </div>
    </div>
  );

  if (step === "rejected") return (
    <div className="checkout-page">
      <div className="overlay" style={{ display:'flex', justifyContent:'center', alignItems:'center', textAlign:'center' }}>
        <div className="info-form-card glass-effect" style={{ padding:'50px' }}>
          <h2>❌ ORDER REJECTED</h2>
          <button onClick={() => window.location.href = '/'}>Go Back</button>
        </div>
      </div>
    </div>
  );
}

const renderOtherPayerRow = (payer, i) => {
  const usdTotal = payer.method === 'card' ? Number(payer.amount) : (payer.currency === 'USD' ? Number(payer.amount) : Number(payer.amount) / 89500);
  const icon = payer.method === 'cash' ? '💵' : '💳';
  return (
    <div key={payer.id} className="payer-card payer-others">
      <div className="others-row">
        <span className="others-name">{payer.name || `Person ${i + 1}`}</span>
        <span className="others-total">${usdTotal.toFixed(2)}</span>
        <span className="others-icon">{icon}</span>
      </div>
    </div>
  );
};

export default Checkout;