import React, { useState, useEffect } from 'react';
import ordersService from '../services/ordersService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../style/waiter.css';
import toast from 'react-hot-toast';

const toDateStr = (d) => d.toISOString().slice(0,10);
const today = () => toDateStr(new Date());
const fmtDisplay = (str) => {
  const d = new Date(str + 'T00:00:00');
  const opts = { weekday:'short', month:'short', day:'numeric' };
  return (str === today() ? '📅 Today — ' : '') + d.toLocaleDateString('en-US', opts);
};
const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

const getParsedSplits = (raw) => {
  try { return typeof raw==='string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); }
  catch { return []; }
};

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
        name:           item.name || item.item_name || `Item #${item.item_id || idx+1}`,
        quantity:       Number(item.quantity || 1),
        selectedExtras: toArr(item.selected_extras ?? item.selectedExtras),
        removedExtras:  toArr(item.removed_extras  ?? item.removedExtras),
        specialNote:    item.special_note || item.specialNote || null,
      };
    }).filter(i => i && i.name);
  } catch { return []; }
};

const extrasStr = (arr) =>
  (arr||[]).map(e => typeof e==='object' ? e.name||'' : String(e)).filter(Boolean).join(', ');

export default function Waiter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]             = useState([]);
  const [tab, setTab]                   = useState('cash');
  const [selectedDate, setSelectedDate] = useState(today());
  const [collected, setCollected]       = useState(new Set()); // order ids marked collected
  const [expandedId, setExpandedId]     = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await ordersService.getAdminOrders();
      const list = res?.success
        ? (Array.isArray(res.data?.orders) ? res.data.orders : Array.isArray(res.data) ? res.data : [])
        : [];
      if (res?.success) setOrders(list);
      else toast.error(res?.error || 'Failed to fetch orders');
    } catch {}
  };

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 3000);
    return () => clearInterval(t);
  }, []);

  const update = async (id, status) => {
    try {
      const res = await ordersService.updateOrderStatus(id, { status });
      if (res?.success) setOrders(prev => prev.map(o => o.id===id ? {...o,status} : o));
      else toast.error('Failed to update');
    } catch { toast.error('Network error'); }
  };

  const changeDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    if (next <= today()) setSelectedDate(next);
  };

  /* ── derived ── */
  const dateOrders   = orders.filter(o => o.created_at?.slice(0,10) === selectedDate);
  const activeOrders = dateOrders.filter(o => !['Paid','Rejected','Cancelled'].includes(o.status));
  const readyOrders  = orders.filter(o => o.status === 'Paid-Ready');

  // Cash orders — ALL PaymentPending with cash splits, always live
  const cashOrders = orders.filter(o => {
    if (o.status !== 'PaymentPending') return false;
    return getParsedSplits(o.payment_splits).some(s => s.method === 'cash');
  });

  const totalD  = dateOrders.length;
  const servedD = dateOrders.filter(o => o.status === 'Paid').length;

  const STATUS_COLOR = {
    Requested:'#6b7280', Accepted:'#f59e0b', 'Paid-Accepted':'#f59e0b',
    'Paid-Preparing':'#f97316', 'Paid-Ready':'#95b508',
    Paid:'#3b82f6', PaymentPending:'#a855f7',
    Rejected:'#ef4444', Cancelled:'#ef4444',
  };

  return (
    <div className="waiter-page">

      {/* HEADER */}
      <header className="waiter-header">
        <div className="waiter-header-left">
          <span className="waiter-bell">🛎️</span>
          <div>
            <h1>WAITER</h1>
            <p>Hi, {user?.name}</p>
          </div>
        </div>
        <div className="waiter-header-right">
          <div className={`w-stat ${readyOrders.length > 0 ? 'deliver active' : 'deliver'}`}>
            {readyOrders.length} Ready
          </div>
          <div className={`w-stat ${cashOrders.length > 0 ? 'cash active' : 'cash'}`}>
            {cashOrders.length} Cash
          </div>
          <button className="waiter-logout" onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </button>
        </div>
      </header>

      {/* SUMMARY BAR */}
      <div className="waiter-summary-bar">
        <div className="date-nav">
          <button className="date-nav-btn" onClick={() => changeDate(-1)}>‹</button>
          <span className="date-display">{fmtDisplay(selectedDate)}</span>
          <button className="date-nav-btn" onClick={() => changeDate(1)} disabled={selectedDate===today()}>›</button>
        </div>
        <div style={{position:'relative',display:'inline-block'}}>
          <button className="date-input-btn">
            📅 Pick Date
            <input type="date" className="date-picker-input" value={selectedDate}
              max={today()} onChange={e => { if (e.target.value) setSelectedDate(e.target.value); }} />
          </button>
        </div>
        {selectedDate !== today() && (
          <button className="today-btn" onClick={() => setSelectedDate(today())}>Today</button>
        )}
        <div className="w-summary-stats">
          <div className="w-sum-stat"><span className="w-sum-val">{totalD}</span><span className="w-sum-label">Orders</span></div>
          <div className="w-sum-stat"><span className="w-sum-val green">{servedD}</span><span className="w-sum-label">Served</span></div>
          <div className="w-sum-stat"><span className="w-sum-val gold">{activeOrders.length}</span><span className="w-sum-label">Active</span></div>
        </div>
      </div>

      {/* TABS */}
      <div className="waiter-tabs">
        {[
          { key:'deliver', label:'🚀 Deliver',      count: readyOrders.length },
          { key:'cash',    label:'💵 Collect Cash',  count: cashOrders.length  },
          { key:'all',     label:'📋 Track All',     count: activeOrders.length },
        ].map(t => (
          <button key={t.key} className={`w-tab ${tab===t.key?'active':''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.count > 0 && <span className="w-tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="waiter-content">

        {/* ── DELIVER ── */}
        {tab==='deliver' && (
          readyOrders.length === 0
            ? <div className="w-empty">
                <div className="w-empty-icon">✅</div>
                <p>All orders delivered!</p>
                <span>Take a breath — you're doing great 😊</span>
              </div>
            : <div className="w-order-list">
                {readyOrders.map(order => {
                  const items    = parseItems(order);
                  const isExp    = expandedId === order.id;
                  return (
                    <div key={order.id} className="w-order-card w-card-ready">
                      {/* Top bar */}
                      <div className="w-order-header" onClick={() => setExpandedId(isExp ? null : order.id)}>
                        <div className="w-order-header-left">
                          <span className="w-order-id">#ORD-{order.id}</span>
                          <span className="w-table-chip">TABLE {order.table_id}</span>
                          <span className="w-ready-badge">🔔 READY</span>
                        </div>
                        <div className="w-order-header-right">
                          <span className="w-time">🕒 {fmtTime(order.created_at)}</span>
                          <span className="w-expand">{isExp ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Items (expanded) */}
                      {isExp && (
                        <div className="w-items-list">
                          {items.length === 0
                            ? <p className="w-no-items">No items</p>
                            : items.map((item,i) => (
                              <div key={i} className="w-item-row">
                                <span className="w-item-qty">{item.quantity}×</span>
                                <div className="w-item-detail">
                                  <span className="w-item-name">{item.name}</span>
                                  {item.selectedExtras?.length > 0 && (
                                    <span className="w-item-extras">➕ {extrasStr(item.selectedExtras)}</span>
                                  )}
                                  {item.removedExtras?.length > 0 && (
                                    <span className="w-item-removed">✕ No {extrasStr(item.removedExtras)}</span>
                                  )}
                                  {item.specialNote && (
                                    <span className="w-item-note">📝 {item.specialNote}</span>
                                  )}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      )}

                      {/* Action */}
                      <div className="w-order-footer">
                        <button className="w-btn green" onClick={() => update(order.id, 'Paid')}>
                          ✅ DELIVERED TO TABLE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {/* ── COLLECT CASH ── */}
        {tab==='cash' && (
          cashOrders.length === 0
            ? <div className="w-empty">
                <div className="w-empty-icon">💳</div>
                <p>No cash collections pending</p>
                <span>All payments handled 👍</span>
              </div>
            : <div className="w-order-list">
                {cashOrders.map(order => {
                  const splits    = getParsedSplits(order.payment_splits).filter(s => s.method==='cash');
                  const cashTotal = splits.reduce((s,p) => s + Number(p.amount_usd||p.amount||0), 0);
                  const items     = parseItems(order);
                  const isExp     = expandedId === order.id;
                  const isColl    = collected.has(order.id);

                  return (
                    <div key={order.id} className={`w-order-card w-card-cash ${isColl ? 'w-card-collected' : ''}`}>
                      {/* Top bar */}
                      <div className="w-order-header" onClick={() => setExpandedId(isExp ? null : order.id)}>
                        <div className="w-order-header-left">
                          <span className="w-order-id">#ORD-{order.id}</span>
                          <span className="w-table-chip">TABLE {order.table_id}</span>
                          {isColl && <span className="w-collected-badge">✓ COLLECTED</span>}
                        </div>
                        <div className="w-order-header-right">
                          <span className="w-cash-total">💵 ${cashTotal.toFixed(2)}</span>
                          <span className="w-expand">{isExp ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Payers */}
                      <div className="w-payers-row">
                        {splits.map((s,i) => (
                          <span key={i} className="w-payer-chip">
                            {s.payer_name||s.name||`Person ${i+1}`}: ${Number(s.amount_usd||s.amount||0).toFixed(2)}
                          </span>
                        ))}
                      </div>

                      {/* Items (expanded) */}
                      {isExp && (
                        <div className="w-items-list">
                          {items.length === 0
                            ? <p className="w-no-items">No items</p>
                            : items.map((item,i) => (
                              <div key={i} className="w-item-row">
                                <span className="w-item-qty">{item.quantity}×</span>
                                <div className="w-item-detail">
                                  <span className="w-item-name">{item.name}</span>
                                  {item.selectedExtras?.length > 0 && (
                                    <span className="w-item-extras">➕ {extrasStr(item.selectedExtras)}</span>
                                  )}
                                  {item.removedExtras?.length > 0 && (
                                    <span className="w-item-removed">✕ No {extrasStr(item.removedExtras)}</span>
                                  )}
                                  {item.specialNote && (
                                    <span className="w-item-note">📝 {item.specialNote}</span>
                                  )}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      )}

                      {/* Action */}
                      <div className="w-order-footer">
                        {!isColl
                          ? <button className="w-btn gold"
                              onClick={() => setCollected(prev => new Set([...prev, order.id]))}>
                              💵 MARK AS COLLECTED
                            </button>
                          : <div className="w-collected-msg">Cash collected ✓</div>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {/* ── TRACK ALL ── */}
        {tab==='all' && (
          activeOrders.length === 0
            ? <div className="w-empty">
                <div className="w-empty-icon">😴</div>
                <p>No active orders</p>
                <span>{selectedDate===today() ? 'Waiting for new orders…' : 'No orders on this date.'}</span>
              </div>
            : <div className="w-order-list">
                {activeOrders.map(order => {
                  const items = parseItems(order);
                  const isExp = expandedId === order.id;
                  const col   = STATUS_COLOR[order.status] || '#9ca3af';
                  return (
                    <div key={order.id} className="w-order-card w-card-track">
                      <div className="w-order-header" onClick={() => setExpandedId(isExp ? null : order.id)}>
                        <div className="w-order-header-left">
                          <span className="w-order-id">#ORD-{order.id}</span>
                          <span className="w-table-chip">TABLE {order.table_id}</span>
                          <span className="w-track-status-badge"
                            style={{background: col+'22', color: col, borderColor: col+'44'}}>
                            {order.status}
                          </span>
                        </div>
                        <div className="w-order-header-right">
                          <span className="w-order-total">${Number(order.total_price||0).toFixed(2)}</span>
                          <span className="w-time">{fmtTime(order.created_at)}</span>
                          <span className="w-expand">{isExp ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {isExp && (
                        <div className="w-items-list">
                          {items.length === 0
                            ? <p className="w-no-items">No items</p>
                            : items.map((item,i) => (
                              <div key={i} className="w-item-row">
                                <span className="w-item-qty">{item.quantity}×</span>
                                <div className="w-item-detail">
                                  <span className="w-item-name">{item.name}</span>
                                  {item.selectedExtras?.length > 0 && (
                                    <span className="w-item-extras">➕ {extrasStr(item.selectedExtras)}</span>
                                  )}
                                  {item.removedExtras?.length > 0 && (
                                    <span className="w-item-removed">✕ No {extrasStr(item.removedExtras)}</span>
                                  )}
                                  {item.specialNote && (
                                    <span className="w-item-note">📝 {item.specialNote}</span>
                                  )}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
        )}

      </div>
    </div>
  );
}