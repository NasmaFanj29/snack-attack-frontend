import React, { useEffect, useState } from "react";
import axios from "axios";
import "../style/admin.css";

function Admin() {
  const [orders, setOrders] = useState([]);

  // 1. Fetch orders every 5 seconds for real-time feel
  const fetchOrders = async () => {
    try {
      const res = await axios.get("https://snack-attack-backend.onrender.com/admin/orders");
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching admin orders", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

 const handleStatusUpdate = async (orderId, newStatus) => {
  let reason = null;
  
  if (newStatus === "Rejected") {
    reason = prompt("Why are you rejecting this order?");
    if (!reason) return; 
  }

  try { 
    const payload = { status: newStatus };
    if (newStatus === "Rejected") {
      payload.reason = reason;
    }

    const res = await axios.put(`https://snack-attack-backend.onrender.com/admin/orders/${orderId}/status`, payload);
    
    // ✅ Check eza el-backend radd success: true
    if (res.data.success) {
      // Update el-UI manual deghre kirmal el-user ma y-nanter el-polling
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  } catch (err) {
    console.error("Update Error:", err.response ? err.response.data : err.message);
    alert("Error updating order status. Check if the Database Trigger is failing.");
  }
};

  const handleDeleteOrder = async (orderId) => {
  if (window.confirm("Are you sure you want to remove this? 🗑️")) {
    try {
      const res = await axios.delete(`https://snack-attack-backend.onrender.com/admin/orders/${orderId}`);
      
      // ✅ Check if the backend specifically said success
      if (res.data && res.data.success) {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      } else {
        alert("Backend failed to delete.");
      }
    } catch (err) {
      console.error("Full Error:", err.response ? err.response.data : err.message);
      alert("Error deleting order from UI");
    }
  }
};

  return (
    <div className="admin-dashboard-page">
      <header className="admin-top-bar">
        <h1>SNACK ATTACK 🍔 <span>KITCHEN DASHBOARD</span></h1>
        <div className="admin-stats-summary">
          Active: {orders.filter(o => o.status !== 'Paid' && o.status !== 'Rejected').length} | 
          Pending: {orders.filter(o => o.status === 'Pending').length}
        </div>
      </header>

      <div className="orders-masonry">
        {orders.map((order) => (
          <div 
            key={order.id} 
            className={`admin-order-card status-${order.status.toLowerCase()} ${order.status !== 'Paid' ? 'unpaid-border' : 'paid-border'}`}
          >
            {/* --- CARD HEADER --- */}
            <div className="admin-card-header">
              <span className="order-id">#ORD-{order.id}</span>

              {/* ❌ THE "X" BUTTON: Only show if Paid or Rejected */}
              {(order.status === 'Paid' || order.status === 'Rejected') && (
                <button className="delete-x-btn" onClick={() => handleDeleteOrder(order.id)}>
                  ✕
                </button>
              )}

              <span className={`payment-badge ${order.status === 'Paid' ? 'paid' : 'pending'}`}>
                {order.status === 'Paid' ? "PAID 💰" : "UNPAID ⚠️"}
              </span>
              <span className="table-badge">TABLE {order.table_id || "N/A"}</span>
            </div>

            {/* --- CARD BODY --- */}
            <div className="admin-card-body">
              <div className="customer-info">
                <p><strong>Customer:</strong> {order.full_name || "Guest"}</p>
                <p><strong>Phone:</strong> {order.phone_number}</p>
              </div>

             {/* 💰 PAYMENT BREAKDOWN (Splits) */}
<div className="admin-payment-info-box">
  <p className="payment-label">Payment Breakdown:</p>
  <div className="splits-list">
    {order.payment_splits ? (
      (() => {
        try {
          // ✅ T-akkade eza kān String abel ma na3mel parse kirmal ma ya3te Error
          const parsedSplits = typeof order.payment_splits === 'string' 
            ? JSON.parse(order.payment_splits) 
            : order.payment_splits;

          return parsedSplits.map((split, idx) => (
            <div key={idx} className="admin-split-pill">
              <div className="split-top">
                <span className="split-method-tag">
                  {split.method === 'cash' ? '💵 Cash' : '💳 Card'}
                </span>
                <span className="split-amt">${Number(split.amount).toFixed(2)}</span>
              </div>
              {split.method === 'card' && split.name && (
                <div className="split-user-name">👤 {split.name}</div>
              )}
            </div>
          ));
        } catch (e) {
          console.error("JSON Parse Error:", e);
          return <div className="admin-split-pill">⚠️ Data Format Error</div>;
        }
      })()
    ) : (
      // ✅ Eza el-order 2adīm aw ma fīh splits
      <div className="admin-split-pill">💵 Full Payment (Cash)</div>
    )}
  </div>
</div>
              
              <div className="order-financials">
                <p className="total-amount">TOTAL: <span>${Number(order.total_price).toFixed(2)}</span></p>
              </div>

              <p className="order-time">🕒 {new Date(order.created_at).toLocaleTimeString()}</p>
              
              {order.status === "Rejected" && (
                <p className="reject-reason">❌ Reason: {order.rejection_reason || "Not specified"}</p>
              )}
            </div>

            {/* --- CARD ACTIONS --- */}
            <div className="admin-card-actions">
              {order.status === "Pending" && (
                <div className="action-row">
                  <button className="btn-action start" onClick={() => handleStatusUpdate(order.id, "Preparing")}>
                    ACCEPT 👨‍🍳
                  </button>
                  <button className="btn-action reject" onClick={() => handleStatusUpdate(order.id, "Rejected")}>
                    REJECT
                  </button>
                </div>
              )}

              {order.status === "Preparing" && (
                <button className="btn-action ready" onClick={() => handleStatusUpdate(order.id, "Ready")}>
                  MARK READY 🔔
                </button>
              )}

              {order.status === "Ready" && (
                <button className="btn-action serve" onClick={() => handleStatusUpdate(order.id, "Served")}>
                  MARK SERVED ✅
                </button>
              )}

              {order.status !== "Paid" && order.status !== "Rejected" && (
                <button className="btn-action pay" onClick={() => handleStatusUpdate(order.id, "Paid")}>
                  CONFIRM PAYMENT
                </button>
              )}

              {order.status === "Paid" && (
                <span className="order-completed-label">✅ ORDER ARCHIVED</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;