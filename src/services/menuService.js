import axios from './apiClient';

// Wrapper for consistent response format
async function wrap(fn, ...args) {
  try {
    const data = await fn(...args);
    return { success: true, data, error: null };
  } catch (err) {
    const message = err?.message || (err?.response?.data && (err.response.data.error || err.response.data.message)) || 'API error';
    return { success: false, data: null, error: message, retry: () => fn(...args) };
  }
}

async function getMenuRaw() {
  const res = await axios.get('/api/menu');
  return res.data;
}

async function getExtrasRaw() {
  const res = await axios.get('/api/extras');
  return res.data;
}

async function getItemExtrasRaw(id) {
  const res = await axios.get(`/api/item-extras/${id}`);
  return res.data;
}

export const getMenu = () => wrap(getMenuRaw);
export const getExtras = () => wrap(getExtrasRaw);
export const getItemExtras = (id) => wrap(getItemExtrasRaw, id);

export default { getMenu, getExtras, getItemExtras };