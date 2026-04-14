import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/navbar';
import Footer from './components/footer';
import Home from './pages/home';
import MenuPage from './pages/menu'; 
import CustomBurger from './pages/CustomBurger';
import Cart from './pages/cart';
import Checkout from './pages/Checkout';
import Admin from './pages/admin';

function AppContent({ cart, setCart, addToCart, removeFromCart, setMenuItems }) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const queryParams = new URLSearchParams(location.search);
  const tableFromQR = queryParams.get('table') || localStorage.getItem('activeTable') || 1;

  useEffect(() => {
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
          <Route path='/menu' element={<MenuPage addToCart={addToCart} removeFromCart={removeFromCart} setMenuItems={setMenuItems} cartItems={cart}/>} />
          <Route path='/customize' element={<CustomBurger addToCart={addToCart} />} />
          <Route path='/cart' element={<Cart cart={cart} setCart={setCart} addToCart={addToCart} removeFromCart={removeFromCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} tableId={tableFromQR} />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/cart/:orderId" element={<Cart isJoinMode={true} addToCart={addToCart} removeFromCart={removeFromCart} setCart={setCart}/>} />
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

  const addToCart = (nameOrItem, price, image = null, quantity = 1, selectedExtras = [], databaseId = null) => {
    // ✅ Fix: Extract name safely to prevent .includes crash
    const name = typeof nameOrItem === 'object' ? nameOrItem.name : nameOrItem;
    const itemPrice = typeof nameOrItem === 'object' ? nameOrItem.price : price;
    const itemExtras = typeof nameOrItem === 'object' ? (nameOrItem.selectedExtras || []) : selectedExtras;

    setCart((prevCart) => {
      const currentCart = Array.isArray(prevCart) ? prevCart : [];
      const existingItem = currentCart.find(item => 
        item.name === name && 
        JSON.stringify(item.selectedExtras || []) === JSON.stringify(itemExtras)
      );

      if (existingItem && !String(name).includes("Custom:")) { 
        return currentCart.map(item => 
          item === existingItem ? { ...item, quantity: item.quantity + (typeof nameOrItem === 'object' ? 1 : quantity) } : item
        );
      }

      return [...currentCart, { 
        id: Date.now() + Math.random(), 
        databaseId: typeof nameOrItem === 'object' ? nameOrItem.databaseId : databaseId, 
        name: name, 
        price: itemPrice, 
        image: typeof nameOrItem === 'object' ? nameOrItem.image : image, 
        quantity: typeof nameOrItem === 'object' ? 1 : quantity,
        selectedExtras: itemExtras
      }];
    });
  };

  const removeFromCart = (nameOrItem) => {
    const name = typeof nameOrItem === 'object' ? nameOrItem.name : nameOrItem;
    const extras = typeof nameOrItem === 'object' ? (nameOrItem.selectedExtras || []) : [];

    setCart((prevCart) => {
      const existingItem = prevCart.find(item => 
        item.name === name && 
        JSON.stringify(item.selectedExtras || []) === JSON.stringify(extras)
      );
      if (!existingItem) return prevCart;

      if (existingItem.quantity > 1) {
        return prevCart.map(item =>
          item === existingItem ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevCart.filter(item => item !== existingItem);
    });
  };

  return (
    <BrowserRouter>
      <AppContent 
        cart={cart} 
        setCart={setCart} 
        addToCart={addToCart} 
        removeFromCart={removeFromCart}
        setMenuItems={setMenuItems} 
      />
    </BrowserRouter>
  );
}

export default App;