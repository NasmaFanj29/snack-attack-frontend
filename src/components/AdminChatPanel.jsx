import React, { useState, useEffect, useRef } from "react";
import {
  getConversations, addMessage, setTableStatus,
  subscribeToChats, getCustomOrders, subscribeToOrders,
  updateCustomOrderStatus, saveConversations, addCustomOrderToCart
} from "./chatbotStore";
import "../style/adminChat.css";

function AdminChatPanel() {
  const [conversations, setConversations] = useState({});
  const [customOrders, setCustomOrders] = useState([]);
  const [activeTable, setActiveTable] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [tab, setTab] = useState("chats");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setConversations(getConversations());
    setCustomOrders(getCustomOrders());
    const unsubChats = subscribeToChats((convs) => setConversations({ ...convs }));
    const unsubOrders = subscribeToOrders(() => setCustomOrders(getCustomOrders()));
    return () => { unsubChats(); unsubOrders(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTable, conversations]);

  const allConvs = Object.values(conversations);
  const urgentCount = allConvs.filter(c => c.status === 'admin').length;
  const pendingOrders = customOrders.filter(o => o.status === 'pending');
  const activeConv = activeTable ? conversations[String(activeTable)] : null;

  // ── Join chat as admin ────────────────────────────────────────────────────
  const joinChat = (tableId) => {
    const convs = getConversations();
    const tid = String(tableId);
    if (!convs[tid]) return;
    convs[tid].adminJoined = true;
    convs[tid].status = 'admin';
    convs[tid].messages.push({
      sender: 'admin',
      text: "👋 Staff member connected. How can I help you?",
      timestamp: Date.now()
    });
    saveConversations(convs);
    setConversations({ ...convs });
    setActiveTable(tableId);
  };

  // ✅ Fix #3: Return conversation back to bot
  const returnToBot = (tableId) => {
    const convs = getConversations();
    const tid = String(tableId);
    if (!convs[tid]) return;
    convs[tid].adminJoined = false;
    convs[tid].status = 'bot';
    convs[tid].messages.push({
      sender: 'bot',
      text: "✅ Staff has left the chat. I'm back! Is there anything else I can help you with? 😊",
      timestamp: Date.now()
    });
    saveConversations(convs);
    setConversations({ ...convs });
  };

  const sendReply = () => {
    if (!replyText.trim() || !activeTable) return;
    addMessage(String(activeTable), { sender: 'admin', text: replyText.trim() });
    setReplyText("");
    setConversations(getConversations());
  };

  const resolveChat = (tableId) => {
    setTableStatus(String(tableId), 'resolved');
    addMessage(String(tableId), { sender: 'bot', text: "✅ Your issue has been resolved! Is there anything else I can help you with? 😊" });
    setConversations(getConversations());
    if (String(activeTable) === String(tableId)) setActiveTable(null);
  };

  // ✅ Fix #1: Confirm custom order → add to cart
  const handleOrderAction = (orderId, status) => {
    const order = updateCustomOrderStatus(orderId, status);
    if (order) {
      if (status === 'confirmed') {
        // Add to cart so customer can checkout normally
        addCustomOrderToCart(order.order, order.tableId);
        addMessage(order.tableId, {
          sender: 'bot',
          text: "✅ Your custom order is confirmed! It's been added to your cart and the kitchen is preparing it. Estimated time: 12–15 min 🍔🔥"
        });
      } else {
        addMessage(order.tableId, {
          sender: 'bot',
          text: "❌ Sorry, we couldn't fulfill your custom order. Our staff will assist you shortly."
        });
      }
    }
    setCustomOrders(getCustomOrders());
    setConversations(getConversations());
  };

  return (
    <div className="admin-chat-panel">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div className="acp-sidebar">
        <div className="acp-sidebar-header">
          <button className={`acp-tab ${tab === 'chats' ? 'active' : ''}`} onClick={() => setTab('chats')}>
            💬 Chats {urgentCount > 0 && <span className="acp-badge urgent">{urgentCount}</span>}
          </button>
          <button className={`acp-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
            🍔 Custom {pendingOrders.length > 0 && <span className="acp-badge">{pendingOrders.length}</span>}
          </button>
        </div>

        {tab === 'chats' && (
          <div className="acp-list">
            {allConvs.length === 0 && <p className="acp-empty">No active chats yet 😴</p>}
            {[...allConvs].sort((a, b) => (b.status === 'admin') - (a.status === 'admin')).map(conv => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              const needsHelp = conv.status === 'admin';
              return (
                <div
                  key={conv.tableId}
                  className={`acp-conv-item ${activeTable === conv.tableId ? 'selected' : ''} ${needsHelp ? 'urgent' : ''}`}
                  onClick={() => setActiveTable(conv.tableId)}
                >
                  <div className="acp-conv-top">
                    <span className="acp-table-name">Table {conv.tableId}</span>
                    <span className={`acp-status-pill ${conv.status}`}>{conv.status}</span>
                  </div>
                  <p className="acp-conv-preview">
                    {lastMsg?.text?.slice(0, 42)}{lastMsg?.text?.length > 42 ? '…' : ''}
                  </p>
                  {needsHelp && !conv.adminJoined && (
                    <button className="acp-join-btn" onClick={e => { e.stopPropagation(); joinChat(conv.tableId); }}>
                      Join Chat
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'orders' && (
          <div className="acp-list">
            {customOrders.length === 0 && <p className="acp-empty">No custom orders yet 🎉</p>}
            {customOrders.map(order => (
              <div key={order.id} className={`acp-order-card ${order.status}`}>
                <div className="acp-order-header">
                  <strong>Table {order.tableId}</strong>
                  <span className={`acp-order-status ${order.status}`}>{order.status}</span>
                </div>
                <div className="acp-order-details">
                  <span>🍞 {order.order.bread}</span>
                  <span>🥩 {order.order.protein}</span>
                  <span>🧀 {order.order.cheese}</span>
                  <span>🥗 {order.order.veggies}</span>
                  <span>🫙 {order.order.sauce}</span>
                  {order.order.notes && <span>📝 {order.order.notes}</span>}
                </div>
                {order.status === 'pending' && (
                  <div className="acp-order-actions">
                    <button className="acp-confirm" onClick={() => handleOrderAction(order.id, 'confirmed')}>✅ Confirm</button>
                    <button className="acp-decline" onClick={() => handleOrderAction(order.id, 'declined')}>❌ Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Chat Panel ───────────────────────────────────────────────── */}
      <div className="acp-main">
        {!activeTable ? (
          <div className="acp-placeholder">
            <div>
              <p className="acp-placeholder-icon">💬</p>
              <p>Select a table to view their conversation</p>
              {urgentCount > 0 && <p className="acp-urgent-hint">{urgentCount} table(s) need your help!</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="acp-main-header">
              <div>
                <h3>Table {activeTable}</h3>
                <span className={`acp-status-pill ${activeConv?.status}`}>{activeConv?.status}</span>
              </div>
              <div className="acp-header-actions">
                {/* Join if not yet joined */}
                {activeConv?.status === 'admin' && !activeConv?.adminJoined && (
                  <button className="acp-action-btn join" onClick={() => joinChat(activeTable)}>👋 Join</button>
                )}
                {/* ✅ Fix #3: Return to Bot button */}
                {activeConv?.status === 'admin' && activeConv?.adminJoined && (
                  <button className="acp-action-btn return-bot" onClick={() => returnToBot(activeTable)}>
                    🤖 Return to Bot
                  </button>
                )}
                {activeConv?.status !== 'resolved' && (
                  <button className="acp-action-btn resolve" onClick={() => resolveChat(activeTable)}>✅ Resolve</button>
                )}
              </div>
            </div>

            {/* ✅ Fix #5: Proper chat bubble layout ─────────────────────── */}
            <div className="acp-messages">
              {activeConv?.messages.map((msg, i) => {
                if (msg.sender === 'system') return (
                  <div key={i} className="acp-sys-msg">{msg.text}</div>
                );

                const isAdmin = msg.sender === 'admin';
                const isUser = msg.sender === 'user';
                const isBot = msg.sender === 'bot';

                return (
                  <div key={i} className={`acp-msg-row ${isAdmin ? 'acp-row-right' : 'acp-row-left'}`}>
                    {!isAdmin && (
                      <span className="acp-msg-sender-label">
                        {isUser ? '🙋 Customer' : '🤖 Bot'}
                      </span>
                    )}
                    {isAdmin && (
                      <span className="acp-msg-sender-label acp-label-right">👨‍💼 You (Staff)</span>
                    )}
                    <div className={`acp-msg-bubble ${
                      isUser ? 'acp-bubble-user' :
                      isAdmin ? 'acp-bubble-admin' :
                      'acp-bubble-bot'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="acp-reply">
              <input
                type="text"
                placeholder={activeConv?.status === 'admin' ? "Reply as staff…" : "Join chat first to reply…"}
                value={replyText}
                disabled={activeConv?.status !== 'admin'}
                onChange={e => setReplyText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendReply()}
              />
              <button
                onClick={sendReply}
                disabled={activeConv?.status !== 'admin'}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminChatPanel;