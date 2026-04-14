import React, { useState, useEffect } from "react";
import "../style/menu.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Menu({ addToCart, removeFromCart, setMenuItems, cartItems }) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [burgerType, setBurgerType] = useState("All");
  const [menuData, setMenuData] = useState([]);
  const [counter, setCounter] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemExtras, setItemExtras] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    axios.get("https://snack-attack-backend.onrender.com/menu")
      .then((res) => {
        const data = res.data.map((item) => ({
          ...item,
          price: Number(item.price),
        }));
        setMenuData(data);
        setMenuItems(data);
        if (data.length > 0) setActiveCategory(data[0].category);
      })
      .catch((err) => console.error(err));
  }, [setMenuItems]);

  // Update counter state based on cartItems
  useEffect(() => {
    const newCounter = {};
    if (cartItems && Array.isArray(cartItems)) {
      cartItems.forEach(item => {
        newCounter[item.name] = (newCounter[item.name] || 0) + item.quantity;
      });
    }
    setCounter(newCounter);
  }, [cartItems]);

  const categories = [...new Set(menuData.map((item) => item.category))];

  const filteredItems = menuData
    .filter((item) => item.category === activeCategory)
    .filter((item) =>
      activeCategory === "Burgers" && burgerType !== "All"
        ? item.type?.toLowerCase() === burgerType.toLowerCase()
        : true
    )
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  const handleUpdateCounter = (item, change) => {
    if (change > 0) {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
        selectedExtras: []
      });
      setIsCartOpen(true);
    } else {
      removeFromCart(item.name);
    }
  };

  const handleOpenModal = async (item) => {
    setSelectedItem(item);
    setSelectedExtras([]);
    try {
      const res = await axios.get(
        `https://snack-attack-backend.onrender.com/item-extras/${item.id}`
      );
      setItemExtras(res.data);
      setIsModalOpen(true);
    } catch (err) {
      setItemExtras([]);
      setIsModalOpen(true);
    }
  };

  const toggleExtra = (extra) => {
    if (selectedExtras.find((e) => e.id === extra.id)) {
      setSelectedExtras(selectedExtras.filter((e) => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  const handleAddToCartFromModal = () => {
    addToCart({
      id: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      image: selectedItem.image,
      quantity: 1,
      selectedExtras: selectedExtras
    });

    setIsModalOpen(false);
    setIsCartOpen(true);
  };

  const getItemBasePrice = (item) => {
    const extrasTotal = item.selectedExtras
      ? item.selectedExtras.reduce((sum, e) => sum + Number(e.price), 0)
      : 0;
    return Number(item.price) + extrasTotal;
  };

  const renderExtraRow = (extra) => (
    <label key={extra.id} className="extra-label">
      <div className="extra-info">
        <input
          type="checkbox"
          checked={selectedExtras.some(e => e.id === extra.id)}
          onChange={() => toggleExtra(extra)}
        />
        <span>{extra.name}</span>
      </div>
      <span className="extra-price">+${Number(extra.price).toFixed(2)}</span>
    </label>
  );

  return (
    <div className="menu-page">
      <div className="overlay"></div>
      <h1 className="menu-title">OUR MENU</h1>

      <input
        type="text"
        className="menu-search"
        placeholder="Search for your favorite meal..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="menu-content">
        <div className="menu-sidebar">
          <div className="menu-categories-vertical">
            {categories.map((c) => (
              <button
                key={c}
                className={activeCategory === c ? "active" : ""}
                onClick={() => {
                  setActiveCategory(c);
                  setBurgerType("All");
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {activeCategory === "Burgers" && (
            <div className="burger-type-buttons-vertical">
              {["All", "Beef", "Chicken"].map((type) => (
                <button
                  key={type}
                  className={burgerType === type ? "active" : ""}
                  onClick={() => setBurgerType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {isCartOpen && (
            <div className="mini-sidebar-cart">
              <div className="mini-cart-header">
                <h4>My Order</h4>
                <button onClick={() => setIsCartOpen(false)}>×</button>
              </div>

              <div className="mini-cart-body">
                {cartItems.map((item, index) => (
                  <div key={index} className="mini-cart-item-wrapper">
                    <div className="mini-cart-item">
                      <div className="item-details">
                        <span className="item-name">{item.name}</span>
                        <span className="item-qty"> x{item.quantity}</span>
                      </div>
                      <span className="item-price">
                        ${(getItemBasePrice(item) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mini-cart-total-row">
                <span>Total:</span>
                <span>
                  $
                  {cartItems
                    .reduce(
                      (acc, item) =>
                        acc + getItemBasePrice(item) * item.quantity, 0
                    )
                    .toFixed(2)}
                </span>
              </div>

              <button
                className="mini-checkout-btn"
                onClick={() => navigate("/cart")}
              >
                View Cart
              </button>
            </div>
          )}
        </div>

        <div className="menu-list-wrapper">
          <div className="menu-list">
            {filteredItems.map((item, i) => (
              <div
                className="menu-card"
                key={i}
                onClick={() => handleOpenModal(item)}
              >
                <div className="menu-img">
                  <img
                    src={`https://snack-attack-backend.onrender.com/images/${item.image}`}
                    alt={item.name}
                  />
                </div>

                <div className="menu-info">
                  <div className="title-row">
                    <h3>{item.name}</h3>

                    {/* ✅ FIXED: Dynamic Counter Controls */}
                    <div
                      className="counter-controls"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className={`qty-btn minus ${counter[item.name] > 0 ? "show" : "hidden"}`}
                        onClick={() => handleUpdateCounter(item, -1)}
                      >
                        −
                      </button>

                      <button
                        className={`dynamic-add-btn ${counter[item.name] > 0 ? "has-items" : ""}`}
                        onClick={() => handleUpdateCounter(item, 1)}
                      >
                        {counter[item.name] > 0 ? counter[item.name] : "+"}
                      </button>
                    </div>
                  </div>

                  <p className="price">${item.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && selectedItem && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setIsModalOpen(false)}
            >
              ×
            </button>

            <div className="modal-header">
              <img
                src={`https://snack-attack-backend.onrender.com/images/${selectedItem.image}`}
                alt={selectedItem.name}
              />
              <h2>{selectedItem.name}</h2>
              <p>{selectedItem.description}</p>
            </div>

            <div className="modal-scroll-area">
              {itemExtras.length > 0 && (
                <div className="extras-section">
                  <h3>Customize Your Order</h3>
                  <div className="extra-group">
                    <div className="extra-group-title">Add Extras</div>
                    {itemExtras.map((extra) => renderExtraRow(extra))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="add-btn-final"
                onClick={handleAddToCartFromModal}
              >
                Add to Cart — $
                {(
                  selectedItem.price +
                  selectedExtras.reduce(
                    (sum, e) => sum + Number(e.price),
                    0
                  )
                ).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Menu;