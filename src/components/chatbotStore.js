const STORAGE_KEY = 'snackAttackChats';
const ORDERS_KEY = 'snackAttackCustomOrders';
const CART_KEY = 'snackAttackCart';

let channel = null;
let ordersChannel = null;
try {
  channel = new BroadcastChannel('snack-attack-chats');
  ordersChannel = new BroadcastChannel('snack-attack-orders');
} catch (e) {}

export const getConversations = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

export const getTableConversation = (tableId) => {
  const convs = getConversations();
  return convs[String(tableId)] || { tableId: String(tableId), messages: [], status: 'bot', adminJoined: false };
};

export const saveConversations = (convs) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  channel?.postMessage({ type: 'CHAT_UPDATE', conversations: convs });
};

export const addMessage = (tableId, message) => {
  const convs = getConversations();
  const tid = String(tableId);
  if (!convs[tid]) convs[tid] = { tableId: tid, messages: [], status: 'bot', adminJoined: false };
  convs[tid].messages.push({ ...message, timestamp: Date.now() });
  saveConversations(convs);
};

export const setTableStatus = (tableId, status, extra = {}) => {
  const convs = getConversations();
  const tid = String(tableId);
  if (!convs[tid]) convs[tid] = { tableId: tid, messages: [], status: 'bot', adminJoined: false };
  convs[tid] = { ...convs[tid], status, ...extra };
  saveConversations(convs);
};

// ─── Custom Orders ──────────────────────────────────────────────────────────

export const getCustomOrders = () => {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
  catch { return []; }
};

export const addCustomOrder = (tableId, order) => {
  const orders = getCustomOrders();
  const newOrder = { id: Date.now(), tableId: String(tableId), order, status: 'pending', timestamp: Date.now() };
  orders.push(newOrder);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  ordersChannel?.postMessage({ type: 'NEW_ORDER', order: newOrder });
  return newOrder;
};

export const updateCustomOrderStatus = (orderId, status) => {
  const orders = getCustomOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return null;
  orders[idx].status = status;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  ordersChannel?.postMessage({ type: 'ORDER_UPDATE', orderId, status, tableId: orders[idx].tableId });
  return orders[idx];
};

// ─── Add confirmed custom order to main cart ────────────────────────────
export const addCustomOrderToCart = (order, tableId) => {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    const customItem = {
      id: Date.now() + Math.random(),
      databaseId: null,
      name: `Custom: ${order.protein} on ${order.bread}`,
      price: 13.99,
      image: null,
      quantity: 1,
      isCustom: true,
      selectedExtras: [
        order.cheese && order.cheese !== 'none' ? { name: `🧀 ${order.cheese}`, price: 0 } : null,
        order.veggies ? { name: `🥗 ${order.veggies}`, price: 0 } : null,
        order.sauce && order.sauce !== 'none' ? { name: `🫙 ${order.sauce}`, price: 0 } : null,
        order.notes ? { name: `📝 ${order.notes}`, price: 0 } : null,
      ].filter(Boolean),
    };
    cart.push(customItem);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // Notify App.jsx to reload cart
    window.dispatchEvent(new CustomEvent('snackCartExternalUpdate'));
    return customItem;
  } catch { return null; }
};

// ─── Subscriptions ──────────────────────────────────────────────────────────

export const subscribeToChats = (callback) => {
  const storageHandler = (e) => {
    if (e.key === STORAGE_KEY) {
      try { callback(JSON.parse(e.newValue || '{}')); } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);
  if (channel) channel.onmessage = (e) => e.data?.conversations && callback(e.data.conversations);
  return () => {
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.onmessage = null;
  };
};

export const subscribeToOrders = (callback) => {
  if (ordersChannel) ordersChannel.onmessage = (e) => callback(e.data);
  return () => { if (ordersChannel) ordersChannel.onmessage = null; };
};