import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../style/kitchen.css';

const API = 'https://snack-attack-backend.onrender.com';
const toDateStr = (d) => d.toISOString().slice(0,10);
const today = () => toDateStr(new Date());
const fmtDisplay = (str) => {
  const d = new Date(str + 'T00:00:00');
  const opts = { weekday:'short', month:'short', day:'numeric' };
  return (str === today() ? '📅 Today — ' : '') + d.toLocaleDateString('en-US', opts);
};

// ── Parse items from order (Robust & Clean) ──────────────────
const parseItems = (order) => {
  try {
    let raw = order.items || order.order_items || [];
    let arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    
    if (!Array.isArray(arr)) return [];

    return arr.map((item, idx) => {
      if (!item) return null;
      return {
        name: item.name || item.item_name || `Item #${item.item_id || idx + 1}`,
        quantity: Number(item.quantity || 1),
        selectedExtras: Array.isArray(item.selected_extras) ? item.selected_extras : (Array.isArray(item.selectedExtras) ? item.selectedExtras : []),
        removedExtras: Array.isArray(item.removed_extras) ? item.removed_extras : (Array.isArray(item.removedExtras) ? item.removedExtras : []),
        specialNote: item.special_note || item.specialNote || null
      };
    }).filter(i => i && i.name);
  } catch (e) {
    console.error("❌ Error parsing items for order #" + order.id, e);
    return []; 
  }
};

export default function Kitchen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(today());

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/admin/orders`);
      setAllOrders(res.data);
    } catch {}
  };

  useEffect(() => { fetchOrders(); const t = setInterval(fetchOrders, 4000); return () => clearInterval(t); }, []);

  const update = async (id, status) => {
    try {
      await axios.put(`${API}/admin/orders/${id}/status`, { status });
      setAllOrders(prev => prev.map(o => o.id===id ? {...o, status} : o));
    } catch { alert('Error updating order'); }
  };

  const changeDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    if (next <= today()) setSelectedDate(next);
  };

  const dateOrders = allOrders.filter(o => o.created_at?.slice(0,10) === selectedDate);

  // Live: show Accepted + Preparing always. Past dates: show all
  const liveOrders = selectedDate === today()
    ? allOrders.filter(o => ['Accepted','Preparing'].includes(o.status))
    : dateOrders;

  const visible = liveOrders.filter(o =>
    filter === 'all' ? true :
    filter === 'new' ? o.status === 'Accepted' :
    o.status === 'Preparing'
  );

  const totalToday   = dateOrders.length;
  const activeCount  = dateOrders.filter(o => ['Accepted','Preparing'].includes(o.status)).length;
  const doneCount    = dateOrders.filter(o => ['Ready','Served','Paid'].includes(o.status)).length;

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
            {allOrders.filter(o=>o.status==='Accepted').length} New
          </div>
          <div className="kitchen-stat prep">
            {allOrders.filter(o=>o.status==='Preparing').length} Cooking
          </div>
          <button className="kitchen-logout" onClick={()=>{logout();navigate('/login');}}>
            Logout
          </button>
        </div>
      </header>

      {/* DAILY SUMMARY */}
      <div className="kitchen-summary-bar">
        <div className="date-nav">
          <button className="date-nav-btn" onClick={()=>changeDate(-1)}>‹</button>
          <span className="date-display">{fmtDisplay(selectedDate)}</span>
          <button className="date-nav-btn" onClick={()=>changeDate(1)} disabled={selectedDate===today()}>›</button>
        </div>
        <div style={{position:'relative',display:'inline-block'}}>
          <button className="date-input-btn">
            📅 Pick Date
            <input type="date" className="date-picker-input" value={selectedDate} max={today()}
              onChange={e => { if(e.target.value) setSelectedDate(e.target.value); }} />
          </button>
        </div>
        {selectedDate !== today() && (
          <button className="today-btn" onClick={()=>setSelectedDate(today())}>Go to Today</button>
        )}
        <div className="k-summary-stats">
          <div className="k-sum-stat"><span className="k-sum-val gold">{totalToday}</span><span className="k-sum-label">Orders</span></div>
          <div className="k-sum-stat"><span className="k-sum-val red">{activeCount}</span><span className="k-sum-label">Active</span></div>
          <div className="k-sum-stat"><span className="k-sum-val green">{doneCount}</span><span className="k-sum-label">Done</span></div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="kitchen-filters">
        {['all','new','preparing'].map(f => (
          <button key={f} className={`kf-btn ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>
            {f==='all' ? '📋 All' : f==='new' ? '🔔 New' : '🔥 Cooking'}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="kitchen-empty">
          <p>🍽️</p>
          <p>{selectedDate===today() ? 'No active orders. Relax! 😎' : 'No orders for this date.'}</p>
        </div>
      )}

      {/* ORDERS GRID */}
      <div className="kitchen-grid">
        {visible.map(order => {
          const items = parseItems(order);

          return (
            <div key={order.id} className={`kitchen-card ${order.status==='Accepted'?'k-new':'k-cooking'}`}>

              {/* Items List */}
              <div className="k-items-list">
                {items.length === 0 ? (
                  <p className="k-no-items">❌ No items in this order</p>
                ) : (
                  items.map((item, i) => {
                    const itemName = item.name || `Item #${i + 1}`;
                    const qty = item.quantity || 1;
              
                    // Format extras nicely
                    const extras = (item.selectedExtras || []);
                    const extrasText = extras.length > 0
                      ? extras.map(e => {
                          if (typeof e === 'string') return e;
                          if (typeof e === 'object') return e.name || e;
                          return '';
                        }).filter(Boolean).join(', ')
                      : null;
              
                    // Format removed items
                    const removed = (item.removedExtras || []);
                    const removedText = removed.length > 0
                      ? removed.map(e => {
                          if (typeof e === 'string') return e;
                          if (typeof e === 'object') return e.name || e.extra_name || e;
                          return '';
                        }).filter(Boolean).join(', ')
                      : null;
              
                    const note = item.specialNote || null;
              
                    return (
                      <div key={i} className="k-item-row">
                        <span className="k-item-qty">{qty}×</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className="k-item-name">🍔 {itemName}</span>
                          {extrasText && (
                            <span className="k-item-extras">
                              ➕ {extrasText}
                            </span>
                          )}
                          {removedText && (
                            <span className="k-item-removed">
                              ✂️ No: {removedText}
                            </span>
                          )}
                          {note && (
                            <span className="k-item-note">
                              📝 {note}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action */}
              <div className="k-actions">
                {order.status==='Accepted' && (
                  <button className="k-btn start" onClick={()=>update(order.id,'Preparing')}>
                    🔥 START COOKING
                  </button>
                )}
                {order.status==='Preparing' && (
                  <button className="k-btn ready" onClick={()=>update(order.id,'Ready')}>
                    ✅ MARK READY
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}