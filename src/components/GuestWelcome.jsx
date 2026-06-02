import React, { useState } from 'react';

export default function GuestWelcome({ onDone }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

 const handleStart = () => {
    if (!name.trim() || !phone.trim()) return;
    localStorage.setItem('guestName', name.trim());
    localStorage.setItem('guestPhone', phone.trim());
    onDone();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px', padding: '40px 28px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍔</div>
        <h1 style={{ color: '#FFC20E', fontSize: '22px', fontWeight: '900', margin: '0 0 6px' }}>
          SNACK ATTACK
        </h1>
        <p style={{ color: '#888', fontSize: '13px', marginBottom: '32px' }}>
          Enter your details to start ordering
        </p>

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            fontSize: '15px', marginBottom: '24px', boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        <button
          onClick={handleStart}
          disabled={!name.trim() || !phone.trim()}
          style={{
            width: '100%', padding: '16px',
            borderRadius: '14px', border: 'none',
            background: name.trim() && phone.trim()
              ? 'linear-gradient(135deg, #FFC20E, #ff9f0a)'
              : 'rgba(255,255,255,0.1)',
            color: name.trim() && phone.trim() ? '#000' : '#555',
            fontWeight: '900', fontSize: '15px',
            letterSpacing: '1px', cursor: name.trim() && phone.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          START ORDERING →
        </button>
      </div>
    </div>
  );
}