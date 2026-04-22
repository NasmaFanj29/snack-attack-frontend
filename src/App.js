import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/navbar';
import Footer from './components/footer';
import Home from './pages/home';
import MenuPage from './pages/menu';
import CustomBurger from './pages/CustomBurger';
import Cart  from './pages/cart';
import Checkout from './pages/Checkout';
import Admin from './pages/admin';
import Kitchen from './pages/Kitchen';
import Waiter from './pages/Waiter';
import Login from './pages/Login';
import Chatbot from "./components/Chatbot";
import './style/theme.css';
import QRGenerator from './pages/QRGenerator';


// ── Protected route helper ─────────────────────────────────────────────────
function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

// ── Staff pages have no Navbar/Footer/Chatbot ──────────────────────────────
const STAFF_PATHS = ['/admin', '/kitchen', '/waiter', '/login'];

function AppContent({ cart, setCart, addToCart, removeFromCart, setMenuItems, menuItems }) {
  const location   = useLocation();
  const { user }   = useAuth();
  const isStaff    = STAFF_PATHS.some(p => location.pathname.startsWith(p));
  const isHomePage = location.pathname === '/';
  const queryParams = new URLSearchParams(location.search);
  const tableFromQR = queryParams.get('table') || localStorage.getItem('activeTable') || 1;

  useEffect(() => {
    const tableId = queryParams.get('table');
    if (tableId) localStorage.setItem('activeTable', tableId);
  }, [location.search]);

  return (
    <div className="App">
      {!isStaff && <Navbar cartCount={cart.length} />}
      <main>
        <Routes>
          {/* Public */}
          <Route path="/"          element={<Home />} />
          <Route path="/menu"      element={<MenuPage addToCart={addToCart} removeFromCart={removeFromCart} setMenuItems={setMenuItems} cartItems={cart} />} />
          <Route path="/customize" element={<CustomBurger addToCart={addToCart} />} />
          <Route path="/cart"      element={<Cart cart={cart} setCart={setCart} addToCart={addToCart} removeFromCart={removeFromCart} />} />
          <Route path="/checkout"  element={<Checkout cart={cart} setCart={setCart} tableId={tableFromQR} />} />
          <Route path="/cart/:orderId" element={<Cart isJoinMode={true} addToCart={addToCart} removeFromCart={removeFromCart} setCart={setCart} />} />
          {/* Login */}
          <Route path="/login" element={<Login />} />
          {/* Staff — protected */}
          <Route path="/admin"   element={<ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>} />
          <Route path="/kitchen" element={<ProtectedRoute allowedRoles={['kitchen']}><Kitchen /></ProtectedRoute>} />
          <Route path="/waiter"  element={<ProtectedRoute allowedRoles={['waiter']}><Waiter /></ProtectedRoute>} />
        <Route path="/qr-generator" element={<QRGenerator />} />
         
        </Routes>
        
        <Chatbot menuItems={menuItems} addToCart={addToCart} />
      </main>
      {!isStaff && <Footer className={isHomePage ? 'home-footer' : 'general-footer'} />}
    </div>
  );
}

function App() {
  const [cart, setCart] = useState(() => {
    try {
      const s = localStorage.getItem('snackAttackCart');
      const p = JSON.parse(s || '[]');
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  });

  const [menuItems, setMenuItems] = useState([]);
 



  useEffect(() => {
    localStorage.setItem('snackAttackCart', JSON.stringify(cart));
  }, [cart]);

  // 🚀 UPDATED addToCart Function
  const addToCart = (item) => {
    setCart(prev => {
      const cur = Array.isArray(prev) ? prev : [];
      
      // If it's a custom item from chatbot, just add it (no merging needed usually)
      if (item.isCustom) {
        return [...cur, item];
      }

      // Normal item logic
      const name = item.name;
      const itemExtras = item.selectedExtras || [];
      
      const existing = cur.find(i => i.name === name && JSON.stringify(i.selectedExtras || []) === JSON.stringify(itemExtras));
      
      if (existing) {
        return cur.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      
      return [...cur, {
        id: item.id || Date.now(),
        databaseId: item.databaseId || item.id,
        name: name,
        price: item.price,
        image: item.image,
        quantity: item.quantity || 1,
        selectedExtras: itemExtras,
      }];
    });
  };

  const removeFromCart = (nameOrItem) => {
    const name   = typeof nameOrItem === 'object' ? nameOrItem.name : nameOrItem;
    const extras = typeof nameOrItem === 'object' ? (nameOrItem.selectedExtras || []) : [];
    setCart(prev => {
      const existing = prev.find(i => i.name === name && JSON.stringify(i.selectedExtras || []) === JSON.stringify(extras));
      if (!existing) return prev;
      if (existing.quantity > 1) return prev.map(i => i === existing ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i !== existing);
    });
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent
          cart={cart} setCart={setCart}
          addToCart={addToCart} removeFromCart={removeFromCart}
          setMenuItems={setMenuItems} menuItems={menuItems}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;