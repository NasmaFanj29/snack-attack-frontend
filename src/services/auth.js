import axios from './apiClient';

export async function login(credentials) {
  const res = await axios.post('/api/staff/login', credentials); // ✅ Added /api
  return res.data;
}

export async function me() {
  const res = await axios.get('/api/me');
  return res.data;
}

export default { login, me };