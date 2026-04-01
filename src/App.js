import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/navbar';
import Footer from './components/footer';
import Home from './pages/home';
import MenuPage from './pages/menu'; 
import CustomBurger from './pages/CustomBurger';
import LocateUs from './pages/locateUs';
import Cart from './pages/cart';
import Checkout from './pages/Checkout';

function AppContent({ cart, setCart, addToCart, setMenuItems }) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const queryParams = new URLSearchParams(location.search);
  const tableFromQR = queryParams.get('table') || localStorage.getItem('activeTable') || 1;

  useEffect(() => {
    // --- 2. HON BAS SHIGHLTO Y-SEIVE ---
    const tableId = queryParams.get('table');
    if (tableId) {
      localStorage.setItem('activeTable', tableId);
    }
  }, [location.search]);

  return (
    <div className="App">
      <Navbar cartCount={cart.length} />
      <main>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/menu' element={<MenuPage addToCart={addToCart} setMenuItems={setMenuItems} />} />
          <Route path='/locate-us' element={<LocateUs />} />
          <Route path='/custom' element={<CustomBurger addToCart={addToCart} />} />
          <Route path='/cart' element={<Cart cart={cart} setCart={setCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} tableId={tableFromQR} />} />
        </Routes>
      </main>
      <Footer className={isHomePage ? "home-footer" : "general-footer"} />
    </div>
  );
}

function App() {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('snackAttackCart');
      if (!savedCart) return [];
      const parsed = JSON.parse(savedCart);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    localStorage.setItem('snackAttackCart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (name, price, image = null, quantity = 1, databaseId = null) => {
    setCart((prevCart) => {
      const currentCart = Array.isArray(prevCart) ? prevCart : [];
      const existingItem = currentCart.find(item => item.name === name);
      
      if (existingItem && !name.includes("Custom:")) { 
        return currentCart.map(item => 
          item.name === name ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...currentCart, { 
        id: Date.now() + Math.random(), 
        databaseId: databaseId, 
        name, 
        price, 
        image, 
        quantity 
      }];
    });
  };

  return (
    <BrowserRouter>
      <AppContent 
        cart={cart} 
        setCart={setCart} 
        addToCart={addToCart} 
        setMenuItems={setMenuItems} 
      />
    </BrowserRouter>
  );
}

export default App;