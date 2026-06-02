import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import Navbar from './components/navbar';
import Footer from './components/footer';
import Home from './pages/home';
import MenuPage from './pages/menu';
import CustomBurger from './pages/CustomBurger';
import Cart from './pages/cart';
import Checkout from './pages/Checkout';
import Admin from './pages/admin';
import Kitchen from './pages/Kitchen';
import Waiter from './pages/Waiter';
import Login from './pages/Login';
import Chatbot from "./components/Chatbot";
import './style/theme.css';
import QRGenerator from './pages/QRGenerator';
import GuestWelcome from './components/GuestWelcome';

function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

const STAFF_PATHS = ['/admin', '/kitchen', '/waiter', '/login'];

function AppContent({ cart, setCart, addToCart, removeFromCart, setMenuItems, menuItems, extras }) {
  const location = useLocation();
  const isStaff  = STAFF_PATHS.some(p => location.pathname.startsWith(p));
  const isHomePage = location.pathname === '/';
  const queryParams  = new URLSearchParams(location.search);
  const tableFromQR  = queryParams.get('table') || localStorage.getItem('activeTable') || 1;

 const isScannerJoin = new URLSearchParams(location.search).get('mode') === 'add';

const [showWelcome, setShowWelcome] = useState(() => {
  if (isStaff) return false;
  if (isScannerJoin) return false;  // scanner has own JoinForm
  return !localStorage.getItem('guestName') || !localStorage.getItem('guestPhone');
});

useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
useEffect(() => {
  window.history.scrollRestoration = "manual";
}, []);

  useEffect(() => {
    const tableId = queryParams.get('table');
    if (tableId) localStorage.setItem('activeTable', tableId);
  }, [location.search]);

  return (
    <div className="App">
      {showWelcome && !isStaff && (
        <GuestWelcome onDone={() => setShowWelcome(false)} />
      )}
      {!isStaff && (
        <Navbar
          cartCount={cart.length}
          cartItems={cart}
          removeFromCart={removeFromCart}
          addToCart={addToCart}
        />
      )}
      <main>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/menu"      element={<MenuPage addToCart={addToCart} removeFromCart={removeFromCart} setMenuItems={setMenuItems} cartItems={cart} />} />
          <Route path="/customize" element={<CustomBurger addToCart={addToCart} />} />
          <Route path="/cart"      element={<Cart cart={cart} setCart={setCart} addToCart={addToCart} removeFromCart={removeFromCart} />} />
          <Route path="/checkout" element={<Checkout setCart={setCart} />} />
          <Route path="/cart/:orderId" element={<Cart isJoinMode={true} addToCart={addToCart} removeFromCart={removeFromCart} setCart={setCart} />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/admin"     element={<ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>} />
          <Route path="/kitchen"   element={<ProtectedRoute allowedRoles={['kitchen']}><Kitchen /></ProtectedRoute>} />
          <Route path="/waiter"    element={<ProtectedRoute allowedRoles={['waiter']}><Waiter /></ProtectedRoute>} />
          <Route path="/qr-generator" element={<ProtectedRoute allowedRoles={['admin']}><QRGenerator /></ProtectedRoute>} />
        </Routes>
      <Chatbot menuItems={menuItems} extras={extras} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} setCart={setCart}/>
      </main>
      {!isStaff && <Footer className={isHomePage ? 'home-footer' : 'general-footer'} />}
    </div>
  );
}

function App() {
 const getTableId = () => localStorage.getItem('activeTable') || '1';

const [cart, setCart] = useState(() => {
  try {
    const s = localStorage.getItem(`snackAttackCart_${getTableId()}`);
    const p = JSON.parse(s || '[]');
    return Array.isArray(p) ? p : [];
  } catch { return []; }
});

  const [menuItems, setMenuItems] = useState([]);
  const [extras, setExtras]       = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Preload menu
  useEffect(() => {
    fetch(`${API_URL}/api/menu`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.menu)) {
          setMenuItems(data.menu.map(item => ({ ...item, price: Number(item.price) || 0 })));
        }
      })
      .catch(err => console.error('Failed to preload menu:', err));
  }, []);

  // Preload extras
  useEffect(() => {
    fetch(`${API_URL}/api/extras`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.extras)) {
          setExtras(data.extras.map(e => ({ ...e, price: Number(e.price) || 0 })));
        }
      })
      .catch(err => console.error('Failed to preload extras:', err));
  }, []);

  useEffect(() => {
  localStorage.setItem(`snackAttackCart_${getTableId()}`, JSON.stringify(cart));
}, [cart]);

  const addToCart = (item) => {
    setCart(prev => {
      const cur = Array.isArray(prev) ? prev : [];
      if (item.isCustom) return [...cur, item];

      const hasNote    = item.specialNote && item.specialNote.trim();
      const hasRemoved = Array.isArray(item.removedExtras) && item.removedExtras.length > 0;

      if (hasNote || hasRemoved) {
        return [...cur, {
          id:             item.id || Date.now(),
          databaseId:     item.databaseId || item.id,
          name:           item.name,
          price:          item.price,
          image:          item.image,
          quantity:       1,
          selectedExtras: item.selectedExtras || [],
          removedExtras:  item.removedExtras  || [],
          specialNote:    item.specialNote    || null,
        }];
      }

      const itemExtras = item.selectedExtras || [];
      const existing = cur.find(i =>
        i.name === item.name &&
        !i.specialNote &&
        !(i.removedExtras && i.removedExtras.length > 0) &&
        JSON.stringify(i.selectedExtras || []) === JSON.stringify(itemExtras)
      );

      if (existing) {
      return cur.map(i => i === existing 
        ? { ...i, quantity: i.quantity + (item.quantity || 1) }  // ← هيدا
        : i);
    }

      return [...cur, {
        id:             item.id || Date.now(),
        databaseId:     item.databaseId || item.id,
        name:           item.name,
        price:          item.price,
        image:          item.image,
        quantity:       item.quantity || 1,
        selectedExtras: itemExtras,
        removedExtras:  [],
        specialNote:    null,
      }];
    });
  };

  const removeFromCart = (nameOrItem) => {
    const name   = typeof nameOrItem === 'object' ? nameOrItem.name : nameOrItem;
    const extras = typeof nameOrItem === 'object' ? (nameOrItem.selectedExtras || []) : [];
    setCart(prev => {
      const existing = prev.find(i =>
        i.name === name &&
        JSON.stringify(i.selectedExtras || []) === JSON.stringify(extras)
      );
      if (!existing) return prev;
      if (existing.quantity > 1) return prev.map(i => i === existing ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i !== existing);
    });
  };

  return (
    <BrowserRouter>
      <LoadingProvider>
        <AuthProvider>
          <AppErrorListener />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              },
              success: { iconTheme: { primary: '#95b508', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <LoadingOverlay />
          <AppContent
            cart={cart}
            setCart={setCart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            setMenuItems={setMenuItems}
            menuItems={menuItems}
            extras={extras}
          />
        </AuthProvider>
      </LoadingProvider>
    </BrowserRouter>
  );
}

function AppErrorListener() {
  useEffect(() => {
    const h = (e) => {
      try {
        const { message, retry } = e?.detail || {};
        const msg = message || 'API error';
        if (typeof retry === 'function') {
          toast((t) => (
            <div style={{ maxWidth: 420 }}>
              <div style={{ marginBottom: 8 }}>{msg}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { retry().then(() => toast.success('Retry succeeded')).catch(() => toast.error('Retry failed')); toast.dismiss(t.id); }} style={{ padding: '6px 8px' }}>Retry</button>
                <button onClick={() => toast.dismiss(t.id)} style={{ padding: '6px 8px' }}>Dismiss</button>
              </div>
            </div>
          ), { duration: 10000 });
        } else {
          toast.error(msg);
        }
      } catch (err) {}
    };
    window.addEventListener('snack:apiError', h);
    return () => window.removeEventListener('snack:apiError', h);
  }, []);
  return null;
}

function LoadingOverlay() {
  const { isLoading } = useLoading() || { isLoading: false };
  if (!isLoading) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)', padding: 20, borderRadius: 12, color: '#fff' }}>
        Loading...
      </div>
    </div>
  );
}

export default App;