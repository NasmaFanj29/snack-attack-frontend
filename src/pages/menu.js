import React, { useState, useEffect } from "react";
import "../style/menu.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ✅ REMOVE EXTRAS MAPPING BY CATEGORY
const REMOVE_EXTRAS_BY_CATEGORY = {
  "Burgers": [1, 2, 3, 4, 5, 8, 9, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 31, 32, 35, 36, 37],
  "Salad": [1, 7, 10, 11, 12, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37],
  "Sandwiches": [1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 35, 36, 37]
};

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

  // ✅ NEW STATE: Notes popup
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [notesItem, setNotesItem] = useState(null);

  // ✅ NEW STATE: Remove extras popup
  const [removeExtrasModalOpen, setRemoveExtrasModalOpen] = useState(false);
  const [removeExtrasItem, setRemoveExtrasItem] = useState(null);
  const [allAvailableExtras, setAllAvailableExtras] = useState([]);
  const [removableExtras, setRemovableExtras] = useState([]);
  const [selectedRemoveExtras, setSelectedRemoveExtras] = useState([]);

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

  // ✅ NEW: Open notes modal
  const handleOpenNotesModal = (item) => {
    setNotesItem(item);
    setNotesText("");
    setNotesModalOpen(true);
  };

  const handleSaveNote = () => {
    if (notesText.trim()) {
      // Add the item with a note
      addToCart({
        id: notesItem.id,
        name: notesItem.name,
        price: notesItem.price,
        image: notesItem.image,
        quantity: 1,
        selectedExtras: [],
        specialNote: notesText // ✅ Store the note
      });
      setNotesModalOpen(false);
      setIsCartOpen(true);
    }
  };

  // ✅ NEW: Open remove extras modal
  const handleOpenRemoveExtrasModal = async (item) => {
    setRemoveExtrasItem(item);
    setSelectedRemoveExtras([]);

    // Fetch all available extras for this item's category
    const removableIds = REMOVE_EXTRAS_BY_CATEGORY[item.category] || [];

    try {
      const res = await axios.get(
        `https://snack-attack-backend.onrender.com/item-extras/${item.id}`
      );
      const allExtras = res.data || [];
      
      // Filter to only show extras that can be removed from this category
      const filterableExtras = allExtras.filter(extra => 
        removableIds.includes(extra.id)
      );

      setAllAvailableExtras(allExtras);
      setRemovableExtras(filterableExtras);
      setRemoveExtrasModalOpen(true);
    } catch (err) {
      console.error("Error fetching extras:", err);
      setRemoveExtrasModalOpen(false);
    }
  };

  const handleSaveRemoveExtras = () => {
    if (selectedRemoveExtras.length > 0) {
      addToCart({
        id: removeExtrasItem.id,
        name: removeExtrasItem.name,
        price: removeExtrasItem.price,
        image: removeExtrasItem.image,
        quantity: 1,
        selectedExtras: [],
        removedExtras: selectedRemoveExtras // ✅ Store removed extras
      });
      setRemoveExtrasModalOpen(false);
      setIsCartOpen(true);
    } else {
      alert("Select at least one extra to remove");
    }
  };

  const toggleExtra = (extra) => {
    if (selectedExtras.find((e) => e.id === extra.id)) {
      setSelectedExtras(selectedExtras.filter((e) => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  const toggleRemoveExtra = (extra) => {
    if (selectedRemoveExtras.find((e) => e.id === extra.id)) {
      setSelectedRemoveExtras(selectedRemoveExtras.filter((e) => e.id !== extra.id));
    } else {
      setSelectedRemoveExtras([...selectedRemoveExtras, extra]);
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

  // ✅ NEW: Render remove extras checkboxes
 const renderRemoveExtraRow = (extra) => (
  <label key={extra.id} className="extra-label">
    <div className="extra-info">
      <input
        type="checkbox"
        checked={selectedRemoveExtras.some(e => e.id === extra.id)}
        onChange={() => toggleRemoveExtra(extra)}
      />
      <span>{extra.name}</span>
    </div>
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
                        {item.specialNote && (
                          <span className="item-note" style={{ fontSize: '0.7rem', color: '#FFC20E', display: 'block', marginTop: '2px' }}>
                            📝 {item.specialNote}
                          </span>
                        )}
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
              >
                <div className="menu-img">
                  <img
                    src={`https://snack-attack-backend.onrender.com/images/${item.image}`}
                    alt={item.name}
                    onClick={() => handleOpenModal(item)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                <div className="menu-info">
                  <div className="title-row">
                    <h3>{item.name}</h3>

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

      {/* ✅ NOTES MODAL */}
      {notesModalOpen && notesItem && (
        <div className="modal-overlay" onClick={() => setNotesModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
           <button
              className="close-modal"
              onClick={() => {
                setNotesModalOpen(false);
                setSelectedItem(notesItem);
                setIsModalOpen(true);
              }}
            >
              ×
            </button>

            <div className="modal-header">
              <h2> Special Instructions</h2>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Add any special requests for {notesItem.name}
              </p>
            </div>

            <div className="modal-scroll-area">
              <textarea
                className="notes-textarea"
                placeholder="e.g., Cut in half, No onions, Extra sauce, Allergies..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows="6"
              />
            </div>

            <div className="modal-footer">
              <button
                className="add-btn-final"
                onClick={handleSaveNote}
                disabled={!notesText.trim()}
              >
                Add to Cart with Note 📝
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ REMOVE EXTRAS MODAL */}
      
      {removeExtrasModalOpen && removeExtrasItem && (
        <div className="modal-overlay" onClick={() => setRemoveExtrasModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
                className="close-modal"
                onClick={() => {
                  setRemoveExtrasModalOpen(false); setSelectedItem(removeExtrasItem); setIsModalOpen(true); }} > × </button>

            <div className="modal-header">
              <h2> Remove Ingredients</h2>
              <p className="remove-modal-subtitle">
                Select ingredients to remove from {removeExtrasItem.name}
              </p>
            </div>

            <div className="modal-scroll-area">
              {removableExtras.length > 0 ? (
                <div className="extras-section">
                  <div className="extra-group">
                    {removableExtras.map((extra) => renderRemoveExtraRow(extra))}
                  </div>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  No removable ingredients available
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="add-btn-final"
                onClick={handleSaveRemoveExtras}
                disabled={selectedRemoveExtras.length === 0}
                style={{
                  backgroundColor: selectedRemoveExtras.length > 0 ? '#d90d0d' : '#ccc'
                }}
              >
                Remove Selected Items ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORIGINAL CUSTOMIZE MODAL */}
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
            <div className="modal-actions">
                  <button
                className="menu-action-btn notes-btn"
                style={
                  ["Beverages", "Appetizers", "Dips"].includes(selectedItem.category)
                    ? { flex: "0 0 auto", width: "auto",  padding: "14px 18px", fontSize: "14px" }
                    : {}
                } 
                onClick={() => {
                  setIsModalOpen(false);
                  handleOpenNotesModal(selectedItem);
                }} 
              >
                📝 Add Note
              </button>

                  {/* 🔥 HAWDA HENNE */}
              {!["Beverages", "Appetizers", "Dips"].includes(selectedItem.category) && (
                <button
                  className="menu-action-btn remove-btn"
                  onClick={() => {
                    setIsModalOpen(false);
                    handleOpenRemoveExtrasModal(selectedItem);
                  }}
                >
                  ✕ Remove Ingredients
                </button>
              )}

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
