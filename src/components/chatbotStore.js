// ═══════════════════════════════════════════════════
//  chatbotStore.js  —  Snack Attack Chat State
//  Handles: messages, bot/admin mode, custom orders
// ═══════════════════════════════════════════════════

const CHATS_KEY  = 'snack_chats';
const ORDERS_KEY = 'snack_custom_orders';
const CART_KEY   = 'snack_cart';

// BroadcastChannel — syncs between customer tab & admin tab
let chatChannel  = null;
let orderChannel = null;
try {
  chatChannel  = new BroadcastChannel('snack_chat_bc');
  orderChannel = new BroadcastChannel('snack_order_bc');
} catch (_) {}

// ─── Conversations ───────────────────────────────────────────────

export const getAllConversations = () => {
  try { return JSON.parse(localStorage.getItem(CHATS_KEY) || '{}'); }
  catch { return {}; }
};

export const getTableConversation = (tableId) => {
  const all = getAllConversations();
  return all[String(tableId)] ?? {
    tableId: String(tableId),
    messages: [],
    status: 'bot',
  };
};

// ── saveConversations: fires BOTH cross-tab AND same-tab events ──
export const saveConversations = (all) => {
  localStorage.setItem(CHATS_KEY, JSON.stringify(all));

  // Cross-tab sync (BroadcastChannel)
  chatChannel?.postMessage({ type: 'UPDATE', conversations: all });

  // Same-tab sync (CustomEvent) — this is what was missing!
  window.dispatchEvent(new CustomEvent('snackChatUpdate', { detail: all }));
};

// Alias for internal use
const saveAll = saveConversations;

// Alias for AdminChatPanel imports
export const getConversations = getAllConversations;

export const addMessage = (tableId, message) => {
  const all = getAllConversations();
  const tid = String(tableId);
  if (!all[tid]) all[tid] = { tableId: tid, messages: [], status: 'bot' };
  all[tid].messages.push({ ...message, timestamp: Date.now() });
  saveAll(all);
};

export const setTableStatus = (tableId, status) => {
  const all = getAllConversations();
  const tid = String(tableId);
  if (!all[tid]) all[tid] = { tableId: tid, messages: [], status: 'bot' };
  all[tid].status = status;
  saveAll(all);
};

export const clearTableChat = (tableId) => {
  const all = getAllConversations();
  const tid = String(tableId);
  all[tid] = { tableId: tid, messages: [], status: 'bot' };
  saveAll(all);
};

// ── subscribeToChats: listens to ALL 3 channels ──────────────────
// 1. localStorage 'storage' event (cross-tab, different tabs)
// 2. BroadcastChannel (cross-tab, faster)
// 3. CustomEvent 'snackChatUpdate' (same-tab — was missing before!)
export const subscribeToChats = (callback) => {
  // Cross-tab via localStorage event
  const onStorage = (e) => {
    if (e.key === CHATS_KEY) {
      try { callback(JSON.parse(e.newValue || '{}')); } catch (_) {}
    }
  };
  window.addEventListener('storage', onStorage);

  // Cross-tab via BroadcastChannel
  if (chatChannel) {
    chatChannel.onmessage = (e) => {
      if (e.data?.conversations) callback(e.data.conversations);
    };
  }

  // ✅ Same-tab via CustomEvent (fixes admin panel not seeing updates)
  const onSameTab = (e) => {
    if (e.detail) callback(e.detail);
  };
  window.addEventListener('snackChatUpdate', onSameTab);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('snackChatUpdate', onSameTab);
    if (chatChannel) chatChannel.onmessage = null;
  };
};

// ─── Custom Orders ────────────────────────────────────────────────

export const getCustomOrders = () => {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
  catch { return []; }
};

export const addCustomOrder = (tableId, order) => {
  const orders = getCustomOrders();
  const entry = {
    id: Date.now(),
    tableId: String(tableId),
    order,
    status: 'pending',
    timestamp: Date.now(),
  };
  orders.push(entry);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  orderChannel?.postMessage({ type: 'NEW_ORDER', order: entry });
  return entry;
};

export const updateCustomOrderStatus = (orderId, status) => {
  const orders = getCustomOrders();
  const i = orders.findIndex((o) => o.id === orderId);
  if (i === -1) return null;
  orders[i].status = status;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  orderChannel?.postMessage({ type: 'ORDER_UPDATE', orderId, status });
  return orders[i];
};

export const subscribeToOrders = (callback) => {
  if (orderChannel) orderChannel.onmessage = (e) => callback(e.data);
  return () => { if (orderChannel) orderChannel.onmessage = null; };
};

