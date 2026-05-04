import React, { useState, useEffect, useRef } from "react";
import "../style/menu.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const REMOVE_EXTRAS_BY_CATEGORY = {
  "Burgers": [1, 2, 3, 4, 5, 8, 9, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 31, 32, 35, 36, 37],
  "Salad": [1, 7, 10, 11, 12, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37],
  "Sandwiches": [1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 35, 36, 37]
};

function Menu({ addToCart, removeFromCart, setMenuItems, cartItems }) {
  const navigate = useNavigate();

  // ── Menu data ──
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [burgerType, setBurgerType] = useState("All");
  const [menuData, setMenuData] = useState([]);
  const [counter, setCounter] = useState({});

  // ── Main customize modal ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemExtras, setItemExtras] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);

  // ── Pending state (saved into the item on final Add to Cart) ──
  const [pendingNote, setPendingNote] = useState("");
  const [pendingRemovedExtras, setPendingRemovedExtras] = useState([]);

  // ── Notes sub-modal ──
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [notesItem, setNotesItem] = useState(null);

  // ── Remove extras sub-modal ──
  const [removeExtrasModalOpen, setRemoveExtrasModalOpen] = useState(false);
  const [removeExtrasItem, setRemoveExtrasItem] = useState(null);
  const [removableExtras, setRemovableExtras] = useState([]);
  const [selectedRemoveExtras, setSelectedRemoveExtras] = useState([]);

  // ── Cart popup ──
  const [cartPopupOpen, setCartPopupOpen] = useState(false);
  const cartPopupRef = useRef(null);

  // ── Close cart popup on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (cartPopupRef.current && !cartPopupRef.current.contains(e.target))
        setCartPopupOpen(false);
    };
    if (cartPopupOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cartPopupOpen]);

  // ── Fetch menu ──
  useEffect(() => {
    axios.get("https://snack-attack-backend.onrender.com/menu")
      .then((res) => {
        const data = res.data.map((item) => ({ ...item, price: Number(item.price) }));
        setMenuData(data);
        setMenuItems(data);
        if (data.length > 0) setActiveCategory(data[0].category);
      })
      .catch(console.error);
  }, [setMenuItems]);

  // ── Sync counter with cart ──
  useEffect(() => {
    const newCounter = {};
    if (Array.isArray(cartItems)) {
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

  // ── Open main customize modal ──
  const handleOpenModal = async (item) => {
    setSelectedItem(item);
    setSelectedExtras([]);
    setPendingNote("");
    setPendingRemovedExtras([]);
    try {
      const res = await axios.get(
        `https://snack-attack-backend.onrender.com/item-extras/${item.id}`
      );
      setItemExtras(res.data);
    } catch {
      setItemExtras([]);
    }
    setIsModalOpen(true);
  };

  // ── Final Add to Cart from main modal ──
  // Combines selectedExtras + pendingRemovedExtras + pendingNote into ONE item
  const handleAddToCartFromModal = () => {
    addToCart({
      id:             selectedItem.id,
      databaseId:     selectedItem.id,
      name:           selectedItem.name,
      price:          selectedItem.price,
      image:          selectedItem.image,
      quantity:       1,
      selectedExtras: selectedExtras,
      removedExtras:  pendingRemovedExtras,
      specialNote:    pendingNote || null,
    });
    setIsModalOpen(false);
    setPendingNote("");
    setPendingRemovedExtras([]);
  };

  // ── Open notes sub-modal ──
  const handleOpenNotesModal = (item) => {
    setNotesItem(item);
    setNotesText(pendingNote); // pre-fill if already set
    setNotesModalOpen(true);
  };

  // ── Save note → back to main modal (does NOT add to cart yet) ──
  const handleSaveNote = () => {
    if (notesText.trim()) {
      setPendingNote(notesText.trim());
      setNotesModalOpen(false);
      setIsModalOpen(true);
    }
  };

  // ── Open remove extras sub-modal ──
  const handleOpenRemoveExtrasModal = async (item) => {
    setRemoveExtrasItem(item);
    setSelectedRemoveExtras(pendingRemovedExtras); // pre-fill if already set
    const removableIds = REMOVE_EXTRAS_BY_CATEGORY[item.category] || [];
    try {
      const res = await axios.get(
        `https://snack-attack-backend.onrender.com/item-extras/${item.id}`
      );
      const allExtras = res.data || [];
      setRemovableExtras(allExtras.filter(e => removableIds.includes(e.id)));
    } catch {
      setRemovableExtras([]);
    }
    setRemoveExtrasModalOpen(true);
  };

  // ── Save removed extras → back to main modal (does NOT add to cart yet) ──
  const handleSaveRemoveExtras = () => {
    if (selectedRemoveExtras.length > 0) {
      setPendingRemovedExtras(selectedRemoveExtras);
      setRemoveExtrasModalOpen(false);
      setIsModalOpen(true);
    } else {
      alert("Select at least one ingredient to remove");
    }
  };

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const toggleRemoveExtra = (extra) => {
    setSelectedRemoveExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const handleUpdateCounter = (item, change) => {
    if (change < 0) removeFromCart(item.name);
  };

  // ── Cart popup price helpers ──
  const getItemBasePrice = (item) => {
    const extrasTotal = Array.isArray(item.selectedExtras)
      ? item.selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0)
      : 0;
    return Number(item.price) + extrasTotal;
  };
  const totalCartQty   = cartItems.reduce((a, i) => a + i.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, item) => acc + getItemBasePrice(item) * item.quantity, 0);

  // ── Modal price display ──
  const modalPrice = selectedItem
    ? selectedItem.price + selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0)
    : 0;

  return (
    <div className="menu-page">
      <div className="overlay" />
      <h1 className="menu-title">OUR MENU</h1>

      {/* ── Floating cart button ── */}
      {cartItems.length > 0 && (
        <div className="navbar-cart-wrap" ref={cartPopupRef}>
          <button
            className={`navbar-cart-btn ${cartPopupOpen ? "active" : ""}`}
            onClick={() => setCartPopupOpen(o => !o)}
          >
            <span className="nbc-icon">🛒</span>
            <span className="nbc-label">View Cart</span>
            <span className="nbc-badge">{totalCartQty}</span>
          </button>

          {cartPopupOpen && (
            <div className="cart-popup">
              <div className="cart-popup-header">
                <span>My Order</span>
                <span className="cart-popup-total">${totalCartPrice.toFixed(2)}</span>
              </div>
              <div className="cart-popup-body">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="cart-popup-item">
                    <div className="cpi-left">
                      <span className="cpi-name">{item.name}</span>
                      {item.selectedExtras?.length > 0 && (
                        <span className="cpi-extras">+ {item.selectedExtras.map(e => e.name).join(", ")}</span>
                      )}
                      {item.removedExtras?.length > 0 && (
                        <span className="cpi-removed">✕ No {item.removedExtras.map(e => e.name).join(", ")}</span>
                      )}
                      {item.specialNote && (
                        <span className="cpi-note">📝 {item.specialNote}</span>
                      )}
                    </div>
                    <div className="cpi-right">
                      <span className="cpi-qty">×{item.quantity}</span>
                      <span className="cpi-price">${(getItemBasePrice(item) * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-popup-footer">
                <div className="cart-popup-subtotal">
                  <span>Total</span>
                  <span>${totalCartPrice.toFixed(2)}</span>
                </div>
                <button
                  className="cart-popup-checkout"
                  onClick={() => { setCartPopupOpen(false); navigate("/cart"); }}
                >
                  Proceed to Checkout →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search ── */}
      <input
        type="text"
        className="menu-search"
        placeholder="Search for your favorite meal..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ── Layout ── */}
      <div className="menu-content">
        <div className="menu-sidebar">
          <div className="menu-categories-vertical">
            {categories.map((c) => (
              <button
                key={c}
                className={activeCategory === c ? "active" : ""}
                onClick={() => { setActiveCategory(c); setBurgerType("All"); }}
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
        </div>

        <div className="menu-list-wrapper">
          <div className="menu-list">
            {filteredItems.map((item, i) => (
              <div className="menu-card" key={i}>
                <div className="menu-img">
                  <img
                    src={`https://snack-attack-backend.onrender.com/images/${item.image}`}
                    alt={item.name}
                    onClick={() => handleOpenModal(item)}
                    style={{ cursor: "pointer" }}
                  />
                </div>
                <div className="menu-info">
                  <div className="title-row">
                    <h3>{item.name}</h3>
                    <div className="counter-controls" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`qty-btn minus ${counter[item.name] > 0 ? "show" : "hidden"}`}
                        onClick={() => handleUpdateCounter(item, -1)}
                      >−</button>
                      <button
                        className={`dynamic-add-btn ${counter[item.name] > 0 ? "has-items" : ""}`}
                        onClick={() => handleOpenModal(item)}
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

      {/* ══════════════════════════════════════════
          MAIN CUSTOMIZE MODAL
      ══════════════════════════════════════════ */}
      {isModalOpen && selectedItem && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setIsModalOpen(false)}>×</button>

            {/* Image + name + description */}
            <div className="modal-header">
              <img
                src={`https://snack-attack-backend.onrender.com/images/${selectedItem.image}`}
                alt={selectedItem.name}
              />
              <h2>{selectedItem.name}</h2>
              <p>{selectedItem.description}</p>
            </div>

            {/* Note / Remove buttons */}
            <div className="modal-actions">
              <button
                className="menu-action-btn notes-btn"
                style={
                  ["Beverages", "Appetizers", "Dips"].includes(selectedItem.category)
                    ? { flex: "0 0 auto", width: "auto", padding: "14px 18px" }
                    : {}
                }
                onClick={() => {
                  setIsModalOpen(false);
                  handleOpenNotesModal(selectedItem);
                }}
              >
                📝 {pendingNote ? "Edit Note" : "Add Note"}
              </button>

              {!["Beverages", "Appetizers", "Dips"].includes(selectedItem.category) && (
                <button
                  className="menu-action-btn remove-btn"
                  onClick={() => {
                    setIsModalOpen(false);
                    handleOpenRemoveExtrasModal(selectedItem);
                  }}
                >
                  ✕ {pendingRemovedExtras.length > 0 ? "Edit Remove" : "Remove Ingredients"}
                </button>
              )}
            </div>

            {/* ── Pending selections preview ── */}
            {(pendingRemovedExtras.length > 0 || pendingNote) && (
              <div style={{ padding: "0 20px 12px" }}>
                {pendingRemovedExtras.length > 0 && (
                  <div style={{
                    padding: "8px 12px", borderRadius: "8px", marginBottom: "6px",
                    background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)",
                    fontSize: "12px", color: "rgba(255,90,90,0.9)"
                  }}>
                    ✕ No {pendingRemovedExtras.map(e => e.name).join(", ")}
                  </div>
                )}
                {pendingNote && (
                  <div style={{
                    padding: "8px 12px", borderRadius: "8px",
                    background: "rgba(255,194,14,0.08)", border: "1px solid rgba(255,194,14,0.2)",
                    fontSize: "12px", color: "rgba(255,194,14,0.95)"
                  }}>
                    📝 {pendingNote}
                  </div>
                )}
              </div>
            )}

            {/* Add-on extras */}
            <div className="modal-scroll-area">
              {itemExtras.length > 0 && (
                <div className="extras-section">
                  <h3>Customize Your Order</h3>
                  <div className="extra-group">
                    <div className="extra-group-title">Add Extras</div>
                    {itemExtras.map((extra) => (
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
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Final Add to Cart button ── */}
            <div className="modal-footer">
              <button className="add-btn-final" onClick={handleAddToCartFromModal}>
                Add to Cart — ${modalPrice.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          NOTES SUB-MODAL
      ══════════════════════════════════════════ */}
      {notesModalOpen && notesItem && (
        <div className="modal-overlay" onClick={() => { setNotesModalOpen(false); setIsModalOpen(true); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* X → back to customize modal without saving */}
            <button
              className="close-modal"
              onClick={() => { setNotesModalOpen(false); setIsModalOpen(true); }}
            >×</button>

            <div className="modal-header">
              <h2>Special Instructions</h2>
              <p style={{ color: "#666", fontSize: "14px" }}>
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

            <div className="modal-footer" style={{ display: "flex", gap: "8px" }}>
              {/* Back without saving */}
              <button
                className="add-btn-final"
                style={{
                  background: "var(--surface-3)", color: "var(--text-muted)",
                  flex: "0 0 auto", width: "auto", padding: "16px 20px"
                }}
                onClick={() => { setNotesModalOpen(false); setIsModalOpen(true); }}
              >
                ← Back
              </button>
              {/* Save note → back to modal, NOT added to cart yet */}
              <button
                className="add-btn-final"
                onClick={handleSaveNote}
                disabled={!notesText.trim()}
              >
                Save Note ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          REMOVE EXTRAS SUB-MODAL
      ══════════════════════════════════════════ */}
      {removeExtrasModalOpen && removeExtrasItem && (
        <div className="modal-overlay" onClick={() => { setRemoveExtrasModalOpen(false); setIsModalOpen(true); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* X → back to customize modal without saving */}
            <button
              className="close-modal"
              onClick={() => { setRemoveExtrasModalOpen(false); setIsModalOpen(true); }}
            >×</button>

            <div className="modal-header">
              <h2>Remove Ingredients</h2>
              <p className="remove-modal-subtitle">
                Select ingredients to remove from {removeExtrasItem.name}
              </p>
            </div>

            <div className="modal-scroll-area">
              {removableExtras.length > 0 ? (
                <div className="extras-section">
                  <div className="extra-group">
                    {removableExtras.map((extra) => (
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
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>
                  No removable ingredients available
                </p>
              )}
            </div>

            <div className="modal-footer" style={{ display: "flex", gap: "8px" }}>
              {/* Back without saving */}
              <button
                className="add-btn-final"
                style={{
                  background: "var(--surface-3)", color: "var(--text-muted)",
                  flex: "0 0 auto", width: "auto", padding: "16px 20px"
                }}
                onClick={() => { setRemoveExtrasModalOpen(false); setIsModalOpen(true); }}
              >
                ← Back
              </button>
              {/* Save removed → back to modal, NOT added to cart yet */}
              <button
                className="add-btn-final"
                onClick={handleSaveRemoveExtras}
                disabled={selectedRemoveExtras.length === 0}
                style={{
                  backgroundColor: selectedRemoveExtras.length > 0 ? "#d90d0d" : "var(--surface-3)",
                  color: selectedRemoveExtras.length > 0 ? "#fff" : "var(--text-muted)"
                }}
              >
                Confirm Remove ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Menu;