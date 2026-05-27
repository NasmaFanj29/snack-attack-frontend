import axios from './apiClient';

export async function getMenu() {
  const res = await axios.get('/api/menu')
  return res.data;
}

export async function getExtras() {
  const res = await axios.get('/api/extras');
  return res.data;
}

export async function getItemExtras(id) {
  const res = await axios.get(`/api/item-extras/${id}`); // ✅ Added /api for consistency
  return res.data;
}

export default { getMenu, getExtras, getItemExtras };
