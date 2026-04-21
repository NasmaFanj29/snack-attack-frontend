import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../style/login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 400));
    const role = login(form.username, form.password);
    setLoading(false);
    if (!role) { setError('Wrong credentials. Try again! ❌'); return; }
    navigate(role === 'admin' ? '/admin' : role === 'waiter' ? '/waiter' : '/kitchen');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🍔</div>
        <h1 className="login-brand">SNACK ATTACK</h1>
        <p className="login-subtitle">Staff Portal</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <span className="login-spinner" /> : 'LOGIN →'}
          </button>
        </form>
      </div>
    </div>
  );
}