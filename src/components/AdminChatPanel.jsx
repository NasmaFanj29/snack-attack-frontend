import React, { useState, useEffect, useRef } from 'react';
import {
  getAllConversations,
  addMessage,
  setTableStatus,
  clearTableChat,
  subscribeToChats,
} from './chatbotStore';
import '../style/adminChat.css';

function AdminChatPanel() {
  const [conversations, setConversations] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const initial = getAllConversations();
    setConversations(initial);
    if (!selectedTable) {
      const tables = Object.keys(initial).filter(t => initial[t]?.messages?.length > 0);
      if (tables.length > 0) setSelectedTable(tables[0]);
    }
    const unsub = subscribeToChats((updated) => setConversations({ ...updated }));
    return unsub;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedTable]);

  const tableIds = Object.keys(conversations).filter(
    (tid) => conversations[tid]?.messages?.length > 0
  );
  const activeConv    = selectedTable ? conversations[selectedTable] : null;
  const isAdminActive = activeConv?.status === 'admin';
  const needsAdmin    = tableIds.filter(tid => conversations[tid]?.status === 'admin');

  const getLastMessage = (tableId) => {
    const conv = conversations[tableId];
    if (!conv?.messages?.length) return '—';
    return conv.messages[conv.messages.length - 1]?.text?.slice(0, 40) || '—';
  };
  const getUnread = (tableId) =>
    conversations[tableId]?.messages?.filter(m => m.sender === 'user' && !m.readByAdmin).length || 0;

  const handleTakeOver = () => {
    if (!selectedTable) return;
    setTableStatus(selectedTable, 'admin');
    addMessage(selectedTable, { sender: 'system', text: 'Staff has joined the conversation.' });
  };
  const handleHandBack = () => {
    if (!selectedTable) return;
    setTableStatus(selectedTable, 'bot');
    addMessage(selectedTable, { sender: 'system', text: 'You are now chatting with Snack Assistant.' });
  };
  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTable) return;
    addMessage(selectedTable, { sender: 'admin', text: replyText.trim() });
    setReplyText('');
  };
  const handleClearChat = (tableId) => {
    if (!window.confirm('Clear chat for Table ' + tableId + '?')) return;
    clearTableChat(tableId);
    if (selectedTable === tableId) setSelectedTable(null);
  };

  return (
    <div className="admin-chat-panel">
      <div className="acp-sidebar">
        <div className="acp-sidebar-header">
          <button className="acp-tab active">
            💬 Chats
            {needsAdmin.length > 0 && <span className="acp-badge urgent">{needsAdmin.length}</span>}
          </button>
        </div>
        <div className="acp-list">
          {tableIds.length === 0 && <p className="acp-empty">No active chats yet.</p>}
          {tableIds.map((tid) => {
            const conv       = conversations[tid];
            const isAdmin    = conv?.status === 'admin';
            const isSelected = selectedTable === tid;
            const unread     = getUnread(tid);
            return (
              <div
                key={tid}
                className={'acp-conv-item' + (isSelected ? ' selected' : '') + (isAdmin ? ' urgent' : '')}
                onClick={() => setSelectedTable(tid)}
              >
                <div className="acp-conv-top">
                  <span className="acp-table-name">Table {tid}</span>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span className={'acp-status-pill ' + (conv?.status || 'bot')}>
                      {conv?.status === 'admin' ? 'Staff' : 'Bot'}
                    </span>
                    {unread > 0 && <span className="acp-badge urgent">{unread}</span>}
                  </div>
                </div>
                <p className="acp-conv-preview">{getLastMessage(tid)}</p>
                {isAdmin && !isSelected && (
                  <button className="acp-join-btn" onClick={(e) => { e.stopPropagation(); setSelectedTable(tid); }}>
                    ⚡ Open Chat
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="acp-main">
        {!selectedTable || !activeConv ? (
          <div className="acp-placeholder">
            <div>
              <div className="acp-placeholder-icon">💬</div>
              <p>Select a table to view the chat</p>
              {needsAdmin.length > 0 && (
                <p className="acp-urgent-hint">⚡ {needsAdmin.length} chat(s) need staff attention!</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="acp-main-header">
              <h3>
                Table {selectedTable}&nbsp;
                <span className={'acp-status-pill ' + (activeConv.status || 'bot')}>
                  {isAdminActive ? '● Staff Active' : '● Bot Active'}
                </span>
              </h3>
              <div className="acp-header-actions">
                {!isAdminActive
                  ? <button className="acp-action-btn join" onClick={handleTakeOver}>Take Over Chat</button>
                  : <button className="acp-action-btn return-bot" onClick={handleHandBack}>Hand Back to Bot</button>
                }
                <button className="acp-action-btn resolve" onClick={() => handleClearChat(selectedTable)}>Clear</button>
              </div>
            </div>

            <div className="acp-messages">
              {activeConv.messages.map((msg, i) => {
                if (msg.sender === 'system') return <div key={i} className="acp-sys-msg">{msg.text}</div>;
                const isUser  = msg.sender === 'user';
                const isAdm   = msg.sender === 'admin';
                return (
                  <div key={i} className={'acp-msg-row ' + (isUser ? 'acp-row-right' : 'acp-row-left')}>
                    <span className={'acp-msg-sender-label ' + (isUser ? 'acp-label-right' : '')}>
                      {isUser ? 'Customer' : isAdm ? '👑 Staff' : '🤖 Bot'}
                    </span>
                    <div className={'acp-msg-bubble ' + (isUser ? 'acp-bubble-user' : isAdm ? 'acp-bubble-admin' : 'acp-bubble-bot')}>
                      {msg.text}
                    </div>
                    {msg.timestamp && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, padding: '0 4px' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="acp-reply">
              <input
                type="text"
                placeholder={isAdminActive ? 'Type a reply to the customer...' : 'Take over chat to reply...'}
                value={replyText}
                disabled={!isAdminActive}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
              />
              <button onClick={handleSendReply} disabled={!isAdminActive || !replyText.trim()}>
                Send ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminChatPanel;