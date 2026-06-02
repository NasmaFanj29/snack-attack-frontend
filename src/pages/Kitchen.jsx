import React, { useState, useEffect } from 'react';
import ordersService from '../services/ordersService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../style/kitchen.css';
import toast from 'react-hot-toast';

const toDateStr = (d) => d.toISOString().slice(0,10);
const today = () => toDateStr(new Date());
const fmtDisplay = (str) => {
  const d = new Date(str + 'T00:00:00');
  const opts = { weekday:'short', month:'short', day:'numeric' };
  return (str === today() ? '📅 Today — ' : '') + d.toLocaleDateString('en-US', opts);
};

/* ── parseItems: grab selectedExtras, removedExtras, specialNote ── */
const parseItems = (order) => {
  try {
    let raw = order.items || order.order_items || [];
    let arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.map((item, idx) => {
      if (!item) return null;

      const toArr = (v) => {
        if (Array.isArray(v)) return v;
        if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
        return [];
      };

      return {
        name:          item.name || item.item_name || `Item #${item.item_id || idx + 1}`,
        quantity:      Number(item.quantity || 1),
        selectedExtras: toArr(item.selected_extras ?? item.selectedExtras),
        removedExtras:  toArr(item.removed_extras  ?? item.removedExtras),
        specialNote:   item.special_note || item.specialNote || null,
      };
    }).filter(i => i && i.name);
  } catch (e) { return []; }
};

/* ── helper: turn an extras array into a comma-joined string ── */
const extrasStr = (arr) =>
  (arr || [])
    .map(e => (typeof e === 'object' ? e.name || '' : String(e)))
    .filter(Boolean)
    .join(', ');

export default function Kitchen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(today());
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await ordersService.getAdminOrders();
      if (res?.success) setAllOrders(Array.isArray(res.data?.orders) ? res.data.orders : Array.isArray(res.data) ? res.data : []);
      else { setAllOrders([]); toast.error(res?.error || 'Failed to fetch orders'); }
    } catch {}
  };

  useEffect(() => { fetchOrders(); const t = setInterval(fetchOrders, 4000); return () => clearInterval(t); }, []);

  const update = async (id, status) => {
    try {
      const res = await ordersService.updateOrderStatus(id, { status });
      if (res?.success) setAllOrders(prev => prev.map(o => o.id===id ? {...o, status} : o));
    } catch { alert('Error updating order'); }
  };

  const changeDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    if (next <= today()) setSelectedDate(next);
  };

  const dateOrders = allOrders.filter(o => o.created_at?.slice(0,10) === selectedDate);

  const liveOrders = selectedDate === today()
    ? allOrders.filter(o => ['Paid-Accepted','Paid-Preparing','Paid-Ready'].includes(o.status))
    : dateOrders;

  const visible = liveOrders.filter(o =>
    filter === 'all'       ? true :
    filter === 'new'       ? o.status === 'Paid-Accepted' :
    filter === 'preparing' ? o.status === 'Paid-Preparing' : true
  );

  const totalToday  = dateOrders.length;
  const activeCount = dateOrders.filter(o => ['Paid-Accepted','Paid-Preparing','Paid-Ready'].includes(o.status)).length;
  const doneCount   = dateOrders.filter(o => o.status === 'Paid').length;

  return (
    <div className="kitchen-page">
      {/* HEADER */}
      <header className="kitchen-header">
        <div className="kitchen-header-left">
          <span className="kitchen-icon">👨‍🍳</span>
          <div>
            <h1>KITCHEN</h1>
            <p>Welcome, {user?.name}</p>
          </div>
        </div>
        <div className="kitchen-header-right">
          <div className="kitchen-stat new">
            {allOrders.filter(o => o.status === 'Paid-Accepted').length} New
          </div>
          <div className="kitchen-stat prep">
            {allOrders.filter(o => o.status === 'Paid-Preparing').length} Cooking
          </div>
          <button className="kitchen-logout" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </header>

      {/* DAILY SUMMARY */}
      <div className="kitchen-summary-bar">
        <div className="date-nav">
          <button className="date-nav-btn" onClick={() => changeDate(-1)}>‹</button>
          <span className="date-display">{fmtDisplay(selectedDate)}</span>
          <button className="date-nav-btn" onClick={() => changeDate(1)} disabled={selectedDate === today()}>›</button>
        </div>
        <div className="k-summary-stats">
          <div className="k-sum-stat"><span className="k-sum-val gold">{totalToday}</span><span className="k-sum-label">Orders</span></div>
          <div className="k-sum-stat"><span className="k-sum-val red">{activeCount}</span><span className="k-sum-label">Active</span></div>
          <div className="k-sum-stat"><span className="k-sum-val green">{doneCount}</span><span className="k-sum-label">Done</span></div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="kitchen-filters">
        {['all','new','preparing'].map(f => (
          <button key={f} className={`kf-btn ${filter===f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f==='all' ? '📋 All' : f==='new' ? '🔔 New' : '🔥 Cooking'}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="kitchen-empty">
          <p>🍽️</p>
          <p>{selectedDate === today() ? 'No active orders. Relax! 😎' : 'No orders for this date.'}</p>
        </div>
      )}

      <div className="kitchen-grid">
        {visible.map(order => {
          const items = parseItems(order);
          const s = order.status || "";
          const isAcceptedStage  = s === 'Paid-Accepted';
          const isPreparingStage = s === 'Paid-Preparing';
          const isReadyStage     = s === 'Paid-Ready';
          const isExpanded       = expandedId === order.id;

          return (
            <div
              key={order.id}
              className={`kitchen-card ${isAcceptedStage ? 'k-new' : isPreparingStage ? 'k-cooking' : 'k-ready'}`}
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="k-card-header" style={{ display:'flex', justifyContent:'space-between', padding:'10px', background:'rgba(0,0,0,0.05)', borderBottom:'1px solid #ddd', fontWeight:'bold' }}>
                <span className="k-order-id">#ORD-{order.id}</span>
                <span className="k-table-badge">TABLE {order.table_id || '1'}</span>
                <span style={{ fontSize:'12px', color:'#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {!isExpanded ? (
                <div style={{ padding:'8px 12px', fontSize:'13px', color:'#888' }}>
                  {items.length} item{items.length !== 1 ? 's' : ''} — tap to view
                </div>
              ) : (
                <div className="k-items-list">
                  {items.length === 0 ? (
                    <p className="k-no-items">❌ No items</p>
                  ) : (
                    items.map((item, i) => (
                      <div key={i} className="k-item-row">
                        <span className="k-item-qty">{item.quantity}×</span>
                        <div style={{ flex: 1 }}>
                          <span className="k-item-name">🍔 {item.name}</span>

                          {/* ➕ Added extras */}
                          {item.selectedExtras?.length > 0 && (
                            <span className="k-item-extras">
                              ➕ {extrasStr(item.selectedExtras)}
                            </span>
                          )}

                          {/* ✕ Removed ingredients */}
                          {item.removedExtras?.length > 0 && (
                            <span className="k-item-removed">
                              ✕ No {extrasStr(item.removedExtras)}
                            </span>
                          )}

                          {/* 📝 Special note */}
                          {item.specialNote && (
                            <span className="k-item-note">
                              📝 {item.specialNote}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="k-actions" onClick={e => e.stopPropagation()}>
                {isAcceptedStage && (
                  <button className="k-btn start" onClick={() => update(order.id, 'Paid-Preparing')}>🔥 START COOKING</button>
                )}
                {isPreparingStage && (
                  <button className="k-btn ready" onClick={() => update(order.id, 'Paid-Ready')}>✅ MARK READY</button>
                )}
                {isReadyStage && (
                  <div style={{ padding:'8px', textAlign:'center', color:'#95b508', fontWeight:'bold' }}>
                    🔔 WAITING FOR WAITER
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}