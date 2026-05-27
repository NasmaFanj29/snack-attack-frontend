import axios from './apiClient';

export async function createPaymentIntent(orderIdOrPayload) {
  const payload = typeof orderIdOrPayload === 'string' 
    ? { orderId: orderIdOrPayload } 
    : orderIdOrPayload;
  
  // backend بيجيب الـ amount من الـ DB بنفسه
  // بس الـ validator بيطلبه — حطه كـ placeholder
  if (!payload.amount) payload.amount = 0.01;
  
  const res = await axios.post('/api/payment-intent', payload);
  return res.data;
}

export default { createPaymentIntent };
