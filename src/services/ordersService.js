import raw from './orders';

async function wrap(fn, ...args) {
  try {
    const data = await fn(...args);
    return { success: true, data, error: null };
  } catch (err) {
    const message = err?.message || (err?.response?.data && (err.response.data.error || err.response.data.message)) || 'API error';
    return { success: false, data: null, error: message, retry: () => fn(...args) };
  }
}

export const getAdminOrders = () => wrap(raw.getAdminOrders);
export const getOrder = (id) => wrap(raw.getOrder, id);
export const placeOrder = (payload) => wrap(raw.placeOrder, payload);
export const updateOrderStatus = (orderId, payload) => wrap(raw.updateOrderStatus, orderId, payload);
export const deleteOrder = (orderId) => wrap(raw.deleteOrder, orderId);
export const updateSharedOrderItem = (orderId, body) => wrap(raw.updateSharedOrderItem, orderId, body);
export const confirmCustomerPayment = (orderId, payload) => wrap(raw.confirmCustomerPayment, orderId, payload);
export const updateOrderSplits = (orderId, payload) => wrap(raw.updateOrderSplits, orderId, payload);
export default { getAdminOrders, getOrder, placeOrder, updateOrderStatus, deleteOrder, updateSharedOrderItem, confirmCustomerPayment, updateOrderSplits };