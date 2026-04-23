import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../style/waiter.css';

const API = 'https://snack-attack-backend.onrender.com';
const toDateStr = (d) => d.toISOString().slice(0,10);
const today = () => toDateStr(new Date());
const fmtDisplay = (str) => {
  const d = new Date(str + 'T00:00:00');
  const opts = { weekday:'short', month:'short', day:'numeric' };
  return (str === today() ? '📅 Today — ' : '') + d.toLocaleDateString('en-US', opts);
};

export default function Waiter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]           = useState([]);
  const [tab, setTab]                 = useState('deliver');
  const [selectedDate, setSelectedDate] = useState(today());
  const [cashAlerts, setCashAlerts]   = useState([]);
  const [dismissed, setDismissed]     = useState(new Set());
  const prevReadyIds = useRef(new Set());

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/admin/orders`);
      setOrders(res.data);

      // ── Cash notification: detect new PaymentPending cash orders ──
      const newCashOrders = res.data.filter(o => {
        if (o.status !== 'PaymentPending') return false;
        try {
          const splits = typeof o.payment_splits==='string' ? JSON.parse(o.payment_splits) : (o.payment_splits||[]);
          return splits.some(s => s.method === 'cash');
        } catch { return false; }
      });

      setCashAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newAlerts = newCashOrders
          .filter(o => !existingIds.has(o.id) && !dismissed.has(o.id))
          .map(o => ({
            id: o.id,
            tableId: o.table_id,
            splits: getParsedSplits(o.payment_splits).filter(s=>s.method==='cash'),
          }));
        return [...prev.filter(a => newCashOrders.some(o=>o.id===a.id)), ...newAlerts];
      });
    } catch {}
  };

  useEffect(() => { fetchOrders(); const t = setInterval(fetchOrders, 3000); return () => clearInterval(t); }, []);

  const update = async (id, status) => {
    try {
      await axios.put(`${API}/admin/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o.id===id ? {...o, status} : o));
    } catch { alert('Error!'); }
  };

  const dismissAlert = (id) => {
    setDismissed(prev => new Set([...prev, id]));
    setCashAlerts(prev => prev.filter(a => a.id !== id));
  };

  // ── Date nav ─────────────────────────────────────────────────────
  const changeDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    if (next <= today()) setSelectedDate(next);
  };

  const getParsedSplits = (raw) => {
    try { return typeof raw==='string' ? JSON.parse(raw) : (raw||[]); } catch { return []; }
  };

  // ── Filtered orders ───────────────────────────────────────────────
  
  // ✅ FIX: Define dateOrders first by filtering main orders list
  const dateOrders = orders.filter(o => {
    if (!o.created_at) return false;
    return o.created_at.slice(0, 10) === selectedDate;
  });

  // Now use dateOrders
  const activeOrders = dateOrders.filter(o => !['Paid', 'Rejected'].includes(o.status));

  // Keep readyOrders and cashOrders always live (not date-filtered) for action tabs:
  const readyOrders = orders.filter(o => o.status === 'Paid-Ready');
  const cashOrders = orders.filter(o => {
    if (o.status !== 'PaymentPending') return false;
    return getParsedSplits(o.payment_splits).some(s => s.method === 'cash');
  });

  // ── Daily stats ───────────────────────────────────────────────────
  const totalD   = dateOrders.length;
  const servedD = dateOrders.filter(o => o.status === 'Paid').length;
  const paidD   = dateOrders.filter(o => o.status === 'Paid').length;

  const statusColor = { Requested:'#9ca3af', Accepted:'#f59e0b', Preparing:'#f97316', Ready:'#95b508', Served:'#3b82f6', PaymentPending:'#a855f7' };

  return (
    <div className="waiter-page">

      {/* HEADER */}
      <header className="waiter-header">
        <div className="waiter-header-left">
          <span>🛎️</span>
          <div>
            <h1>WAITER PANEL</h1>
            <p>Hi, {user?.name}!</p>
          </div>
        </div>
        <div className="waiter-header-right">
          <div className="w-stat deliver">{readyOrders.length} Ready</div>
          <div className="w-stat cash">{cashOrders.length} Cash Due</div>
          {cashAlerts.filter(a=>!dismissed.has(a.id)).length > 0 && (
            <div className="w-stat notify">🔔 {cashAlerts.filter(a=>!dismissed.has(a.id)).length} New Cash</div>
          )}
          <button className="waiter-logout" onClick={()=>{logout();navigate('/login');}}>Logout</button>
        </div>
      </header>

      {/* CASH NOTIFICATION BANNERS */}
      {cashAlerts.filter(a=>!dismissed.has(a.id)).map(alert => {
        const total = alert.splits.reduce((s,p)=>s+Number(p.amount||0),0);
        return (
          <div key={alert.id} className="cash-alert-banner">
            <span className="cash-alert-icon">💵</span>
            <div className="cash-alert-text">
              <strong>Cash Collection — Table {alert.tableId} (Order #{alert.id})</strong>
              <span>
                Collect ${total.toFixed(2)} in cash from: {alert.splits.map(s=>s.name||'Guest').join(', ')}
              </span>
            </div>
            <button className="cash-alert-dismiss" onClick={()=>dismissAlert(alert.id)}>Got it ✓</button>
          </div>
        );
      })}

      {/* DAILY SUMMARY BAR */}
      <div className="waiter-summary-bar">
        <div className="date-nav">
          <button className="date-nav-btn" onClick={()=>changeDate(-1)}>‹</button>
          <span className="date-display">{fmtDisplay(selectedDate)}</span>
          <button className="date-nav-btn" onClick={()=>changeDate(1)} disabled={selectedDate===today()}>›</button>
        </div>

        <div style={{position:'relative',display:'inline-block'}}>
          <button className="date-input-btn">
            📅 Pick Date
            <input type="date" className="date-picker-input" value={selectedDate} max={today()} onChange={e=>{if(e.target.value) setSelectedDate(e.target.value);}} />
          </button>
        </div>

        {selectedDate !== today() && (
          <button className="today-btn" onClick={()=>setSelectedDate(today())}>Go to Today</button>
        )}

        <div className="w-summary-stats">
          <div className="w-sum-stat"><span className="w-sum-val">{totalD}</span><span className="w-sum-label">Orders</span></div>
          <div className="w-sum-stat"><span className="w-sum-val green">{servedD}</span><span className="w-sum-label">Served</span></div>
          <div className="w-sum-stat"><span className="w-sum-val gold">{paidD}</span><span className="w-sum-label">Paid</span></div>
        </div>
      </div>

      {/* TABS */}
      <div className="waiter-tabs">
        {[
          { key:'deliver', label:`🚀 Deliver (${readyOrders.length})` },
          { key:'cash',    label:`💵 Collect Cash (${cashOrders.length})` },
          { key:'all',     label:`📋 Track All (${activeOrders.length})` },
        ].map(t => (
          <button key={t.key} className={`w-tab ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="waiter-content">

        {/* DELIVER TAB */}
        {tab==='deliver' && (
          readyOrders.length === 0
            ? <div className="w-empty">✅ All orders delivered! Take a breath 😊</div>
            : <div className="w-grid">
                {readyOrders.map(order => (
                  <div key={order.id} className="w-card w-card-ready">
                    <div className="w-card-top">
                      <span className="w-order-id">#{order.id}</span>
                      <span className="w-table-big">TABLE {order.table_id}</span>
                    </div>
                    <div className="w-ready-badge">🔔 READY TO DELIVER</div>
                    <p className="w-time">🕒 {new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
                    <button className="w-btn green" onClick={() => update(order.id, 'Paid')}>
                      ✅ DELIVERED TO TABLE
                    </button>
                  </div>
                ))}
              </div>
        )}

        {/* CASH TAB */}
        {tab==='cash' && (
          cashOrders.length === 0
            ? <div className="w-empty">💳 No cash collections pending!</div>
            : <div className="w-grid">
                {cashOrders.map(order => {
                  const splits = getParsedSplits(order.payment_splits);
                  const cashSplits = splits.filter(s=>s.method==='cash');
                  const cashTotal  = cashSplits.reduce((s,p)=>s+Number(p.amount||0),0);
                  return (
                    <div key={order.id} className="w-card w-card-cash">
                      <div className="w-card-top">
                        <span className="w-order-id">#{order.id}</span>
                        <span className="w-table-big">TABLE {order.table_id}</span>
                      </div>
                      <div className="w-cash-amount">💵 ${cashTotal.toFixed(2)}</div>
                      <div className="w-cash-payers">
                        {cashSplits.map((s,i)=>(
                          <span key={i} className="w-payer-chip">
                            {s.name||`Person ${i+1}`}: ${Number(s.amount||0).toFixed(2)} {s.currency||'USD'}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {/* TRACK ALL TAB */}
        {tab==='all' && (
          <div className="w-track-list">
            {activeOrders.length === 0 && <div className="w-empty">No active orders 😴</div>}
            {activeOrders.map(order => (
              <div key={order.id} className="w-track-row">
                <span className="w-track-id">#{order.id}</span>
                <span className="w-track-table">Table {order.table_id}</span>
                <span className="w-track-name">{order.full_name||'Guest'}</span>
                <span className="w-track-status" style={{background:(statusColor[order.status]||'#9ca3af')+'22', color:statusColor[order.status]||'#9ca3af'}}>
                  {order.status}
                </span>
                <span className="w-track-total">${Number(order.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}