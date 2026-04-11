import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/customBurger.css';

// --- ASSETS IMPORT ---
import burgerBunImg from "../assets/bun1.jpg";
import miniBunImg from "../assets/bunmini.jpg";
import noSesameImg from "../assets/bunwithoutsesame.jpg";
import submarineImg from "../assets/submarine.jpg";
import fajitaImg from "../assets/fajitabread.jpg";
import pestoImg from "../assets/pesto.jpg";
import ranchImg from "../assets/ranch.jpg";
import garlicMayoImg from "../assets/garlicmayo.jpg";
import avocadoImg from "../assets/mayoavocado.jpg";
import cheddarImg from "../assets/cheddar.jpg";
import bbqImg from "../assets/bbq.jpg";
import cocktailImg from "../assets/cocktail.jpg";
import picklesImg from "../assets/pickles.jpg";
import tomatoImg from "../assets/tomato.jpg";
import cucumberImg from "../assets/cucumber.jpg";
import icebergImg from "../assets/iceberg.jpg";
import jalapenoImg from "../assets/jalapeno.jpg";
import beefImg from "../assets/beef.jpg"; 
import chickenImg from "../assets/chicken.jpg";

function CustomBurger({ addToCart }) {
  const navigate = useNavigate();
  
  // 1. Sidebar Tab State - Starts as null (nothing opened)
  const [activeTab, setActiveTab] = useState(null);

  // 2. Selection States
  const [bread, setBread] = useState({ name: 'Burger Bun', price: 0.50, img: burgerBunImg });
  const [protein, setProtein] = useState({ name: 'Beef Patty', price: 5.00, img: beefImg });
  const [sauces, setSauces] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [visualLayers, setVisualLayers] = useState([]);

  // --- Visual Sync (The Stack) ---
  useEffect(() => {
    const newStack = [
      { id: 'bread-bottom', img: bread.img },
      { id: 'protein', img: protein.img },
      ...sauces.map((s, i) => ({ id: `sauce-${i}`, img: s.img })),
      ...toppings.map((t, i) => ({ id: `topping-${i}`, img: t.img })),
      { id: 'bread-top', img: bread.img } 
    ];
    setVisualLayers(newStack);
  }, [bread, protein, sauces, toppings]);

  // Options Data
  const breadOptions = [
    { name: 'Burger Bun', price: 0.50, img: burgerBunImg },
    { name: 'Burger Bun Mini', price: 0.50, img: miniBunImg },
    { name: 'Burger Without Sesame', price: 0.50, img: noSesameImg },
    { name: 'Submarine', price: 0.50, img: submarineImg },
    
  ];

  const proteinOptions = [
    { name: "Beef Patty", price: 5.00, img: beefImg },
    { name: "Crispy Chicken", price: 4.50, img: chickenImg }
  ];

  const sauceOptions = [
    { name: "Pesto", price: 0.70, img: pestoImg },
    { name: "Ranch", price: 0.70, img: ranchImg },
    { name: "Garlic Mayo", price: 0.70, img: garlicMayoImg },
    { name: "Mayo Avocado", price: 0.70, img: avocadoImg },
    { name: "Cheddar", price: 0.70, img: cheddarImg },
    { name: "BBQ", price: 0.70, img: bbqImg },
    { name: "Cocktail", price: 0.70, img: cocktailImg }
  ];

  const toppingOptions = [
    { name: "Pickles", price: 0.70, img: picklesImg },
    { name: "Tomatoes", price: 0.60, img: tomatoImg },
   
    { name: "Iceberg", price: 0.60, img: icebergImg },
    { name: "Jalapeños", price: 0.80, img: jalapenoImg }
  ];

  const toggleSelection = (item, list, setList) => {
    if (list.find(i => i.name === item.name)) {
      setList(list.filter(i => i.name !== item.name));
    } else {
      setList([...list, item]);
    }
  };

  const finalPrice =
    protein.price + bread.price +
    sauces.reduce((a, b) => a + b.price, 0) +
    toppings.reduce((a, b) => a + b.price, 0);

  const handleAdd = () => {
    const extrasNames = [...sauces, ...toppings].map(item => item.name).join(", ");
    const customItem = {
      id: Date.now(), 
      name: "Custom Mix",
      description: `${protein.name} on ${bread.name} + [${extrasNames || 'No Extras'}]`,
      price: finalPrice,
      image: bread.img,
      quantity: 1,
      selectedExtras: [...sauces, ...toppings] 
    };
    addToCart(customItem); 
    navigate('/cart');
  };

  return (
    <div className="custom-burger-page">
      <div className="overlay"></div>
      <div className="custom-content">
        <h1 className="custom-title">CREATE YOUR MIX</h1>
        
        <div className="custom-main-container">
          
          {/* --- LEFT: SIDEBAR NAVIGATION --- */}
          <div className="sidebar-nav">
            <button className={`nav-btn ${activeTab === 'bread' ? 'active' : ''}`} onClick={() => setActiveTab('bread')}>
              🍞 CHOOSE BREAD
            </button>
            <button className={`nav-btn ${activeTab === 'protein' ? 'active' : ''}`} onClick={() => setActiveTab('protein')}>
              🥩 CHOOSE PROTEIN
            </button>
            <button className={`nav-btn ${activeTab === 'sauces' ? 'active' : ''}`} onClick={() => setActiveTab('sauces')}>
              🍯 CHOOSE SAUCES
            </button>
            <button className={`nav-btn ${activeTab === 'toppings' ? 'active' : ''}`} onClick={() => setActiveTab('toppings')}>
              🥗 CHOOSE TOPPINGS
            </button>
          </div>

          {/* --- CENTER: THE OPTIONS GLASS PANEL --- */}
          <div className="selection-area glass-panel-active">
            {/* If no tab is selected, show a welcome message */}
            {!activeTab ? (
              <div className="empty-selection-msg slide-in">
                <div className="msg-icon">🍔</div>
                <h3>Start Your Creation!</h3>
                <p>Select a category from the left to begin building your custom burger.</p>
              </div>
            ) : (
              <div className="tab-content slide-in">
                {activeTab === 'bread' && (
                  <>
                    <h3 className="section-header">Select Your Bread</h3>
                    <div className="item-grid">
                      {breadOptions.map((b, i) => (
                        <div key={i} className={`item-box ${bread.name === b.name ? 'active' : ''}`} onClick={() => setBread(b)}>
                          <img src={b.img} alt={b.name} />
                          <p>{b.name}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === 'protein' && (
                  <>
                    <h3 className="section-header">Pick Your Protein</h3>
                    <div className="item-grid">
                      {proteinOptions.map((p, i) => (
                        <div key={i} className={`item-box ${protein.name === p.name ? 'active' : ''}`} onClick={() => setProtein(p)}>
                          <img src={p.img} alt={p.name} />
                          <p>{p.name} (${p.price.toFixed(2)})</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === 'sauces' && (
                  <>
                    <h3 className="section-header">Add Tasty Sauces (+$0.7)</h3>
                    <div className="item-grid">
                      {sauceOptions.map((s, i) => (
                        <div key={i} className={`item-box ${sauces.find(sel => sel.name === s.name) ? 'active' : ''}`} onClick={() => toggleSelection(s, sauces, setSauces)}>
                          <img src={s.img} alt={s.name} />
                          <p>{s.name}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === 'toppings' && (
                  <>
                    <h3 className="section-header">Fresh Toppings</h3>
                    <div className="item-grid">
                      {toppingOptions.map((t, i) => (
                        <div key={i} className={`item-box ${toppings.find(sel => sel.name === t.name) ? 'active' : ''}`} onClick={() => toggleSelection(t, toppings, setToppings)}>
                          <img src={t.img} alt={t.name} />
                          <p>{t.name} (+${t.price.toFixed(1)})</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* --- RIGHT: LIVE BURGER PREVIEW --- */}
          <div className="summary-area">
            

           
          </div>

        </div>
      </div>
    </div>
  );
}

export default CustomBurger;