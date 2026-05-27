import React, { useEffect, useState } from 'react';
import ordersService from '../services/ordersService';
import '../style/admin.css';
import AdminChatPanel from '../components/AdminChatPanel';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAllConversations, subscribeToChats } from '../components/chatbotStore';
import { io } from 'socket.io-client';

const toDateStr = (d) => d.toISOString().slice(0, 10);
const today = () => toDateStr(new Date());
const fmtDisplay = (str) => {
  const d = new Date(str + 'T00:00:00');
  const isToday = str === today();
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  return (isToday ? 'Today ' : '') + d.toLocaleDateString('en-US', opts);
};

// ── PAYMENT PANEL ────────────────────────────────────────────────
function PaymentPanel({ orders, adminId, onPaymentConfirm, onPaymentReject }) {
  const paymentOrders = orders.filter(o => o.status === 'PaymentPending');
  
  const getParsed = (raw) => {
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    } catch {
      return [];
    }
  };

  const handleConfirmPayment = async (orderId, paymentId) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/payment/confirm`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, adminId }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Failed');
    
    toast.success('✅ Payment confirmed!');
    onPaymentConfirm?.(orderId); // بيعمل fetchOrders
  } catch (error) {
    toast.error('❌ ' + error.message);
    console.error(error);
  }
};

  const handleRejectPayment = async (orderId, paymentId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/payment/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          adminId,
          reason: 'Rejected by admin',
        }),
      });

      if (!response.ok) throw new Error('Failed to reject');
      
      toast.success('❌ Payment rejected');
      onPaymentReject?.(orderId);
    } catch (error) {
      toast.error('Error rejecting payment');
      console.error(error);
    }
  };

  if (paymentOrders.length === 0) {
    return (
      <div className="drawer-inner">
        <p className="drawer-empty">✅ No pending payments</p>
      </div>
    );
  }

  return (
    <div className="drawer-inner">
      <div className="drawer-scroll">
        {paymentOrders.map(order => {
          const payments = getParsed(order.payment_splits);
          
          return (
            <div key={order.id} style={{
              background: 'rgba(255,194,14,0.08)',
              border: '2px solid rgba(255,194,14,0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              {/* Order Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255,194,14,0.2)',
              }}>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: '#FFC20E' }}>
                    Order #{order.id}
                  </span>
                  <span style={{ color: '#888', marginLeft: '12px', fontSize: '12px' }}>
                    Table #{order.table_id}
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFC20E' }}>
                  ${Number(order.total_price).toFixed(2)}
                </div>
              </div>

              {/* Payments List */}
              {payments.map((payment, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '12px',
                }}>
                  {/* Payer Info */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ color: '#fff', fontWeight: '800', fontSize: '14px' }}>
                      {payment.payer_name || 'Guest'}
                    </div>
                    <div style={{ color: '#888', fontSize: '12px' }}>
                      {payment.payer_phone}
                    </div>
                  </div>

                  {/* Payment Method Badge */}
                  <div style={{ marginBottom: '12px' }}>
                    {payment.method === 'card' ? (
                      <div style={{
                        background: 'rgba(100,200,255,0.2)',
                        border: '1px solid rgba(100,200,255,0.4)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#64c8ff',
                        marginBottom: '8px',
                      }}>
                        💳 CARD PAYMENT
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(100,200,100,0.2)',
                        border: '1px solid rgba(100,200,100,0.4)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#64c864',
                        marginBottom: '8px',
                      }}>
                        💵 CASH PAYMENT
                      </div>
                    )}

                    {/* Card Details (if card) */}
                    {payment.method === 'card' && payment.stripe_card_brand && (
                      <div style={{
                        fontSize: '12px',
                        color: '#FFC20E',
                        fontWeight: '700',
                        marginBottom: '8px',
                      }}>
                        {payment.stripe_card_brand.toUpperCase()} ••••{payment.stripe_card_last4}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ color: '#888', fontSize: '12px' }}>Amount</span>
                    <span style={{ color: '#FFC20E', fontSize: '16px', fontWeight: '900' }}>
                      ${Number(payment.amount_usd || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleConfirmPayment(order.id, payment.payment_id)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        fontWeight: '900',
                        fontSize: '12px',
                        cursor: 'pointer',
                        letterSpacing: '0.5px',
                      }}
                    >
                      ✅ CONFIRM
                    </button>
                    <button
                      onClick={() => handleRejectPayment(order.id, payment.payment_id)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff',
                        fontWeight: '900',
                        fontSize: '12px',
                        cursor: 'pointer',
                        letterSpacing: '0.5px',
                      }}
                    >
                      ❌ REJECT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Waiter Panel ─────────────────────────────────────────────────
function WaiterPanel({ orders, onStatusUpdate }) {
  const readyOrders  = orders.filter(o => o.status === 'Paid-Ready');
  const cashOrders   = orders.filter(o => {
    if (o.status !== 'PaymentPending') return false;
    try {
      const s = typeof o.payment_splits === 'string' ? JSON.parse(o.payment_splits) : (o.payment_splits || []);
      return s.some(sp => sp.method === 'cash');
    } catch { return false; }
  });
  const activeOrders = orders.filter(o => !['Paid', 'Rejected'].includes(o.status));
  const [tab, setTab] = useState('deliver');
  const getParsed = (raw) => { try { return typeof raw === 'string' ? JSON.parse(raw) : (raw || []); } catch { return []; } };

  return (
    <div className="drawer-inner">
      <div className="drawer-tabs">
        {[
          { k: 'deliver', label: '🚀 Deliver', count: readyOrders.length },
          { k: 'cash',    label: '💵 Cash',    count: cashOrders.length },
          { k: 'all',     label: '📋 All',     count: activeOrders.length },
        ].map(t => (
          <button key={t.k} className={`dtab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>
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
                <button className="moc-btn green" onClick={() => onStatusUpdate(o.id, 'Paid')}>✅ DELIVERED</button>
              </div>
            ))
        )}
        {tab === 'cash' && (
          cashOrders.length === 0
            ? <p className="drawer-empty">💳 No cash pending</p>
            : cashOrders.map(o => {
              const splits = getParsed(o.payment_splits).filter(s => s.method === 'cash');
              const total  = splits.reduce((s, p) => s + Number(p.amount || 0), 0);
              return (
                <div key={o.id} className="mini-order-card cash">
                  <div className="moc-top"><span className="moc-id">#{o.id}</span><span className="moc-table">TABLE {o.table_id}</span></div>
                  <div className="moc-amount">💵 ${total.toFixed(2)}</div>
                  {splits.map((s, i) => (
                    <span key={i} className="moc-payer">{s.payer_name || 'Guest'}: {Number(s.amount_usd).toFixed(2)} {s.currency}</span>
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
                <span className={`mtr-status s-${(o.status || '').toLowerCase().replace('-', '')}`}>{o.status}</span>
                <span className="mtr-total">${Number(o.total_price).toFixed(2)}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ── Kitchen Panel ────────────────────────────────────────────────
function KitchenPanel({ orders, onStatusUpdate }) {
  const live = orders.filter(o =>
    ['paid-accepted', 'paid-preparing', 'paid-ready']
      .includes((o.status || '').toLowerCase())
  );
  const [filter, setFilter] = useState('all');

  const parseItems = (order) => {
    try {
      const raw = order.items || order.order_items || [];
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(arr) ? arr.filter(i => i && i.name) : [];
    } catch { return []; }
  };

  const visible = live.filter(o =>
    filter === 'new'     ? (o.status || '').toLowerCase() === 'paid-accepted'  :
    filter === 'cooking' ? (o.status || '').toLowerCase() === 'paid-preparing' : true
  );

  return (
    <div className="drawer-inner">
      <div className="drawer-tabs">
        {[
          { k: 'all',     label: '📋 All',     count: live.length },
          { k: 'new',     label: '🔔 New',     count: orders.filter(o => o.status === 'Paid-Accepted').length },
          { k: 'cooking', label: '🔥 Cooking', count: orders.filter(o => o.status === 'Paid-Preparing').length },
        ].map(t => (
          <button key={t.k} className={`dtab ${filter === t.k ? 'active' : ''}`} onClick={() => setFilter(t.k)}>
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
            <div key={o.id} className={`mini-order-card ${isNew ? 'k-new' : isCook ? 'k-cook' : 'k-ready'}`}>
              <div className="moc-top">
                <span className="moc-id">#{o.id}</span>
                <span className="moc-table">TABLE {o.table_id}</span>
                <span className={`moc-kstatus ${isNew ? 'new' : isCook ? 'cook' : 'ready'}`}>
                  {isNew ? 'NEW' : isCook ? 'COOKING' : 'READY'}
                </span>
              </div>
              <div className="moc-items">
                {items.slice(0, 4).map((item, i) => (
                  <div key={i} className="moc-item-row">
                    <span className="moc-qty">{item.quantity}×</span>
                    <span className="moc-name">{item.name}</span>
                  </div>
                ))}
                {items.length > 4 && <span className="moc-more">+{items.length - 4} more</span>}
              </div>
              {isNew  && <button className="moc-btn orange" onClick={() => onStatusUpdate(o.id, 'Paid-Preparing')}>🔥 START COOKING</button>}
              {isCook && <button className="moc-btn teal"   onClick={() => onStatusUpdate(o.id, 'Paid-Ready')}>✅ MARK READY</button>}
              {o.status === 'Paid-Ready' && <div className="moc-waiting">🔔 Waiting for waiter...</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Admin ───────────────────────────────────────────────────
function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [allOrders,       setAllOrders]       = useState([]);
  const [chatOpen,        setChatOpen]        = useState(false);
  const [selectedDate,    setSelectedDate]    = useState(today());
  const [drawer,          setDrawer]          = useState(null);
  const [drawerSize,      setDrawerSize]      = useState('normal');
  const [needsAdminCount, setNeedsAdminCount] = useState(0);
  const [socket, setSocket]                   = useState(null);

  useEffect(() => { if (!user) navigate('/login'); }, [user]);

  // Initialize Socket.io
  useEffect(() => {
    const socketUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, { reconnection: true });
    
    newSocket.on('connect', () => {
      console.log('✅ Admin connected to socket');
    });

    newSocket.on('payment:status-updated', (data) => {
      console.log('💳 Payment updated:', data);
      fetchOrders();
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('snackToken');
      if (!token) return;

      const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://snack-attack-backend.onrender.com';
      const res = await fetch(`${API}/api/admin/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) return;
     const data = await res.json();
if (data.success && Array.isArray(data.orders)) {
  setAllOrders(data.orders);
}
    } catch (err) { console.error('API ERROR:', err); }
  };

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const updateCount = (conversations) => {
      const count = Object.values(conversations).filter(c => c?.status === 'admin').length;
      setNeedsAdminCount(count);
    };
    updateCount(getAllConversations());
    const unsub = subscribeToChats(updateCount);
    return unsub;
  }, []);

  const orders = allOrders;
  const totalOrders  = orders.length;
  const totalRevenue = orders
    .filter(o => (o.status || '').toLowerCase() === 'paid')
    .reduce((s, o) => s + Number(o.total_price || 0), 0);
  const activeCount  = orders.filter(o => !['Paid', 'Rejected'].includes(o.status)).length;
  const readyCount   = allOrders.filter(o => o.status === 'Paid-Ready').length;
  const pendingCount = allOrders.filter(o => (o.status || '').toLowerCase() === 'paymentpending').length;

  const changeDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    if (next <= today()) setSelectedDate(next);
  };

  const parseSplits = (raw) => {
    try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; }
    catch { return []; }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    let reason = null;
    if (newStatus === 'Rejected') {
      reason = prompt('Rejection reason?');
      if (!reason) return;
    }
    try {
      const token = localStorage.getItem('snackToken');
      const payload = { status: newStatus };
      if (reason) payload.reason = reason;
      
      const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://snack-attack-backend.onrender.com';
      const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Error ${res.status}`);
      }

      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order #${orderId} updated to ${newStatus}`);
    } catch (err) {
      console.error('API ERROR:', err);
      toast.error('Failed to update order status');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Remove this order?')) return;
    try {
      const token = localStorage.getItem('snackToken');
      const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://snack-attack-backend.onrender.com';
      const res = await fetch(`${API}/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed');
      setAllOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Order removed');
    } catch (err) {
      console.error('API ERROR:', err);
      toast.error('Error deleting order');
    }
  };

  const handleConfirmCustomerTx = async (orderId, splitId) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    const splits  = parseSplits(order.payment_splits);
    const updated = splits.map(s => s.id === splitId ? { ...s, whishVerified: true } : s);
    try {
      const token = localStorage.getItem('snackToken');
      const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://snack-attack-backend.onrender.com';
      const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_splits: updated, replace_splits: true }),
      });

      if (!res.ok) throw new Error('Failed');
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_splits: JSON.stringify(updated) } : o));
      toast.success('Transaction verified ✅');
    } catch (err) {
      console.error('API ERROR:', err);
      toast.error('Error confirming TX ID');
    }
  };

  const handleRequestTxId = async (orderId, splitId) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    const splits  = parseSplits(order.payment_splits);
    const updated = splits.map(s => s.id === splitId ? { ...s, txIdRequested: true } : s);
    try {
      const token = localStorage.getItem('snackToken');
      const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://snack-attack-backend.onrender.com';
      const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_splits: updated, replace_splits: true }),
      });

      if (!res.ok) throw new Error('Failed');
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_splits: JSON.stringify(updated) } : o));
      toast.success('TX ID request sent to customer');
    } catch (err) {
      console.error('API ERROR:', err);
      toast.error('Error sending request');
    }
  };

  const renderSplitPill = (s, i, orderId) => {
    const method   = s.method || 'cash';
    const isWhish  = method === 'card' && !!s.whishCode;
    const whishRef = `ORD-${orderId}-${s.whishCode || '???'}`;

    if (method === 'cash') {
      const firstAmt   = Number(s.amount_usd || 0);
      const secondAmt  = Number(s.cashSecondAmount || 0);
      const firstCurr  = s.currency || 'USD';
      const secondCurr = firstCurr === 'USD' ? 'LBP' : 'USD';
      return (
        <div key={i} className="admin-split-pill cash-pill">
          <div className="split-top">
            <span className="split-method-tag">💵 Cash</span>
            <span className="split-amt">
              {firstAmt.toLocaleString()} <span className={`currency-tag ${firstCurr === 'LBP' ? 'lbp' : 'usd'}`}>{firstCurr}</span>
            </span>
          </div>
          {s.cashHasSplit && secondAmt > 0 && (
            <div className="split-top" style={{ marginTop: 4, borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 4 }}>
              <span className="split-method-tag" style={{ visibility: 'hidden' }}>💵</span>
              <span className="split-amt">
                {secondAmt.toLocaleString()} <span className={`currency-tag ${secondCurr === 'LBP' ? 'lbp' : 'usd'}`}>{secondCurr}</span>
              </span>
            </div>
          )}
          {s.payer_name  && <div className="split-user-name">👤 {s.payer_name}</div>}
          {s.payer_phone && <div className="split-phone">📞 {s.payer_phone}</div>}
        </div>
      );
    }

    if (method === 'card') {
      const cardType = s.stripe_card_brand || '';
      let cardLabel  = '💳 Card';
      if (isWhish)                         cardLabel = '📱 Whish';
      else if (cardType === 'visa')        cardLabel = '💳 Visa';
      else if (cardType === 'mastercard')  cardLabel = '💳 Mastercard';
      else if (cardType === 'omt')         cardLabel = '💸 OMT';
      
      return (
        <div key={i} className={`admin-split-pill card-pill ${isWhish ? 'whish-pill' : cardType} ${s.paid ? 'verified' : ''}`}>
          <div className="split-top">
            <span className="split-method-tag">{cardLabel}</span>
            <span className="split-amt">${Number(s.amount_usd || 0).toFixed(2)}</span>
          </div>
          {s.payer_name  && <div className="split-user-name">👤 {s.payer_name}</div>}
          {s.payer_phone && <div className="split-phone">📞 {s.payer_phone}</div>}
          
          {/* Show Stripe confirmation status */}
          {s.payment_status === 'paid' && !isWhish && (
            <div style={{
              marginTop: 10,
              padding: '8px 12px',
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.35)',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#22c55e',
              fontWeight: '800',
              fontSize: '12px',
              letterSpacing: '0.5px'
            }}>
              ✅ STRIPE CONFIRMED
            </div>
          )}
          
          {isWhish && (
            <div className="whish-ref-admin" style={{ marginTop: 5, fontSize: 11 }}>
              <span className="ref-label">Note: </span>
              <span className="ref-code">{whishRef}</span>
            </div>
          )}
          {isWhish && (
            s.whishVerified
              ? <div style={{ marginTop: 6, fontSize: 12, color: '#22c55e', fontWeight: 'bold' }}>✅ Verified: {s.transactionId}</div>
              : s.transactionId
              ? <div style={{ marginTop: 6, fontSize: 12, color: '#3b82f6', fontWeight: 'bold' }}>📨 Customer Sent: {s.transactionId}</div>
              : <div style={{ marginTop: 6, fontSize: 11, color: '#f59e0b' }}>⏳ Awaiting TX ID</div>
          )}
          {isWhish && !s.whishVerified && (
            <div style={{ marginTop: 10, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 10 }}>
              {s.transactionId
                ? <button className="btn-action start" style={{ width: '100%', padding: 8, fontSize: 12 }} onClick={() => handleConfirmCustomerTx(orderId, s.id)}>✅ CONFIRM TX ID</button>
                : !s.txIdRequested && (
                  <button style={{ width: '100%', padding: 8, background: '#f59e0b', color: '#000', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleRequestTxId(orderId, s.id)}>
                    📩 Request Transaction ID
                  </button>
                )
              }
              {s.txIdRequested && !s.transactionId && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#f59e0b', textAlign: 'center' }}>📢 Request sent to customer</p>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={i} className="admin-split-pill">
        <div className="split-top">
          <span className="split-method-tag">💳</span>
          <span className="split-amt">${Number(s.amount_usd || 0).toFixed(2)}</span>
        </div>
        {s.payer_name && <div className="split-user-name">👤 {s.payer_name}</div>}
      </div>
    );
  };

  const openDrawer = (type) => {
    if (drawer === type) setDrawer(null);
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
            className={`nav-item ${drawer === 'payment' ? 'nav-open' : ''}`}
            onClick={() => openDrawer('payment')}
          >
            <span className="nav-icon">💳</span>
            <span>Payments</span>
            {pendingCount > 0 && <span className="nav-badge orange">{pendingCount}</span>}
            <span className="nav-arrow">{drawer === 'payment' ? '◀' : '▶'}</span>
          </button>

          <button
            className={`nav-item ${drawer === 'waiter' ? 'nav-open' : ''}`}
            onClick={() => openDrawer('waiter')}
          >
            <span className="nav-icon">🍽️</span>
            <span>Waiter</span>
            {readyCount > 0 && <span className="nav-badge green">{readyCount}</span>}
            <span className="nav-arrow">{drawer === 'waiter' ? '◀' : '▶'}</span>
          </button>

          <button
            className={`nav-item ${drawer === 'kitchen' ? 'nav-open' : ''}`}
            onClick={() => openDrawer('kitchen')}
          >
            <span className="nav-icon">👨‍🍳</span>
            <span>Kitchen</span>
            {allOrders.filter(o => o.status === 'Paid-Accepted').length > 0 && (
              <span className="nav-badge red">{allOrders.filter(o => o.status === 'Paid-Accepted').length}</span>
            )}
            <span className="nav-arrow">{drawer === 'kitchen' ? '◀' : '▶'}</span>
          </button>

          <div className="nav-section-label" style={{ marginTop: 16 }}>TOOLS</div>

          <button className={`nav-item ${chatOpen ? 'nav-open' : ''}`} onClick={() => setChatOpen(o => !o)}>
            <span className="nav-icon">💬</span>
            <span>Chat</span>
            {needsAdminCount > 0 && (
              <span className="nav-badge red">{needsAdminCount}</span>
            )}
          </button>
        </nav>

        <div className="sidebar-stats">
          <div className="ss-row"><span>Active</span><span className="ss-val gold">{allOrders.filter(o => !['Paid', 'Rejected'].includes(o.status)).length}</span></div>
          <div className="ss-row"><span>Ready</span><span className="ss-val green">{readyCount}</span></div>
          <div className="ss-row"><span>Pending $</span><span className="ss-val orange">{pendingCount}</span></div>
        </div>

        <button className="sidebar-logout" onClick={() => { logout(); navigate('/login'); }}>
          ⏻ Logout
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className={`admin-main ${drawer ? 'drawer-pushed' : ''} ${drawer && drawerSize === 'large' ? 'drawer-pushed-large' : ''}`}>

        {/* Top strip */}
        <div className="admin-topstrip">
          <div className="topstrip-date">
            <button className="ts-nav-btn" onClick={() => changeDate(-1)}>‹</button>
            <span className="ts-date">{fmtDisplay(selectedDate)}</span>
            <button className="ts-nav-btn" onClick={() => changeDate(1)} disabled={selectedDate === today()}>›</button>
            {selectedDate !== today() && <button className="ts-today" onClick={() => setSelectedDate(today())}>Today</button>}
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
        {!chatOpen && (
          <div className="orders-masonry">
          {orders.map(order => {
            const splits           = parseSplits(order.payment_splits);
            const hasWhishPending  = splits.some(sp => sp.method === 'card' && sp.whishCode && !sp.whishVerified);
            const firstPayer       = splits.find(sp => sp.payer_name?.trim());
            const displayName      = firstPayer?.payer_name  || order.full_name    || 'Guest';
            const displayPhone     = firstPayer?.payer_phone || order.phone_number || '—';
            const s                = order.status || '';
            const isPaid           = s.includes('Paid');
            const tip              = Number(order.tip_amount || 0);
            const isWaitingPayment = s === 'accepted';
            const isPaymentPending = s === 'PaymentPending';
            const isAcceptedStage  = s === 'Paid-Accepted';
            const isPreparingStage = s === 'Paid-Preparing';
            const isReadyStage     = s === 'Paid-Ready';
            const isCompleted      = s === 'Paid' || s === 'Served';
            const orderItems       = order.items || order.order_items || [];

            return (
              <div
                key={order.id}
                className={`admin-order-card status-${s.toLowerCase()} ${!isPaid ? 'unpaid-border' : 'paid-border'} ${hasWhishPending ? 'whish-pending-border' : ''}`}
              >
                {/* Header */}
                <div className="admin-card-header">
                  <span className="order-id">#ORD-{order.id}</span>
                  <div className="header-badges">
                    <span className={`status-chip chip-${s.toLowerCase()}`}>{s}</span>
                    <span className={`payment-badge ${isPaid ? 'paid' : 'pending'}`}>{isPaid ? '💰 PAID' : '⚠️ UNPAID'}</span>
                    <span className="table-badge">T{order.table_id || '?'}</span>
                  </div>
                  {(isCompleted || s === 'Rejected') && (
                    <button className="delete-x-btn" onClick={() => handleDeleteOrder(order.id)}>✕</button>
                  )}
                </div>

                {/* Body */}
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
                      {splits.length > 0
                        ? splits.map((sp, i) => renderSplitPill(sp, i, order.id))
                        : <div className="admin-split-pill">💵 Cash</div>
                      }
                    </div>
                  </div>

                  <div className="order-financials">
                    <p className="total-amount">
                      TOTAL <span>${Number(order.total_price).toFixed(2)}</span>
                    </p>
                    <p className="order-time">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {tip > 0 && (
                      <p className="tip-amount" style={{
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.35)',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        color: '#22c55e',
                        fontWeight: '800',
                        fontSize: '12px',
                        letterSpacing: '0.5px',
                      }}>
                        🙏 TIP <span>+${tip.toFixed(2)}</span>
                      </p>
                    )}
                  </div>

                  {s === 'Rejected' && (
                    <p className="reject-reason">❌ {order.rejection_reason || 'Not specified'}</p>
                  )}

                  {orderItems.length > 0 && (
                    <details className="admin-items-collapse">
                      <summary>{orderItems.length} item{orderItems.length !== 1 ? 's' : ''}</summary>
                      <div className="admin-items-list">
                        {orderItems.map((item, i) => {
                          const parseIfNeeded = (v) => {
                            if (!v) return [];
                            if (Array.isArray(v)) return v;
                            if (typeof v === 'object') return [v];
                            try {
                              const parsed = JSON.parse(v);
                              return Array.isArray(parsed) ? parsed : [];
                            } catch {
                              return [];
                            }
                          };
                          
                          const extrasList = parseIfNeeded(
                            item.selected_extras ??
                            item.selectedExtras ??
                            []
                          );

                          const removedList = parseIfNeeded(
                            item.removed_extras ??
                            item.removedExtras ??
                            []
                          );

                          const note =
                            item.special_note ??
                            item.specialNote ??
                            '';
                          
                          return (
                            <div key={i} className="admin-item-row">
                              <span className="admin-item-qty">{item.quantity}×</span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="admin-item-name">{item.name}</span>

                                {extrasList.length > 0 && (
                                  <span className="admin-item-note">
                                    ➕ {extrasList.map(e => e.name || e).join(', ')}
                                  </span>
                                )}

                                {removedList.length > 0 && (
                                  <span className="admin-item-note" style={{ color: '#f87171' }}>
                                    ✕ {removedList.map(e => e.name || e).join(', ')}
                                  </span>
                                )}

                                {note && (
                                  <span className="admin-item-note" style={{ fontStyle: 'italic' }}>
                                    📝 {note}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>

                {/* Actions */}
                <div className="admin-card-actions">

                  {/* Requested orders */}
                  {s === 'Requested' && (
                    <div className="action-row">
                      <button
                        className="btn-action start"
                        onClick={() => handleStatusUpdate(order.id, 'accepted')}
                      >
                        ACCEPT ORDER ✓
                      </button>
                      <button
                        className="btn-action reject"
                        onClick={() => handleStatusUpdate(order.id, 'Rejected')}
                      >
                        REJECT ✕
                      </button>
                    </div>
                  )}

                  {/* Waiting payment */}
                  {isWaitingPayment && (
                    <div className="action-row" style={{ flexDirection: 'column', gap: '8px' }}>
                      <p className="waiting-label">⏳ Waiting for customer payment...</p>
                      <button className="btn-action reject" onClick={() => handleStatusUpdate(order.id, 'Rejected')}>REJECT ✕</button>
                    </div>
                  )}

                  {/* Card payment — Show CONFIRM & REJECT & REFUND */}
                  {isPaymentPending && splits.some(s => s.payment_status === 'paid') && (
                    <div className="action-row">
                      <button 
                        className="btn-action start" 
                        onClick={() => handleStatusUpdate(order.id, 'Paid-Accepted')}
                        style={{ flex: 1 }}
                      >
                        CONFIRM PAYMENT 💳
                      </button>
                      <button 
                        className="btn-action reject" 
                        onClick={() => {
                          alert('⚠️ REFUND REQUIRED: You must process the refund manually in your Stripe Dashboard!\n\nOrder will be marked as rejected.');
                          handleStatusUpdate(order.id, 'Rejected');
                        }}
                        style={{ flex: 1 }}
                      >
                        REJECT & REFUND
                      </button>
                    </div>
                  )}

                  {/* Cash payment — Show CONFIRM & REJECT */}
                  {isPaymentPending && !splits.some(s => s.payment_status === 'paid') && (
                    <div className="action-row">
                      <button 
                        className="btn-action start" 
                        onClick={() => handleStatusUpdate(order.id, 'Paid-Accepted')}
                      >
                        CONFIRM PAYMENT 💰
                      </button>
                      <button 
                        className="btn-action reject" 
                        onClick={() => handleStatusUpdate(order.id, 'Rejected')}
                      >
                        REJECT
                      </button>
                    </div>
                  )}

                  {/* Accepted stage */}
                  {isAcceptedStage && (
                    <button className="btn-action cook" onClick={() => handleStatusUpdate(order.id, 'Paid-Preparing')}>
                      START COOKING 👨‍🍳
                    </button>
                  )}

                  {/* Preparing stage */}
                  {isPreparingStage && (
                    <button className="btn-action ready" onClick={() => handleStatusUpdate(order.id, 'Paid-Ready')}>
                      MARK READY 🔔
                    </button>
                  )}

                  {/* Ready stage */}
                  {isReadyStage && (
                    <p className="waiting-label">🔔 Ready — waiter delivering...</p>
                  )}

                  {/* Completed */}
                  {isCompleted && s !== 'Rejected' && (
                    <span className="order-completed-label">✅ ARCHIVED</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </main>
        


      {/* ── SIDE DRAWER ── */}
      {drawer && (
        <div className={`side-drawer ${drawerSize === 'large' ? 'drawer-large' : ''}`}>
          <div className="drawer-header">
            <span className="drawer-title">
              {drawer === 'payment' ? '💳 Payments' : drawer === 'waiter' ? '🍽️ Waiter Panel' : '👨‍🍳 Kitchen Panel'}
            </span>
            <div className="drawer-header-actions">
              <button
                className="drawer-size-btn"
                onClick={() => setDrawerSize(s => s === 'normal' ? 'large' : 'normal')}
                title={drawerSize === 'normal' ? 'Expand' : 'Shrink'}
              >
                {drawerSize === 'normal' ? '⤢' : '⤡'}
              </button>
              <button className="drawer-close-btn" onClick={() => setDrawer(null)}>✕</button>
            </div>
          </div>
          {drawer === 'payment'
            ? <PaymentPanel orders={allOrders} adminId={user?.id} onPaymentConfirm={() => fetchOrders()} onPaymentReject={() => fetchOrders()} />
            : drawer === 'waiter'
            ? <WaiterPanel  orders={allOrders} onStatusUpdate={handleStatusUpdate} />
            : <KitchenPanel orders={allOrders} onStatusUpdate={handleStatusUpdate} />
          }
        </div>
      )}
    </div>
  );
}

export default Admin;