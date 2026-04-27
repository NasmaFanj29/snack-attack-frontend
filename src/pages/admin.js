import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import '../style/admin.css';
import AdminChatPanel from '../components/AdminChatPanel';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND = "https://snack-attack-backend.onrender.com";
const toDateStr = (d) => d.toISOString().slice(0, 10);
const today = () => toDateStr(new Date());
const fmtDisplay = (str) => {
  const d = new Date(str + 'T00:00:00');
  const isToday = str === today();
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  return (isToday ? 'Today' : '') + d.toLocaleDateString('en-US', opts);
};

// ── Waiter Panel Content ─────────────────────────────────────────
function WaiterPanel({ orders, onStatusUpdate }) {
  const readyOrders = orders.filter(o => o.status === 'Paid-Ready');
  const cashOrders  = orders.filter(o => {
    if (o.status !== 'PaymentPending') return false;
    try {
      const s = typeof o.payment_splits === 'string' ? JSON.parse(o.payment_splits) : (o.payment_splits || []);
      return s.some(sp => sp.method === 'cash');
    } catch { return false; }
  });
  const activeOrders = orders.filter(o => !['Paid','Rejected'].includes(o.status));
  const [tab, setTab] = useState('deliver');

  const getParsed = (raw) => { try { return typeof raw==='string'?JSON.parse(raw):(raw||[]); } catch { return []; } };

  return (
    <div className="drawer-inner">
      <div className="drawer-tabs">
        {[
          { k:'deliver', label:`🚀 Deliver`, count: readyOrders.length },
          { k:'cash',    label:`💵 Cash`,    count: cashOrders.length },
          { k:'all',     label:`📋 All`,     count: activeOrders.length },
        ].map(t => (
          <button key={t.k} className={`dtab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k)}>
            {t.label} {t.count > 0 && <span className="dtab-count">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="drawer-scroll">
        {tab === 'deliver' && (
          readyOrders.length === 0
            ? <p className="drawer-empty">✅ All delivered!</p>
            : readyOrders.map(o => (
              <div key={o.id} className="mini-order-card ready">
                <div className="moc-top"><span className="moc-id">#{o.id}</span><span className="moc-table">TABLE {o.table_id}</span></div>
                <div className="moc-badge ready-pulse">🔔 READY</div>
                <button className="moc-btn green" onClick={()=>onStatusUpdate(o.id,'Paid')}>✅ DELIVERED</button>
              </div>
            ))
        )}
        {tab === 'cash' && (
          cashOrders.length === 0
            ? <p className="drawer-empty">💳 No cash pending</p>
            : cashOrders.map(o => {
              const splits = getParsed(o.payment_splits).filter(s=>s.method==='cash');
              const total  = splits.reduce((s,p)=>s+Number(p.amount||0),0);
              return (
                <div key={o.id} className="mini-order-card cash">
                  <div className="moc-top"><span className="moc-id">#{o.id}</span><span className="moc-table">TABLE {o.table_id}</span></div>
                  <div className="moc-amount">💵 ${total.toFixed(2)}</div>
                  {splits.map((s,i)=>(
                    <span key={i} className="moc-payer">{s.name||'Guest'}: {Number(s.amount).toFixed(2)} {s.currency}</span>
                  ))}
                </div>
              );
            })
        )}
        {tab === 'all' && (
          activeOrders.length === 0
            ? <p className="drawer-empty">😴 No active orders</p>
            : activeOrders.map(o => (
              <div key={o.id} className="mini-track-row">
                <span className="mtr-id">#{o.id}</span>
                <span className="mtr-table">T{o.table_id}</span>
                <span className={`mtr-status s-${(o.status||'').toLowerCase().replace('-','')}`}>{o.status}</span>
                <span className="mtr-total">${Number(o.total_price).toFixed(2)}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ── Kitchen Panel Content ────────────────────────────────────────
function KitchenPanel({ orders, onStatusUpdate }) {
  const live = orders.filter(o => ['Paid-Accepted','Paid-Preparing','Paid-Ready'].includes(o.status));
  const [filter, setFilter] = useState('all');

  const parseItems = (order) => {
    try {
      const raw = order.items || order.order_items || [];
      const arr = typeof raw==='string' ? JSON.parse(raw) : raw;
      return Array.isArray(arr) ? arr.filter(i=>i&&i.name) : [];
    } catch { return []; }
  };

  const visible = live.filter(o =>
    filter === 'new'      ? o.status === 'Paid-Accepted'  :
    filter === 'cooking'  ? o.status === 'Paid-Preparing' : true
  );

  return (
    <div className="drawer-inner">
      <div className="drawer-tabs">
        {[
          { k:'all',     label:'📋 All',     count: live.length },
          { k:'new',     label:'🔔 New',     count: orders.filter(o=>o.status==='Paid-Accepted').length },
          { k:'cooking', label:'🔥 Cooking', count: orders.filter(o=>o.status==='Paid-Preparing').length },
        ].map(t => (
          <button key={t.k} className={`dtab ${filter===t.k?'active':''}`} onClick={()=>setFilter(t.k)}>
            {t.label} {t.count > 0 && <span className="dtab-count">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="drawer-scroll">
        {visible.length === 0 && <p className="drawer-empty">🍽️ No active orders</p>}
        {visible.map(o => {
          const items = parseItems(o);
          const isNew  = o.status === 'Paid-Accepted';
          const isCook = o.status === 'Paid-Preparing';
          return (
            <div key={o.id} className={`mini-order-card ${isNew?'k-new':isCook?'k-cook':'k-ready'}`}>
              <div className="moc-top">
                <span className="moc-id">#{o.id}</span>
                <span className="moc-table">TABLE {o.table_id}</span>
                <span className={`moc-kstatus ${isNew?'new':isCook?'cook':'ready'}`}>
                  {isNew?'NEW':isCook?'COOKING':'READY'}
                </span>
              </div>
              <div className="moc-items">
                {items.slice(0,4).map((item,i)=>(
                  <div key={i} className="moc-item-row">
                    <span className="moc-qty">{item.quantity}×</span>
                    <span className="moc-name">{item.name}</span>
                  </div>
                ))}
                {items.length > 4 && <span className="moc-more">+{items.length-4} more</span>}
              </div>
              {isNew && <button className="moc-btn orange" onClick={()=>onStatusUpdate(o.id,'Paid-Preparing')}>🔥 START COOKING</button>}
              {isCook && <button className="moc-btn teal"  onClick={()=>onStatusUpdate(o.id,'Paid-Ready')}>✅ MARK READY</button>}
              {o.status==='Paid-Ready' && <div className="moc-waiting">🔔 Waiting for waiter...</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Admin Component ─────────────────────────────────────────
function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [allOrders, setAllOrders]     = useState([]);
  const [chatOpen, setChatOpen]       = useState(false);
  const [selectedDate, setSelectedDate] = useState(today());
  const [drawer, setDrawer]           = useState(null); // null | 'waiter' | 'kitchen'
  const [drawerSize, setDrawerSize]   = useState('normal'); // 'normal' | 'large'

  useEffect(() => { if (!user) navigate('/login'); }, [user]);

  const fetchOrders = async () => {
    try { const res = await axios.get(`${BACKEND}/admin/orders`); setAllOrders(res.data); }
    catch (err) { console.error(err); }
  };
  useEffect(() => { fetchOrders(); const t = setInterval(fetchOrders, 4000); return ()=>clearInterval(t); }, []);

  const orders = allOrders.filter(o => o.created_at?.slice(0,10) === selectedDate);
  const changeDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    if (next <= today()) setSelectedDate(next);
  };

  const totalOrders  = orders.length;
  const totalRevenue = orders.filter(o=>o.status==='Paid').reduce((s,o)=>s+Number(o.total_price||0),0);
  const activeCount  = orders.filter(o=>!['Paid','Rejected'].includes(o.status)).length;
  const readyCount   = allOrders.filter(o=>o.status==='Paid-Ready').length;
  const pendingCount = allOrders.filter(o=>o.status==='PaymentPending').length;

  const parseSplits = (raw) => { try { const p=typeof raw==='string'?JSON.parse(raw):raw; return Array.isArray(p)?p:[]; } catch { return []; } };

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
    if (!window.confirm('Remove this order?')) return;
    try {
      const res = await axios.delete(`${BACKEND}/admin/orders/${orderId}`);
      if (res.data?.success) setAllOrders(prev => prev.filter(o => o.id !== orderId));
    } catch { alert('Error deleting.'); }
  };

  const handleConfirmCustomerTx = async (orderId, splitId) => {
    const order = allOrders.find(o=>o.id===orderId); if (!order) return;
    const splits = parseSplits(order.payment_splits);
    const updated = splits.map(s => s.id===splitId ? {...s, whishVerified:true} : s);
    try {
      await axios.put(`${BACKEND}/admin/orders/${orderId}/status`, { payment_splits:updated, replace_splits:true });
      setAllOrders(prev => prev.map(o => o.id===orderId ? {...o, payment_splits:JSON.stringify(updated)} : o));
    } catch { alert('Error confirming TX ID.'); }
  };

  const handleRequestTxId = async (orderId, splitId) => {
    const order = allOrders.find(o=>o.id===orderId); if (!order) return;
    const splits = parseSplits(order.payment_splits);
    const updated = splits.map(s => s.id===splitId ? {...s, txIdRequested:true} : s);
    try {
      await axios.put(`${BACKEND}/admin/orders/${orderId}/status`, { payment_splits:updated, replace_splits:true });
      setAllOrders(prev => prev.map(o => o.id===orderId ? {...o, payment_splits:JSON.stringify(updated)} : o));
    } catch { alert('Error sending request.'); }
  };

  const renderSplitPill = (s, i, orderId) => {
    const method  = s.method || 'cash';
    const isWhish = method === 'card' && !!s.whishCode;
    const whishRef = `ORD-${orderId}-${s.whishCode||'???'}`;
    if (method === 'cash') {
      const firstAmt=Number(s.amount||0), secondAmt=Number(s.cashSecondAmount||0);
      const firstCurr=s.currency||'USD', secondCurr=firstCurr==='USD'?'LBP':'USD';
      return (
        <div key={i} className="admin-split-pill cash-pill">
          <div className="split-top"><span className="split-method-tag">💵 Cash</span>
            <span className="split-amt">{firstAmt.toLocaleString()} <span className={`currency-tag ${firstCurr==='LBP'?'lbp':'usd'}`}>{firstCurr}</span></span>
          </div>
          {s.cashHasSplit && secondAmt>0 && (
            <div className="split-top" style={{marginTop:4,borderTop:'1px dashed rgba(0,0,0,0.1)',paddingTop:4}}>
              <span className="split-method-tag" style={{visibility:'hidden'}}>💵</span>
              <span className="split-amt">{secondAmt.toLocaleString()} <span className={`currency-tag ${secondCurr==='LBP'?'lbp':'usd'}`}>{secondCurr}</span></span>
            </div>
          )}
          {s.name  && <div className="split-user-name">👤 {s.name}</div>}
          {s.phone && <div className="split-phone">📞 {s.phone}</div>}
        </div>
      );
    }
    if (method === 'card') {
      const cardType=s.cardType||'';
      let cardLabel='💳 Card';
      if (isWhish) cardLabel='📱 Whish';
      else if (cardType==='visa') cardLabel='💳 Visa';
      else if (cardType==='mastercard') cardLabel='💳 Mastercard';
      else if (cardType==='omt') cardLabel='💸 OMT';
      return (
        <div key={i} className={`admin-split-pill card-pill ${isWhish?'whish-pill':cardType} ${s.whishVerified?'verified':''}`}>
          <div className="split-top"><span className="split-method-tag">{cardLabel}</span><span className="split-amt">${Number(s.amount||0).toFixed(2)}</span></div>
          {s.name  && <div className="split-user-name">👤 {s.name}</div>}
          {s.phone && <div className="split-phone">📞 {s.phone}</div>}
          {isWhish && <div className="whish-ref-admin" style={{marginTop:5,fontSize:11}}><span className="ref-label">Note: </span><span className="ref-code">{whishRef}</span></div>}
          {isWhish && (
            s.whishVerified
              ? <div style={{marginTop:6,fontSize:12,color:'#22c55e',fontWeight:'bold'}}>✅ Verified: {s.transactionId}</div>
              : s.transactionId
              ? <div style={{marginTop:6,fontSize:12,color:'#3b82f6',fontWeight:'bold'}}>📨 Customer Sent: {s.transactionId}</div>
              : <div style={{marginTop:6,fontSize:11,color:'#f59e0b'}}>⏳ Awaiting TX ID</div>
          )}
          {isWhish && !s.whishVerified && (
            <div style={{marginTop:10,borderTop:'1px solid rgba(0,0,0,0.08)',paddingTop:10}}>
              {s.transactionId
                ? <button className="btn-action start" style={{width:'100%',padding:8,fontSize:12}} onClick={()=>handleConfirmCustomerTx(orderId,s.id)}>✅ CONFIRM TX ID</button>
                : !s.txIdRequested && <button style={{width:'100%',padding:8,background:'#f59e0b',color:'#000',border:'none',borderRadius:6,fontWeight:'bold',cursor:'pointer'}} onClick={()=>handleRequestTxId(orderId,s.id)}>📩 Request Transaction ID</button>
              }
              {s.txIdRequested && !s.transactionId && <p style={{margin:'6px 0 0',fontSize:11,color:'#f59e0b',textAlign:'center'}}>📢 Request sent to customer</p>}
            </div>
          )}
        </div>
      );
    }
    return <div key={i} className="admin-split-pill"><div className="split-top"><span className="split-method-tag">💳</span><span className="split-amt">${Number(s.amount||0).toFixed(2)}</span></div>{s.name&&<div className="split-user-name">👤 {s.name}</div>}</div>;
  };

  const openDrawer = (type) => {
    if (drawer === type) { setDrawer(null); }
    else { setDrawer(type); setDrawerSize('normal'); }
  };

  return (
    <div className="admin-layout">

      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🍔</span>
          <div>
            <div className="brand-name">SNACK</div>
            <div className="brand-sub">ATTACK</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">VIEWS</div>

          <button className="nav-item active-nav">
            <span className="nav-icon">👑</span>
            <span>Admin</span>
          </button>

          <button
            className={`nav-item ${drawer==='waiter'?'nav-open':''}`}
            onClick={()=>openDrawer('waiter')}
          >
            <span className="nav-icon">🍽️</span>
            <span>Waiter</span>
            {readyCount > 0 && <span className="nav-badge green">{readyCount}</span>}
            <span className="nav-arrow">{drawer==='waiter'?'◀':'▶'}</span>
          </button>

          <button
            className={`nav-item ${drawer==='kitchen'?'nav-open':''}`}
            onClick={()=>openDrawer('kitchen')}
          >
            <span className="nav-icon">👨‍🍳</span>
            <span>Kitchen</span>
            {allOrders.filter(o=>o.status==='Paid-Accepted').length > 0 &&
              <span className="nav-badge red">{allOrders.filter(o=>o.status==='Paid-Accepted').length}</span>
            }
            <span className="nav-arrow">{drawer==='kitchen'?'◀':'▶'}</span>
          </button>

          <div className="nav-section-label" style={{marginTop:16}}>TOOLS</div>

          <button className={`nav-item ${chatOpen?'nav-open':''}`} onClick={()=>setChatOpen(o=>!o)}>
            <span className="nav-icon">💬</span>
            <span>Chat</span>
          </button>
        </nav>

        {/* Sidebar Stats */}
        <div className="sidebar-stats">
          <div className="ss-row"><span>Active</span><span className="ss-val gold">{allOrders.filter(o=>!['Paid','Rejected'].includes(o.status)).length}</span></div>
          <div className="ss-row"><span>Ready</span><span className="ss-val green">{readyCount}</span></div>
          <div className="ss-row"><span>Pending $</span><span className="ss-val orange">{pendingCount}</span></div>
        </div>

        <button className="sidebar-logout" onClick={()=>{logout();navigate('/login');}}>
          ⏻ Logout
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className={`admin-main ${drawer?'drawer-pushed':''} ${drawer&&drawerSize==='large'?'drawer-pushed-large':''}`}>

        {/* Top strip */}
        <div className="admin-topstrip">
          <div className="topstrip-date">
            <button className="ts-nav-btn" onClick={()=>changeDate(-1)}>‹</button>
            <span className="ts-date">{fmtDisplay(selectedDate)}</span>
            <button className="ts-nav-btn" onClick={()=>changeDate(1)} disabled={selectedDate===today()}>›</button>
            {selectedDate!==today() && <button className="ts-today" onClick={()=>setSelectedDate(today())}>Today</button>}
          </div>
          <div className="topstrip-stats">
            <div className="tss-chip"><span className="tss-val">{totalOrders}</span><span className="tss-label">Orders</span></div>
            <div className="tss-chip active"><span className="tss-val">{activeCount}</span><span className="tss-label">Active</span></div>
            <div className="tss-chip revenue"><span className="tss-val">${totalRevenue.toFixed(0)}</span><span className="tss-label">Revenue</span></div>
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="admin-chat-section">
            <AdminChatPanel />
          </div>
        )}

        {/* Orders grid */}
        <div className="orders-masonry">
          {orders.map(order => {
            const splits = parseSplits(order.payment_splits);
            const hasWhishPending = splits.some(sp=>sp.method==='card'&&sp.whishCode&&!sp.whishVerified);
            const firstPayer = splits.find(sp=>sp.name?.trim());
            const displayName  = firstPayer?.name  || order.full_name    || 'Guest';
            const displayPhone = firstPayer?.phone || order.phone_number || '—';
            const s = order.status || '';
            const isPaid           = s.includes('Paid');
            const isRequested      = s === 'Requested';
            const isPaymentPending = s === 'PaymentPending';
            const isWaitingPayment = s === 'Accepted';
            const isAcceptedStage  = s === 'Paid-Accepted';
            const isPreparingStage = s === 'Paid-Preparing';
            const isReadyStage     = s === 'Paid-Ready';
            const isCompleted      = s === 'Paid' || s === 'Served';

            return (
              <div key={order.id} className={`admin-order-card status-${s.toLowerCase()} ${!isPaid?'unpaid-border':'paid-border'} ${hasWhishPending?'whish-pending-border':''}`}>
                <div className="admin-card-header">
                  <span className="order-id">#ORD-{order.id}</span>
                  <div className="header-badges">
                    <span className={`status-chip chip-${s.toLowerCase()}`}>{s}</span>
                    <span className={`payment-badge ${isPaid?'paid':'pending'}`}>{isPaid?'💰 PAID':'⚠️ UNPAID'}</span>
                    <span className="table-badge">T{order.table_id||'?'}</span>
                  </div>
                  {(isCompleted||s==='Rejected') && <button className="delete-x-btn" onClick={()=>handleDeleteOrder(order.id)}>✕</button>}
                </div>

                <div className="admin-card-body">
                  <div className="customer-info">
                    <div className="customer-avatar">
                      {displayName !== 'Guest' ? displayName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="customer-name">{displayName}</p>
                      <p className="customer-phone">{displayPhone}</p>
                    </div>
                  </div>
                  <div className="admin-payment-info-box">
                    <p className="payment-label">Payment Breakdown</p>
                    <div className="splits-list">
                      {splits.length>0 ? splits.map((sp,i)=>renderSplitPill(sp,i,order.id)) : <div className="admin-split-pill">💵 Cash</div>}
                    </div>
                  </div>
                  <div className="order-financials">
                    <p className="total-amount">TOTAL <span>${Number(order.total_price).toFixed(2)}</span></p>
                    <p className="order-time">{new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                  {s==='Rejected' && <p className="reject-reason">❌ {order.rejection_reason||'Not specified'}</p>}
                </div>

                <div className="admin-card-actions">
                  {isRequested && <div className="action-row"><button className="btn-action start" onClick={()=>handleStatusUpdate(order.id,'Accepted')}>ACCEPT ORDER ✅</button><button className="btn-action reject" onClick={()=>handleStatusUpdate(order.id,'Rejected')}>REJECT</button></div>}
                  {isWaitingPayment && <p className="waiting-label">⏳ Waiting for customer payment...</p>}
                  {isPaymentPending && <div className="action-row"><button className="btn-action start" onClick={()=>handleStatusUpdate(order.id,'Paid-Accepted')}>CONFIRM PAYMENT 💰</button><button className="btn-action reject" onClick={()=>handleStatusUpdate(order.id,'Rejected')}>REJECT</button></div>}
                  {isAcceptedStage  && <button className="btn-action cook"  onClick={()=>handleStatusUpdate(order.id,'Paid-Preparing')}>START COOKING 👨‍🍳</button>}
                  {isPreparingStage && <button className="btn-action ready" onClick={()=>handleStatusUpdate(order.id,'Paid-Ready')}>MARK READY 🔔</button>}
                  {isReadyStage     && <p className="waiting-label">🔔 Ready — waiter delivering...</p>}
                  {isCompleted && s!=='Rejected' && <span className="order-completed-label">✅ ARCHIVED</span>}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── SIDE DRAWER (Waiter / Kitchen) ── */}
      {drawer && (
        <div className={`side-drawer ${drawerSize==='large'?'drawer-large':''}`}>
          <div className="drawer-header">
            <span className="drawer-title">
              {drawer==='waiter' ? '🍽️ Waiter Panel' : '👨‍🍳 Kitchen Panel'}
            </span>
            <div className="drawer-header-actions">
              <button
                className="drawer-size-btn"
                onClick={()=>setDrawerSize(s=>s==='normal'?'large':'normal')}
                title={drawerSize==='normal'?'Expand':'Shrink'}
              >
                {drawerSize==='normal'?'⤢':'⤡'}
              </button>
              <button className="drawer-close-btn" onClick={()=>setDrawer(null)}>✕</button>
            </div>
          </div>
          {drawer === 'waiter'
            ? <WaiterPanel  orders={allOrders} onStatusUpdate={handleStatusUpdate} />
            : <KitchenPanel orders={allOrders} onStatusUpdate={handleStatusUpdate} />
          }
        </div>
      )}
    </div>
  );
}

export default Admin;