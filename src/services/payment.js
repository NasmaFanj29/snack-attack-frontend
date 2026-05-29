import axios from './apiClient';

export async function createPaymentIntent(orderIdOrPayload) {
  const payload = typeof orderIdOrPayload === 'string' 
    ? { orderId: orderIdOrPayload } 
    : orderIdOrPayload;
  
  if (!payload.amount) payload.amount = 0.01;
  
  const res = await axios.post('/api/payment-intent', {
    ...payload,
    orderId: parseInt(payload.orderId), // ✅ string → integer
  });
  return res.data;
}

export default { createPaymentIntent };