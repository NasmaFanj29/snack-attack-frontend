import axios from 'axios';

// Base URL from env. For local development set REACT_APP_API_URL=http://localhost:5000
// For production (Vercel) set REACT_APP_API_URL=https://your-backend-domain.com
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Configure global axios defaults so other modules importing 'axios' pick this up
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Accept'] = 'application/json';

// Request interceptor: attach token from localStorage on each request
axios.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('snackToken');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      try { window.dispatchEvent(new CustomEvent('snack:loading', { detail: { increment: 1 } })); } catch (e) {}
    } catch (e) { /* ignore */ }
    return config;
  },
  (err) => Promise.reject(err)
);

axios.interceptors.response.use(
  (response) => {
    try { window.dispatchEvent(new CustomEvent('snack:loading', { detail: { increment: -1 } })); } catch (e) {}
    return response;
  },
  (error) => {
    try { window.dispatchEvent(new CustomEvent('snack:loading', { detail: { increment: -1 } })); } catch (e) {}
    const status = error?.response?.status;
   
    if (status === 401) {
      try {
        localStorage.removeItem('snackToken');
        delete axios.defaults.headers.common['Authorization'];
      } catch (e) {}

      // ✅ بس dispatch إذا كنا على staff page
      const staffPaths = ['/admin', '/kitchen', '/waiter'];
      const isStaffPage = staffPaths.some(p => window.location.pathname.startsWith(p));
      
      if (isStaffPage) {
        try { window.dispatchEvent(new Event('snack:unauthorized')); } catch (e) {}
      }
      
      return Promise.reject(new Error('Unauthorized'));
    }

    const message = error?.response?.data?.error || error?.response?.data?.message || error.message || 'API error';
    try {
      const retry = () => axios(error.config);
      const evt = new CustomEvent('snack:apiError', { detail: { message, status, retry } });
      window.dispatchEvent(evt);
    } catch (e) {}
    error.message = message;
    return Promise.reject(error);
  }
);

export function setAuthToken(token) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}

export function getTokenFromStorage() {
  try { return localStorage.getItem('snackToken') || null; } catch { return null; }
}

export { API_URL };
export default axios;
