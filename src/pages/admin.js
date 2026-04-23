import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../style/admin.css';
import AdminChatPanel from '../components/AdminChatPanel';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getOnlineStaff, subscribeToStaff } from '../context/AuthContext';

const BACKEND = "https://snack-attack-backend.onrender.com";

const toDateStr = (d) => d.toISOString().slice(0,10);
const today = () => toDateStr(new Date());
const fmtDisplay = (str) => {
  const d = new Date(str + 'T00:00:00');
  const isToday = str === today();
  const opts = { weekday:'short', month:'short', day:'numeric' };
  return (isToday ? '📅 Today — ' : '') + d.toLocaleDateString('en-US', opts);
};

function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [onlineStaff, setOnlineStaff] = useState({});
  const [chatOpen, setChatOpen] = useState(true);
  const [view, setView] = useState("admin");
  const [selectedDate, setSelectedDate] = useState(today());
  
  // ✅ State for inline editing of TX ID
  const [editingTx, setEditingTx] = useState({ orderId: null, splitId: null, value: '' });

  useEffect(() => { if (!user) navigate('/login'); }, [user]);
  useEffect(() => { if (user?.role !== "admin") setView(user?.role); }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${BACKEND}/admin/orders`);
      setAllOrders(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchOrders(); const t = setInterval(fetchOrders, 5000); return () => clearInterval(t); }, []);
  useEffect(() => { setOnlineStaff(getOnlineStaff()); const unsub = subscribeToStaff(s => setOnlineStaff({...s})); return unsub; }, []);

  const orders = allOrders.filter(o => {
    if (!o.created_at) return false;
    return o.created_at.slice(0,10) === selectedDate;
  });

  const changeDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    if (next <= today()) setSelectedDate(next);
  };

  const totalOrders  = orders.length;
  const totalRevenue = orders.filter(o => o.status === 'Paid').reduce((s,o) => s + Number(o.total_price||0), 0);
  const activeCount  = orders.filter(o => !['Paid','Rejected'].includes(o.status)).length;

  const parseSplits = (raw) => {
    try { const p = typeof raw==='string' ? JSON.parse(raw) : raw; return Array.isArray(p)?p:[]; } catch { return []; }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    let reason = null;
    if (newStatus === 'Rejected') { reason = prompt('Rejection reason?'); if (!reason) return; }
    try {
      const payload = { status: newStatus };
      if (reason) payload.reason = reason;
      const res = await axios.put(`${BACKEND}/admin/orders/${orderId}/status`, payload);
      if (res.data.success) setAllOrders(prev => prev.map(o => o.id===orderId ? {...o, status:newStatus} : o));
    } catch { alert('Error updating order status.'); }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Remove this order? 🗑️')) return;
    try {
      const res = await axios.delete(`${BACKEND}/admin/orders/${orderId}`);
      if (res.data?.success) setAllOrders(prev => prev.filter(o => o.id!==orderId));
    } catch { alert('Error deleting.'); }
  };

  // ✅ NEW: Verify Whish using inline state (no prompt)
  const handleVerifyWhishInline = async (orderId, splitId) => {
    const order = allOrders.find(o => o.id === orderId);
    if(!order) return;
    const splits = parseSplits(order.payment_splits);
    
    const txId = editingTx.value;
    if(!txId) { alert("Enter a Transaction ID first!"); return; }

    try {
      const updatedSplits = splits.map(s => s.id===splitId ? {...s, transactionId:txId, whishVerified:true} : s);
      await axios.put(`${BACKEND}/admin/orders/${orderId}/status`, { payment_splits: updatedSplits, replace_splits: true });
      setAllOrders(prev => prev.map(o => o.id===orderId ? {...o, payment_splits:JSON.stringify(updatedSplits)} : o));
      setEditingTx({ orderId: null, splitId: null, value: '' }); // Reset input
    } catch { alert('Error verifying Whish payment.'); }
  };

  const handleRequestTxId = async (orderId, splitId) => {
    const order = allOrders.find(o => o.id === orderId);
    const splits = parseSplits(order.payment_splits);
    const updatedSplits = splits.map(s => s.id === splitId ? {...s, txIdRequested: true} : s);
    
    try {
        await axios.put(`${BACKEND}/admin/orders/${orderId}/status`, { payment_splits: updatedSplits, replace_splits: true });
        setAllOrders(prev => prev.map(o => o.id===orderId ? {...o, payment_splits:JSON.stringify(updatedSplits)} : o));
        alert("Request sent to customer.");
    } catch {
        alert("Failed to request ID.");
    }
  };

  const renderSplitPill = (s, i, orderId) => {
    const method = s.method || 'cash';
    const cardType = s.cardType || '';
    const isWhish = method === 'card' && (cardType === 'whish' || !!s.whishCode); // Check code too
    
    // 1. CASH
    if (method === 'cash') {
      const hasSplit = s.cashHasSplit || false;
      const firstAmt = Number(s.amount || 0);
      const secondAmt = Number(s.cashSecondAmount || 0);
      const firstCurr = s.currency || 'USD';
      const secondCurr = firstCurr === 'USD' ? 'LBP' : 'USD';
      return (
        <div key={i} className="admin-split-pill cash-pill">
          <div className="split-top">
            <span className="split-method-tag">💵 Cash</span>
            <span className="split-amt">
              {firstAmt.toLocaleString()} <span className={`currency-tag ${firstCurr === 'LBP' ? 'lbp' : 'usd'}`}>{firstCurr}</span>
            </span>
          </div>
          {hasSplit && secondAmt > 0 && (
            <div className="split-top" style={{ marginTop: '4px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '4px' }}>
              <span className="split-method-tag" style={{ visibility: 'hidden' }}>💵 Cash</span>
              <span className="split-amt">
                {secondAmt.toLocaleString()} <span className={`currency-tag ${secondCurr === 'LBP' ? 'lbp' : 'usd'}`}>{secondCurr}</span>
              </span>
            </div>
          )}
          {s.name && <div className="split-user-name" style={{ marginTop: '5px' }}>👤 {s.name}</div>}
        </div>
      );
    }
    
    // 2. WHISH / CARD
    if (method === 'card') {
      const whishRef = `ORD-${orderId}-${s.whishCode || '???'}`;
      // Determine Label
      let cardLabel = '💳 Card';
      if (cardType === 'visa') cardLabel = '💳 Visa';
      else if (cardType === 'mastercard') cardLabel = '💳 Mastercard';
      else if (cardType === 'omt') cardLabel = '💸 OMT';
      else if (isWhish) cardLabel = '📱 Whish';

      return (
        <div key={i} className={`admin-split-pill card-pill ${isWhish ? 'whish-pill' : ''} ${s.whishVerified ? 'verified' : ''}`}>
          <div className="split-top">
            <span className="split-method-tag">{cardLabel}</span>
            <span className="split-amt">${Number(s.amount).toFixed(2)}</span>
          </div>
          
          {s.name && <div className="split-user-name">👤 {s.name}</div>}
          {s.phone && <div className="split-phone">📞 {s.phone}</div>}

          {/* Show Transfer Note if Whish */}
          {isWhish && (
             <div className="whish-ref-admin" style={{ marginTop: '5px', fontSize: '11px' }}>
                <span className="ref-label">Note:</span>
                <span className="ref-code">{whishRef}</span>
            </div>
          )}
          
          {/* Show TX ID or Pending */}
          {isWhish && (
            s.transactionId ? (
              <div className="whish-tx-confirmed" style={{ marginTop: '5px', fontSize: '11px', color: 'green' }}>✅ TX: <span>{s.transactionId}</span></div>
            ) : (
              <div className="whish-tx-pending" style={{ marginTop: '5px', fontSize: '11px', color: '#f59e0b' }}>⏳ Awaiting TX ID</div>
            )
          )}

          {/* ADMIN CONTROLS - Only show if Whish and no TX ID yet */}
          {view === 'admin' && isWhish && !s.transactionId && (
            <div style={{ marginTop: '10px', width: '100%' }}>
                
                {/* ✅ INPUT FIELD ALWAYS VISIBLE */}
                <input 
                    type="text" 
                    placeholder="Enter TX ID here..."
                    className="glass-input-small" 
                    style={{ width: '100%', marginBottom: '5px', textAlign: 'center', background: 'rgba(0,0,0,0.05)', border: '1px solid #ddd' }}
                    value={editingTx.splitId === s.id ? editingTx.value : ''}
                    onChange={(e) => setEditingTx({ orderId, splitId: s.id, value: e.target.value })}
                />

                {/* BUTTONS ROW */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button 
                        className="verify-whish-btn" 
                        style={{ flex: 1 }}
                        onClick={() => handleVerifyWhishInline(orderId, s.id)}>
                        ✅ CONFIRM
                    </button>

                    {!s.txIdRequested && (
                        <button
                            className="request-tx-btn"
                            style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                            onClick={() => handleRequestTxId(orderId, s.id)}
                        >
                            📩 Request
                        </button>
                    )}

                    {s.txIdRequested && (
                        <span style={{ fontSize: '10px', color: '#f59e0b', alignSelf: 'center', fontWeight: 'bold' }}>
                            📢 Requested
                        </span>
                    )}
                </div>
            </div>
          )}
        </div>
      );
    }

    // 3. FALLBACK
    return (
      <div key={i} className="admin-split-pill">
        <div className="split-top"><span className="split-method-tag">💳 Card</span><span className="split-amt">${Number(s.amount).toFixed(2)}</span></div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard-page">
      {/* TOP BAR */}
      <header className="admin-top-bar">
        <div className="admin-top-bar-left">
          <h1>🍔 SNACK ATTACK</h1>
          <span className="top-bar-sub">ADMIN DASHBOARD</span>
        </div>
        <div className="admin-top-bar-right">
          <div className="admin-stats-summary">
            🟡 Active: <strong>{allOrders.filter(o=>o.status!=='Paid'&&o.status!=='Rejected').length}</strong>
          </div>
          <button className="admin-logout-btn" onClick={()=>{logout();navigate('/login');}}>Logout</button>
        </div>
      </header>

      {/* DAILY SUMMARY BAR */}
      <div className="daily-summary-bar">
        <div className="date-nav">
          <button className="date-nav-btn" onClick={()=>changeDate(-1)}>‹</button>
          <span className="date-display">{fmtDisplay(selectedDate)}</span>
          <button className="date-nav-btn" onClick={()=>changeDate(1)} disabled={selectedDate===today()}>›</button>
        </div>
        <div className="summary-stats">
          <div className="sum-stat"><span className="sum-stat-val gold">{totalOrders}</span><span className="sum-stat-label">Orders</span></div>
          <div className="sum-stat"><span className="sum-stat-val blue">{activeCount}</span><span className="sum-stat-label">Active</span></div>
          <div className="sum-stat"><span className="sum-stat-val green">${totalRevenue.toFixed(0)}</span><span className="sum-stat-label">Revenue</span></div>
        </div>
      </div>

      {/* VIEW SWITCHER */}
      {user?.role==="admin" && (
        <div className="view-switcher">
          {[{id:'admin',label:'👑 Admin'},{id:'waiter',label:'🍽️ Waiter'},{id:'kitchen',label:'👨‍🍳 Kitchen'}].map(v=>(
            <button key={v.id} className={`view-sw-btn ${view===v.id?'active':''}`} onClick={()=>setView(v.id)}>{v.label}</button>
          ))}
        </div>
      )}

      {/* CHAT */}
      <div className="admin-chat-section">
        <button className="admin-chat-toggle" onClick={()=>setChatOpen(o=>!o)}>
          {chatOpen ? '▲ Hide Chat' : '▼ Show Chat'}
        </button>
        {chatOpen && <AdminChatPanel />}
      </div>

      {/* ORDERS GRID */}
      <div className="orders-masonry">
        {orders.map(order => {
          const splits = parseSplits(order.payment_splits);
          const hasWhishPending = splits.some(sp=>sp.method==='card'&&sp.whishCode&&!sp.whishVerified);
        
          const s = order.status || "";
          const isPaid = s.includes('Paid');
          const isRequested = s === 'Requested';
          const isPaymentPending = s === 'PaymentPending';
          const isWaitingPayment  = s === 'Accepted';
          const isAcceptedStage   = s === 'Paid-Accepted';
          const isPreparingStage  = s === 'Paid-Preparing';
          const isReadyStage = s === 'Ready' || s === 'Paid-Ready';
          const isCompleted = s === 'Paid' || s === 'Served';
         
          return (
            <div key={order.id} className={`admin-order-card status-${s.toLowerCase()} ${!isPaid?'unpaid-border':'paid-border'} ${hasWhishPending?'whish-pending-border':''}`}>

              <div className="admin-card-header">
                <span className="order-id">#ORD-{order.id}</span>
                <div className="header-badges">
                  <span className={`status-chip chip-${s.toLowerCase()}`}>{s}</span>
                  <span className={`payment-badge ${isPaid?'paid':'pending'}`}>{isPaid?'💰 PAID':'⚠️ UNPAID'}</span>
                  <span className="table-badge">TABLE {order.table_id||'N/A'}</span>
                </div>
                {(isPaid || s==='Rejected') && (
                  <button className="delete-x-btn" onClick={()=>handleDeleteOrder(order.id)}>✕</button>
                )}
              </div>

              <div className="admin-card-body">
                <div className="customer-info">
                  <p><strong>Customer:</strong> {order.full_name||'Guest'}</p>
                  <p><strong>Phone:</strong> {order.phone_number||'—'}</p>
                </div>
                <div className="admin-payment-info-box">
                  <p className="payment-label">Payment Breakdown</p>
                  <div className="splits-list">
                    {splits.length>0 ? splits.map((sp,i)=>renderSplitPill(sp,i,order.id)) : <div className="admin-split-pill">💵 Cash</div>}
                  </div>
                </div>
                <div className="order-financials">
                  <p className="total-amount">TOTAL: <span>${Number(order.total_price).toFixed(2)}</span></p>
                </div>
                <p className="order-time">🕒 {new Date(order.created_at).toLocaleTimeString()}</p>
                {s==='Rejected' && <p className="reject-reason">❌ {order.rejection_reason||'Not specified'}</p>}
              </div>

              {/* ACTIONS */}
              <div className="admin-card-actions">
                {view === "admin" && (
                <>
                  {isRequested && (
                    <div className="action-row">
                      <button className="btn-action start" onClick={() => handleStatusUpdate(order.id, 'Accepted')}>ACCEPT ORDER ✅</button>
                      <button className="btn-action reject" onClick={() => handleStatusUpdate(order.id, 'Rejected')}>REJECT</button>
                    </div>
                  )}

                  {isWaitingPayment && (
                    <p className="waiting-label">⏳ Waiting for customer payment...</p>
                  )}

                  {isPaymentPending && (
                    <div className="action-row">
                      <button className="btn-action start" onClick={() => handleStatusUpdate(order.id, 'Paid-Accepted')}>CONFIRM PAYMENT 💰</button>
                      <button className="btn-action reject" onClick={() => handleStatusUpdate(order.id, 'Rejected')}>REJECT</button>
                    </div>
                  )}

                  {isAcceptedStage && (
                    <button className="btn-action cook" onClick={() => handleStatusUpdate(order.id, 'Paid-Preparing')}>START COOKING 👨‍🍳</button>
                  )}
                  {isPreparingStage && (
                    <button className="btn-action ready" onClick={() => handleStatusUpdate(order.id, 'Paid')}>MARK READY 🔔</button>
                  )}
                </>
                )}

               {view === "waiter" && (
                  isPreparingStage
                    ? <p className="waiting-label">👨‍🍳 Kitchen is cooking...</p>
                    : isPaid
                    ? <p className="waiting-label">✅ Paid & done</p>
                    : <p className="waiting-label">⏳ Waiting...</p>
                )}

                {view === "kitchen" && (
                    <>
                      {isAcceptedStage && (
                        <button className="btn-action cook" onClick={() => handleStatusUpdate(order.id, 'Paid-Preparing')}>
                          START COOKING 👨‍🍳
                        </button>
                      )}
                      {isPreparingStage && (
                        <button className="btn-action ready" onClick={() => handleStatusUpdate(order.id, 'Paid-Ready')}>
                          MARK READY 🔔
                        </button>
                      )}
                     {s === 'Paid-Ready' && (
                      <p className="waiting-label">🔔 Ready — waiter delivering...</p>
                    )}

                    {(isRequested || isPaymentPending || isWaitingPayment) && (
                      <p className="waiting-label">⏳ Awaiting admin approval...</p>
                    )}
                    </>
                  )}

              {isCompleted && s !== 'Rejected' && <span className="order-completed-label">✅ ARCHIVED</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Admin;