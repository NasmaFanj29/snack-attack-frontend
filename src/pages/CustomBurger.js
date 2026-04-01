import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/customBurger.css';

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
  const [bread, setBread] = useState({ name: 'Burger Bun', price: 0.50 });
  const [protein, setProtein] = useState({ name: 'Beef Patty', price: 5.00 });
  const [sauces, setSauces] = useState([]);
  const [toppings, setToppings] = useState([]);

  const breadOptions = {
    buns: [
      { name: 'Burger Bun', price: 0.50, img: burgerBunImg },
      { name: 'Burger Bun Mini', price: 0.50, img: miniBunImg },
      { name: 'Burger Without Sesame', price: 0.50, img: noSesameImg }
    ],
    baguette: [
      { name: 'Submarine', price: 0.50, img: submarineImg },
      { name: 'Fajita Sandwich', price: 0.50, img: fajitaImg }
    ]
  };

  const proteinOptions = [
    { name: "Beef Patty", price: 5.00, img: beefImg },
    { name: "Crispy Chicken", price: 4.50, img: chickenImg }
  ];

  const sauceOptions = [
    { name: "Pesto Sauce", price: 0.70, img: pestoImg },
    { name: "Ranch Sauce", price: 0.70, img: ranchImg },
    { name: "Garlic Mayo Sauce", price: 0.70, img: garlicMayoImg },
    { name: "Mayo Avocado Sauce", price: 0.70, img: avocadoImg },
    { name: "Cheddar Sauce", price: 0.70, img: cheddarImg },
    { name: "BBQ Sauce", price: 0.70, img: bbqImg },
    { name: "Cocktail Sauce", price: 0.70, img: cocktailImg }
  ];

  const toppingOptions = [
    { name: "Pickles", price: 0.70, img: picklesImg },
    { name: "Tomatoes", price: 0.60, img: tomatoImg },
    { name: "Cucumber", price: 0.60, img: cucumberImg },
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
    protein.price +
    bread.price +
    sauces.reduce((a, b) => a + b.price, 0) +
    toppings.reduce((a, b) => a + b.price, 0);

  const handleAdd = () => {
    const desc = `Custom: ${protein.name} (${sauces.map(s => s.name).join(', ')})`;
    addToCart(desc, finalPrice, null, 1);
    navigate('/cart');
  };

  return (
    <div className="custom-burger-page">
      <div className="overlay"></div>
      <div className="custom-content">
        <h1 className="custom-title">CREATE YOUR MIX</h1>
        <div className="custom-grid">
          <div className="selection-area">
            <div className="custom-card">
              <h3 className="section-header">🍞 1. Bread (+$0.5)</h3>
              <div className="item-grid">
                {[...breadOptions.buns, ...breadOptions.baguette].map((b, i) => (
                  <div
                    key={i}
                    className={`item-box ${bread.name === b.name ? 'active' : ''}`}
                    onClick={() => setBread(b)}
                  >
                    <img src={b.img} alt={b.name} />
                    <p>{b.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="custom-card">
              <h3 className="section-header">🥩 2. Protein</h3>
              <div className="item-grid">
                {proteinOptions.map((p, i) => (
                  <div
                    key={i}
                    className={`item-box ${protein.name === p.name ? 'active' : ''}`}
                    onClick={() => setProtein(p)}
                  >
                    <img src={p.img} alt={p.name} />
                    <p>{p.name} (${p.price.toFixed(2)})</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="custom-card">
              <h3 className="section-header">🍯 3. Sauces (+$0.7)</h3>
              <div className="item-grid">
                {sauceOptions.map((s, i) => (
                  <div
                    key={i}
                    className={`item-box ${
                      sauces.find(sel => sel.name === s.name) ? 'active' : ''
                    }`}
                    onClick={() => toggleSelection(s, sauces, setSauces)}
                  >
                    <img src={s.img} alt={s.name} />
                    <p>{s.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="custom-card">
              <h3 className="section-header">🥗 4. Toppings</h3>
              <div className="item-grid">
                {toppingOptions.map((t, i) => (
                  <div
                    key={i}
                    className={`item-box ${
                      toppings.find(sel => sel.name === t.name) ? 'active' : ''
                    }`}
                    onClick={() => toggleSelection(t, toppings, setToppings)}
                  >
                    <img src={t.img} alt={t.name} />
                    <p>{t.name} (+${t.price.toFixed(1)})</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="summary-area">
            <div className="summary-box">
              <h3>YOUR CART SUMMARY</h3>
              <div className="summary-line">
                Selection: <span>{protein.name} on {bread.name}</span>
              </div>
              <div className="summary-line">
                Extras: <span>{sauces.length + toppings.length} items</span>
              </div>
              <hr />
              <div className="price-display">
                Total: ${finalPrice.toFixed(2)}
              </div>
              <button className="add-btn" onClick={handleAdd}>
                ADD TO CART
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomBurger;
