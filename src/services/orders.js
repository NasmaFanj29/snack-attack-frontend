import axios from './apiClient';

export async function getAdminOrders() {
  const res = await axios.get('/api/admin/orders');
  return res.data;
}

export async function getOrder(id) {
  const res = await axios.get(`/api/orders/${id}`);
  return res.data;
}

export async function placeOrder(payload) {
  const res = await axios.post('/api/orders', payload);
  return res.data;
}

export async function updateOrderStatus(orderId, payload) {
  const res = await axios.put(`/api/admin/orders/${orderId}/status`, payload);
  return res.data;
}

export async function deleteOrder(orderId) {
  const res = await axios.delete(`/api/admin/orders/${orderId}`);
  return res.data;
}

export async function updateSharedOrderItem(orderId, body) {
  const res = await axios.post(`/api/orders/${orderId}/update-item`, body);
  return res.data;
}

export async function confirmCustomerPayment(orderId, payload) {
  const res = await axios.put(`/api/orders/${orderId}/confirm-payment`, payload);
  return res.data;
}

export async function updateOrderSplits(orderId, payload) {
  const res = await axios.put(`/api/orders/${orderId}/splits`, payload);
  return res.data;
}

export default { getAdminOrders, getOrder, placeOrder, updateOrderStatus, deleteOrder, updateSharedOrderItem, confirmCustomerPayment, updateOrderSplits };