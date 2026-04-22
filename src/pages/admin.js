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

  // ── Filter by selected date ──────────────────────────────────────
  const orders = allOrders.filter(o => {
    if (!o.created_at) return false;
    return o.created_at.slice(0,10) === selectedDate;
  });

  // ── Date nav ─────────────────────────────────────────────────────
  const changeDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    if (next <= today()) setSelectedDate(next);
  };

  // ── Daily stats ───────────────────────────────────────────────────
  const totalOrders  = orders.length;
  const totalRevenue = orders.filter(o => o.status === 'Paid').reduce((s,o) => s + Number(o.total_price||0), 0);
  const activeCount  = orders.filter(o => !['Paid','Rejected'].includes(o.status)).length;

  const getPaidTotal = (splitsData) => {
    try { const p = typeof splitsData==='string' ? JSON.parse(splitsData) : splitsData; return (Array.isArray(p)?p:[]).reduce((s,x)=>s+Number(x.amount||0),0); } catch { return 0; }
  };

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

  const handleVerifyWhish = async (orderId, payerId) => {
    const order = allOrders.find(o => o.id===orderId); if (!order) return;
    const splits = parseSplits(order.payment_splits);
    const payer = splits.find(s => s.id===payerId);
    const txId = prompt(`🔍 Whish Transaction ID for "${payer?.name||'this payer'}":`);
    if (!txId) return;
    try {
      const updatedSplits = splits.map(s => s.id===payerId ? {...s, transactionId:txId, whishVerified:true} : s);
      await axios.put(`${BACKEND}/admin/orders/${orderId}/status`, { payment_splits: updatedSplits, replace_splits: true });
      setAllOrders(prev => prev.map(o => o.id===orderId ? {...o, payment_splits:JSON.stringify(updatedSplits)} : o));
    } catch { alert('Error verifying Whish payment.'); }
  };

  const renderSplitPill = (s, i, orderId) => {
    const method = s.method || 'cash';
    const cardType = s.cardType || '';
    if (method === 'cash') return (
      <div key={i} className="admin-split-pill cash-pill">
        <div className="split-top">
          <span className="split-method-tag">💵 Cash · <span className={`currency-tag ${s.currency==='LBP'?'lbp':'usd'}`}>{s.currency||'USD'}</span></span>
          <span className="split-amt">${Number(s.amount).toFixed(2)}</span>
        </div>
        {s.name && <div className="split-user-name">👤 {s.name}</div>}
      </div>
    );
    if (method==='card' && cardType==='whish') {
      const whishRef = `ORD-${orderId}-${s.whishCode||'???'}`;
      return (
        <div key={i} className={`admin-split-pill whish-pill ${s.whishVerified?'verified':'pending'}`}>
          <div className="split-top"><span className="split-method-tag">📱 Whish</span><span className="split-amt">${Number(s.amount).toFixed(2)}</span></div>
          {s.name && <div className="split-user-name">👤 {s.name}</div>}
          <div className="whish-ref-admin"><span className="ref-label">Note:</span><span className="ref-code">{whishRef}</span></div>
          {s.transactionId ? <div className="whish-tx-confirmed">✅ TX: <span>{s.transactionId}</span></div> : <div className="whish-tx-pending">⏳ Awaiting TX ID</div>}
          {view==='admin' && <button className="verify-whish-btn" onClick={()=>handleVerifyWhish(orderId,s.id)}>🔍 {s.whishVerified?'Re-verify':'Search TX ID'}</button>}
        </div>
      );
    }
    if (method==='card') {
      const cardLabel = cardType==='visa'?'💳 Visa':cardType==='mastercard'?'💳 Mastercard':cardType==='omt'?'💸 OMT':'💳 Card';
      return (
        <div key={i} className={`admin-split-pill card-pill ${cardType}`}>
          <div className="split-top"><span className="split-method-tag">{cardLabel}</span><span className="split-amt">${Number(s.amount).toFixed(2)}</span></div>
          {s.name && <div className="split-user-name">👤 {s.name}</div>}
          {s.phone && <div className="split-phone">📞 {s.phone}</div>}
        </div>
      );
    }
    return (
      <div key={i} className="admin-split-pill">
        <div className="split-top"><span className="split-method-tag">{method==='cash'?'💵 Cash':'💳 Card'}</span><span className="split-amt">${Number(s.amount).toFixed(2)}</span></div>
        {s.name && <div className="split-user-name">👤 {s.name}</div>}
      </div>
    );
  };

  const staffList = Object.entries(onlineStaff).filter(([,v]) => v.role!=='admin');

  return (
    <div className="admin-dashboard-page">

      {/* TOP BAR */}
      <header className="admin-top-bar">
        <div className="admin-top-bar-left">
          <h1>🍔 SNACK ATTACK</h1>
          <span className="top-bar-sub">KITCHEN DASHBOARD</span>
        </div>
        <div className="admin-top-bar-right">
          <div className="admin-stats-summary">
            🟡 Active: <strong>{allOrders.filter(o=>o.status!=='Paid'&&o.status!=='Rejected').length}</strong>
            &nbsp;·&nbsp;
            ⏳ Pending: <strong>{allOrders.filter(o=>['Pending','Requested'].includes(o.status)).length}</strong>
          </div>
          <div className="admin-staff-online">
            <span className="aso-label">🟢 Online:</span>
            {staffList.length===0 ? <span className="aso-none">No staff</span> : staffList.map(([un,v])=>(
              <span key={un} className={`aso-chip ${v.role}`}>{v.role==='waiter'?'🛎️':'👨‍🍳'} {v.name}</span>
            ))}
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

        <div style={{ position:'relative', display:'inline-block' }}>
          <button className="date-input-btn">
            📅 Pick Date
            <input
              type="date" className="date-picker-input"
              value={selectedDate} max={today()}
              onChange={e => { if(e.target.value) setSelectedDate(e.target.value); }}
            />
          </button>
        </div>

        {selectedDate !== today() && (
          <button className="today-btn" onClick={()=>setSelectedDate(today())}>Go to Today</button>
        )}

        <div className="summary-stats">
          <div className="sum-stat">
            <span className="sum-stat-val gold">{totalOrders}</span>
            <span className="sum-stat-label">Orders</span>
          </div>
          <div className="sum-stat">
            <span className="sum-stat-val blue">{activeCount}</span>
            <span className="sum-stat-label">Active</span>
          </div>
          <div className="sum-stat">
            <span className="sum-stat-val green">${totalRevenue.toFixed(0)}</span>
            <span className="sum-stat-label">Revenue</span>
          </div>
        </div>
      </div>

      {/* VIEW SWITCHER */}
      {user?.role==="admin" && (
        <div className="view-switcher">
          {[{id:'admin',label:'👑 Admin',cls:'sw-admin'},{id:'waiter',label:'🍽️ Waiter',cls:'sw-waiter'},{id:'kitchen',label:'👨‍🍳 Kitchen',cls:'sw-kitchen'}].map(v=>(
            <button key={v.id} className={`view-sw-btn ${v.cls} ${view===v.id?'active':''}`} onClick={()=>setView(v.id)}>{v.label}</button>
          ))}
          <span className="view-indicator">Viewing as: <strong>{view.toUpperCase()}</strong></span>
        </div>
      )}

      {/* CHAT */}
      <div className="admin-chat-section">
        <button className="admin-chat-toggle" onClick={()=>setChatOpen(o=>!o)}>
          {chatOpen ? '▲ Hide Chat Panel' : '▼ Show Chat Panel 💬'}
        </button>
        {chatOpen && <AdminChatPanel />}
      </div>

      {/* ORDERS GRID */}
      {orders.length === 0 && (
        <div style={{textAlign:'center',padding:'60px 20px',color:'#aaa',fontSize:'14px'}}>
          No orders found for {fmtDisplay(selectedDate)}
        </div>
      )}

      <div className="orders-masonry">
        {orders.map(order => {
          const splits = parseSplits(order.payment_splits);
          const hasWhishPending = splits.some(s=>s.method==='card'&&s.cardType==='whish'&&!s.whishVerified);
          return (
            <div key={order.id} className={`admin-order-card status-${order.status.toLowerCase()} ${order.status!=='Paid'?'unpaid-border':'paid-border'} ${hasWhishPending?'whish-pending-border':''}`}>

              <div className="admin-card-header">
                <span className="order-id">#ORD-{order.id}</span>
                <div className="header-badges">
                  <span className={`status-chip chip-${order.status.toLowerCase()}`}>{order.status}</span>
                  <span className={`payment-badge ${order.status==='Paid'?'paid':'pending'}`}>{order.status==='Paid'?'💰 PAID':'⚠️ UNPAID'}</span>
                  <span className="table-badge">TABLE {order.table_id||'N/A'}</span>
                </div>
                {(order.status==='Paid'||order.status==='Rejected') && (
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
                    {splits.length>0 ? splits.map((s,i)=>renderSplitPill(s,i,order.id)) : <div className="admin-split-pill">💵 Cash</div>}
                  </div>
                </div>
                <div className="order-financials">
                  <p className="total-amount">TOTAL: <span>${Number(order.total_price).toFixed(2)}</span></p>
                </div>
                <p className="order-time">🕒 {new Date(order.created_at).toLocaleTimeString()}</p>
                {order.status==='Rejected' && <p className="reject-reason">❌ {order.rejection_reason||'Not specified'}</p>}
              </div>

              <div className="admin-card-actions">
                {view==="admin" && (
                  <>
                    {(order.status==='Requested'||order.status==='PaymentPending') && (
                      <div className="action-row">
                        <button className="btn-action start" onClick={()=>handleStatusUpdate(order.id,'Accepted')}>ACCEPT ✅</button>
                        <button className="btn-action reject" onClick={()=>handleStatusUpdate(order.id,'Rejected')}>REJECT</button>
                      </div>
                    )}
                    {order.status==='Accepted' && <button className="btn-action cook" onClick={()=>handleStatusUpdate(order.id,'Preparing')}>START COOKING 👨‍🍳</button>}
                    {order.status==='Preparing' && <button className="btn-action ready" onClick={()=>handleStatusUpdate(order.id,'Ready')}>MARK READY 🔔</button>}
                    {order.status==='Ready' && <button className="btn-action serve" onClick={()=>handleStatusUpdate(order.id,'Served')}>MARK SERVED ✅</button>}
                   {order.status !== 'Paid' && order.status !== 'Rejected' && (
                      <button className="btn-action pay" onClick={()=>handleStatusUpdate(order.id,'Paid')}>CONFIRM PAYMENT 💰</button>
                    )}
                  </>
                )}
                {view==="waiter" && (
                  order.status==='Ready'
                    ? <button className="btn-action serve" onClick={()=>handleStatusUpdate(order.id,'Served')}>SERVE 🍽️</button>
                    : <p className="waiting-label">{order.status==='Preparing'?'👨‍🍳 Kitchen is cooking...':'⏳ Waiting...'}</p>
                )}
                {view==="kitchen" && (
                  <>
                    {order.status==='Accepted' && <button className="btn-action cook" onClick={()=>handleStatusUpdate(order.id,'Preparing')}>START COOKING 👨‍🍳</button>}
                    {order.status==='Preparing' && <button className="btn-action ready" onClick={()=>handleStatusUpdate(order.id,'Ready')}>MARK READY 🔔</button>}
                    {order.status==='Requested' && <p className="waiting-label">⏳ Awaiting admin approval...</p>}
                  </>
                )}
                {order.status==='Paid' && <span className="order-completed-label">✅ ARCHIVED</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Admin;
