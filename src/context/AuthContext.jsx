import React, { createContext, useContext, useState, useEffect } from 'react';

const USERS = [
  { username: 'admin',    password: 'snack2024',   role: 'admin',   name: 'Admin' },
  { username: 'waiter1',  password: 'waiter123',   role: 'waiter',  name: 'Ahmad' },
  { username: 'waiter2',  password: 'waiter456',   role: 'waiter',  name: 'Sara' },
  { username: 'kitchen',  password: 'kitchen123',  role: 'kitchen', name: 'Kitchen Team' },
];

const STAFF_KEY   = 'snackOnlineStaff';
let staffChannel = null;
try { staffChannel = new BroadcastChannel('snack-staff'); } catch {}

export const getOnlineStaff = () => {
  try { return JSON.parse(localStorage.getItem(STAFF_KEY) || '{}'); } catch { return {}; }
};

const setOnline  = (user) => {
  const staff = getOnlineStaff();
  staff[user.username] = { name: user.name, role: user.role, since: Date.now() };
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
  const h = (e) => { if (e.key === STAFF_KEY) { try { cb(JSON.parse(e.newValue || '{}')); } catch {} } };
  window.addEventListener('storage', h);
  if (staffChannel) staffChannel.onmessage = (e) => e.data?.staff && cb(e.data.staff);
  return () => { window.removeEventListener('storage', h); if (staffChannel) staffChannel.onmessage = null; };
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('snackUser') || 'null'); } catch { return null; }
  });

  const login = (username, password) => {
    const found = USERS.find(u => u.username === username && u.password === password);
    if (!found) return false;
    setUser(found);
    localStorage.setItem('snackUser', JSON.stringify(found));
    setOnline(found);
    return found.role;
  };

  const logout = () => {
    if (user) setOffline(user.username);
    setUser(null);
    localStorage.removeItem('snackUser');
  };

  // Mark offline on tab close
  useEffect(() => {
    if (user) setOnline(user);
    const handleClose = () => { if (user) setOffline(user.username); };
    window.addEventListener('beforeunload', handleClose);
    return () => window.removeEventListener('beforeunload', handleClose);
  }, [user?.username]);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);