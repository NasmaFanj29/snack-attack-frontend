import { io } from 'socket.io-client';
import { API_URL, getTokenFromStorage } from './services/apiClient';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_URL || '';

// ─── Noop socket ─────────────────────────────────────────────────────────────
// A safe stand-in used before connect() is called or after disconnect().
// Stored as a module-level constant so identity checks (===) are reliable.
const NOOP_SOCKET = Object.freeze({
  on:                 () => {},
  off:                () => {},
  emit:               () => {},
  connect:            () => {},
  disconnect:         () => {},
  removeAllListeners: () => {},
  connected:          false,
});

// ─── SocketManager ───────────────────────────────────────────────────────────
class SocketManager {
  constructor() {
    this.url              = SOCKET_URL;
    this.socket           = NOOP_SOCKET;   // never null — always safe to call
    this.reconnectAttempts = 0;
    this.maxReconnect     = 5;
    // ⚠️  Do NOT connect here.
    // The module is imported at app start, before any user is authenticated.
    // connect() is called explicitly from AuthContext after login.
  }

  // ── connect ──────────────────────────────────────────────────────────────
  // Called once after the user logs in and a token is available.
  connect() {
    if (!this.url) {
      console.warn('[SocketManager] No URL configured — socket disabled.');
      return;
    }

    // Already have a live connection — nothing to do.
    if (this.socket !== NOOP_SOCKET && this.socket.connected) return;

    // Tear down any stale socket before creating a new one.
    this._destroy();

    const token = getTokenFromStorage();

   this.socket = io(this.url, {
  transports: ['websocket', 'polling'], // ✅ مهم جداً
  autoConnect: true,
  auth: { token },
  reconnectionAttempts: this.maxReconnect,
  reconnection: true,
});

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      console.info('[SocketManager] Connected.');
    });

    this.socket.on('disconnect', (reason) => {
      console.info('[SocketManager] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      this.reconnectAttempts += 1;
      console.warn(
        `[SocketManager] connect_error (attempt ${this.reconnectAttempts}/${this.maxReconnect}):`,
        err.message,
      );
    });
  }

  // ── setAuthToken ─────────────────────────────────────────────────────────
  // Called from AuthContext on login (with token) and on logout (with null).
  setAuthToken(token) {
    if (!token) {
      // Token cleared → treat as disconnect (logout path)
      this.disconnect();
      return;
    }

    if (this.socket === NOOP_SOCKET) {
      // First time we have a token → establish the connection now.
      this.connect();
      return;
    }

    // Update auth on an existing socket and cycle the connection so the
    // server sees the new credentials immediately.
    this.socket.auth = { ...this.socket.auth, token };

    if (this.socket.connected) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // ── room helpers ─────────────────────────────────────────────────────────
  joinRoom(room)    { this.socket.emit('join',       room);    }
  leaveRoom(room)   { this.socket.emit('leave',      room);    }
  joinOrder(orderId){ this.socket.emit('joinOrder',  orderId); }
  leaveOrder(orderId){ this.socket.emit('leaveOrder', orderId);}

  // ── event forwarding ─────────────────────────────────────────────────────
  on(event, handler)       { this.socket.on(event, handler);      }
  off(event, handler)      { this.socket.off(event, handler);     }
  emit(event, ...args)     { this.socket.emit(event, ...args);    }

  // ── state ─────────────────────────────────────────────────────────────────
  isConnected() { return this.socket.connected === true; }

 connectGuest() {
    if (!this.url) return;
    if (this.socket !== NOOP_SOCKET && this.socket.connected) return;
    this._destroy();
    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnect,
    });
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      console.info('[SocketManager] Guest connected.');
    });
    this.socket.on('connect_error', (err) => {
      console.warn('[SocketManager] guest connect_error:', err.message);
    });
  }


  disconnect() {
    this._destroy();
    console.info('[SocketManager] Disconnected and reset.');
  }

  // ── private ───────────────────────────────────────────────────────────────
  _destroy() {
    if (this.socket === NOOP_SOCKET) return;
    try {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    } catch (e) {
      console.warn('[SocketManager] Error during _destroy:', e.message);
    } finally {
      this.socket = NOOP_SOCKET;
      this.reconnectAttempts = 0;
    }
  }
}

const socketManager = new SocketManager();
export default socketManager;