import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { setAuthToken, getTokenFromStorage } from '../services/apiClient';
import authService from '../services/authService';
import socketManager from '../socket';

const STAFF_KEY = 'snackOnlineStaff';

let staffChannel = null;
try { staffChannel = new BroadcastChannel('snack-staff'); } catch {}

export const getOnlineStaff = () => {
  try { return JSON.parse(localStorage.getItem(STAFF_KEY) || '{}'); } catch { return {}; }
};

const setOnline = (user) => {
  const staff = getOnlineStaff();
  // ensure username exists
  const uname = user.username || user.name || 'unknown';
  staff[uname] = { name: user.name || uname, role: user.role, since: Date.now() };
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  staffChannel?.postMessage({ type: 'STAFF_UPDATE', staff });
};

const setOffline = (username) => {
  const staff = getOnlineStaff();
  delete staff[username];
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  staffChannel?.postMessage({ type: 'STAFF_UPDATE', staff });
};

export const subscribeToStaff = (cb) => {
  const h = (e) => {
    if (e.key === STAFF_KEY) {
      try { cb(JSON.parse(e.newValue || '{}')); } catch {}
    }
  };
  window.addEventListener('storage', h);
  if (staffChannel) staffChannel.onmessage = (e) => e.data?.staff && cb(e.data.staff);
  return () => {
    window.removeEventListener('storage', h);
    if (staffChannel) staffChannel.onmessage = null;
  };
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('snackUser') || 'null'); } catch { return null; }
  });

  // Initialize axios auth header from stored token
  useEffect(() => {
    const token = getTokenFromStorage();
    if (token) setAuthToken(token);
    try { if (token) socketManager.setAuthToken(token); } catch (e) {}
  }, []);

  // Listen for centralized unauthorized events (API -> 401)
  // (moved below logout to avoid referencing before declaration)

  const login = async (username, password) => {
  try {
    const res = await authService.login({ username, password });
    console.log("AUTH RESPONSE:", res);
    const data = res?.data || res;

    if (!data?.token) {
      console.error('Login failed', data?.error || 'unknown response');
      return false;
    }

    const { token, role, name } = data;

    const u = { username, name, role };

    localStorage.setItem('snackToken', token);
    localStorage.setItem('snackUser', JSON.stringify(u));

    setAuthToken(token);
    socketManager.setAuthToken(token);

    setUser(u);
    setOnline(u);

    return role;
  } catch (err) {
    console.error('Login failed', err?.response?.data || err.message);
    return false;
  }
};

  const logout = useCallback(() => {
  if (user) setOffline(user.username || user.name || 'unknown');
  setUser(null);
  localStorage.removeItem('snackUser');
  localStorage.removeItem('snackToken');
  setAuthToken(null);
  try { socketManager.setAuthToken(null); socketManager.disconnect(); } catch (e) {}
}, [user]);

  // Listen for centralized unauthorized events (API -> 401)
  useEffect(() => {
    const handleUnauthorized = () => {
      try { logout(); } catch (e) { /* ignore */ }
      try { window.location.replace('/login'); } catch (e) { /* ignore */ }
    };
    window.addEventListener('snack:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('snack:unauthorized', handleUnauthorized);
  }, [logout]);

  const userRef = useRef(user);
useEffect(() => { userRef.current = user; }, [user]);
  // Mark online on mount, offline on tab close
  useEffect(() => {
  const handleClose = () => {
    const u = userRef.current;
    if (u) setOffline(u.username || u.name || 'unknown');
  };
  window.addEventListener('beforeunload', handleClose);
  return () => window.removeEventListener('beforeunload', handleClose);
}, []); // runs once, reads latest user via ref

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);