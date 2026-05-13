import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../style/menu.css";

const BACKEND = "https://snack-attack-backend.onrender.com";

const REMOVE_EXTRAS_BY_CATEGORY = {
  "Burgers": [1,2,3,4,5,8,9,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,31,32,35,36,37],
  "Salad": [1,7,10,11,12,25,26,27,28,29,30,31,32,33,34,35,37],
  "Sandwiches": [1,2,3,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,31,32,35,36,37],
};

/* ── Category icons ── */
const CATEGORY_ICONS = {
  "Burgers":     "🍔",
  "Sandwiches":  "🥖",
  "Salad":       "🥗",
  "Beverages":   "🥤",
  "Appetizers":  "🍟",
  "Dips":        "🫙",
  "Desserts":    "🍦",
};

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div className="menu-card menu-card--skeleton">
      <div className="mc-img-wrap mc-img-skeleton" />
      <div className="mc-body">
        <div className="mc-skeleton-line mc-skeleton-line--long" />
        <div className="mc-skeleton-line mc-skeleton-line--short" />
        <div className="mc-skeleton-footer">
          <div className="mc-skeleton-price" />
          <div className="mc-skeleton-btn" />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ITEM MODAL
   ================================================================ */
function ItemModal({ item, onClose, onAddToCart }) {
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [pendingNote, setPendingNote]       = useState("");
  const [pendingRemoved, setPendingRemoved] = useState([]);
  const [itemExtras, setItemExtras]         = useState([]);
  const [removableExtras, setRemovableExtras] = useState([]);
  const [subView, setSubView]               = useState("main"); // main | note | remove
  const [imgLoaded, setImgLoaded]           = useState(false);

  useEffect(() => {
    if (!item) return;
    axios.get(`${BACKEND}/item-extras/${item.id}`)
      .then(res => {
        const all = res.data || [];
        setItemExtras(all);
        const ids = REMOVE_EXTRAS_BY_CATEGORY[item.category] || [];
        setRemovableExtras(all.filter(e => ids.includes(e.id)));
      })
      .catch(() => { setItemExtras([]); setRemovableExtras([]); });
  }, [item]);

  if (!item) return null;

  const modalPrice = Number(item.price || 0) +
    selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0);

  const toggleExtra  = (extra) => setSelectedExtras(prev =>
    prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]);
  const toggleRemove = (extra) => setPendingRemoved(prev =>
    prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]);

  const handleAdd = () => {
    onAddToCart({
      id: item.id, databaseId: item.id,
      name: item.name, price: item.price, image: item.image,
      quantity: 1,
      selectedExtras,
      removedExtras: pendingRemoved,
      specialNote: pendingNote || null,
    });
    onClose();
  };

  /* ── Note sub-view ── */
  if (subView === "note") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setSubView("main")}>×</button>
        <div className="modal-subheader">
          <p className="modal-subtitle">Special instructions</p>
          <h2 className="modal-subitem">{item.name}</h2>
        </div>
        <div className="modal-scroll">
          <textarea
            className="modal-textarea"
            placeholder="e.g. No onions, extra sauce, cut in half…"
            value={pendingNote}
            onChange={e => setPendingNote(e.target.value)}
            rows={5}
            autoFocus
          />
        </div>
        <div className="modal-footer modal-footer--row">
          <button className="modal-btn modal-btn--ghost" onClick={() => setSubView("main")}>← Back</button>
          <button
            className="modal-btn modal-btn--primary"
            onClick={() => setSubView("main")}
            disabled={!pendingNote.trim()}
          >
            Save Note ✓
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Remove sub-view ── */
  if (subView === "remove") return (
    <div className="modal-overlay" onClick={() => setSubView("main")}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setSubView("main")}>×</button>
        <div className="modal-subheader">
          <p className="modal-subtitle">Remove ingredients</p>
          <h2 className="modal-subitem">{item.name}</h2>
        </div>
        <div className="modal-scroll">
          {removableExtras.length > 0 ? (
            <div className="extras-list">
              {removableExtras.map(extra => (
                <label key={extra.id} className="extra-row extra-row--remove">
                  <div className="extra-row-left">
                    <div className={`extra-checkbox extra-checkbox--remove ${pendingRemoved.some(e => e.id === extra.id) ? "checked" : ""}`}>
                      {pendingRemoved.some(e => e.id === extra.id) && <span>✕</span>}
                    </div>
                    <span className="extra-name">{extra.name}</span>
                  </div>
                  <input
                    type="checkbox" hidden
                    checked={pendingRemoved.some(e => e.id === extra.id)}
                    onChange={() => toggleRemove(extra)}
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="modal-empty">No removable ingredients for this item.</p>
          )}
        </div>
        <div className="modal-footer modal-footer--row">
          <button className="modal-btn modal-btn--ghost" onClick={() => setSubView("main")}>← Back</button>
          <button
            className="modal-btn modal-btn--danger"
            onClick={() => setSubView("main")}
            disabled={pendingRemoved.length === 0}
          >
            Confirm ✕
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Main view ── */
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {/* Hero image */}
        <div className="modal-img-wrap">
          {!imgLoaded && <div className="modal-img-skeleton" />}
          <img
            src={`${BACKEND}/images/${item.image}`}
            alt={item.name}
            className={`modal-img ${imgLoaded ? "modal-img--loaded" : ""}`}
            onLoad={() => setImgLoaded(true)}
          />
          <div className="modal-img-overlay" />
          <div className="modal-img-title">
            <h2>{item.name}</h2>
            <span className="modal-img-price">${Number(item.price).toFixed(2)}</span>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="modal-desc">{item.description}</p>
        )}

        {/* Action chips */}
        <div className="modal-chips">
          <button
            className={`modal-chip ${pendingNote ? "modal-chip--active" : ""}`}
            onClick={() => setSubView("note")}
          >
            <span className="chip-icon">📝</span>
            {pendingNote ? "Edit note" : "Add note"}
          </button>

          {!["Beverages", "Appetizers", "Dips"].includes(item.category) && (
            <button
              className={`modal-chip modal-chip--red ${pendingRemoved.length > 0 ? "modal-chip--active-red" : ""}`}
              onClick={() => setSubView("remove")}
            >
              <span className="chip-icon">✕</span>
              {pendingRemoved.length > 0 ? `Remove (${pendingRemoved.length})` : "Remove ingredients"}
            </button>
          )}
        </div>

        {/* Active selections preview */}
        {(pendingRemoved.length > 0 || pendingNote) && (
          <div className="modal-selections">
            {pendingRemoved.length > 0 && (
              <div className="selection-tag selection-tag--red">
                ✕ No {pendingRemoved.map(e => e.name).join(", ")}
              </div>
            )}
            {pendingNote && (
              <div className="selection-tag selection-tag--gold">
                📝 {pendingNote}
              </div>
            )}
          </div>
        )}

        {/* Add-on extras */}
        <div className="modal-scroll">
          {itemExtras.length > 0 && (
            <div className="extras-section">
              <p className="extras-label">Add extras</p>
              <div className="extras-list">
                {itemExtras.map(extra => (
                  <label key={extra.id} className="extra-row">
                    <div className="extra-row-left">
                      <div className={`extra-checkbox ${selectedExtras.some(e => e.id === extra.id) ? "checked" : ""}`}>
                        {selectedExtras.some(e => e.id === extra.id) && <span>✓</span>}
                      </div>
                      <span className="extra-name">{extra.name}</span>
                    </div>
                    <span className="extra-price">+${Number(extra.price).toFixed(2)}</span>
                    <input
                      type="checkbox" hidden
                      checked={selectedExtras.some(e => e.id === extra.id)}
                      onChange={() => toggleExtra(extra)}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="modal-footer">
          <button className="modal-cta" onClick={handleAdd}>
            <span>Add to order</span>
            <span className="modal-cta-price">${modalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MENU COMPONENT
   ================================================================ */
function Menu({ addToCart, removeFromCart, setMenuItems, cartItems }) {
  const navigate = useNavigate();

  const [menuData, setMenuData]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [activeCategory, setActiveCategory]   = useState("");
  const [search, setSearch]                   = useState("");
  const [burgerType, setBurgerType]           = useState("All");
  const [counter, setCounter]                 = useState({});
  const [modalItem, setModalItem]             = useState(null);
  const [cartPopupOpen, setCartPopupOpen]     = useState(false);
  const cartPopupRef                          = useRef(null);

  /* Fetch menu */
  useEffect(() => {
    axios.get(`${BACKEND}/menu`)
      .then(res => {
        const data = res.data.map(item => ({ ...item, price: Number(item.price) }));
        setMenuData(data);
        setMenuItems(data);
        if (data.length > 0) setActiveCategory(data[0].category);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setMenuItems]);

  /* Sync counter with cart */
  useEffect(() => {
    const c = {};
    if (Array.isArray(cartItems)) {
      cartItems.forEach(item => { c[item.name] = (c[item.name] || 0) + item.quantity; });
    }
    setCounter(c);
  }, [cartItems]);

  /* Close cart popup on outside tap */
  useEffect(() => {
    const handler = e => {
      if (cartPopupRef.current && !cartPopupRef.current.contains(e.target))
        setCartPopupOpen(false);
    };
    if (cartPopupOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cartPopupOpen]);

  const categories = [...new Set(menuData.map(i => i.category))];

  const filteredItems = menuData
    .filter(i => i.category === activeCategory)
    .filter(i =>
      activeCategory === "Burgers" && burgerType !== "All"
        ? i.type?.toLowerCase() === burgerType.toLowerCase()
        : true
    )
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  /* Cart price helpers */
  const getLinePrice = item => {
    const extras = Array.isArray(item.selectedExtras)
      ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0)
      : 0;
    return (Number(item.price) || 0) + extras;
  };
  const totalCartQty   = cartItems.reduce((a, i) => a + i.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, i) => acc + getLinePrice(i) * i.quantity, 0);

  return (
    <div className="menu-page">
      <div className="menu-bg-overlay" />

      {/* ── Floating cart FAB ── */}
      {totalCartQty > 0 && (
        <div className="menu-cart-fab-wrap" ref={cartPopupRef}>
          <button
            className={`menu-cart-fab ${cartPopupOpen ? "menu-cart-fab--open" : ""}`}
            onClick={() => setCartPopupOpen(o => !o)}
          >
            <span className="fab-icon">🛒</span>
            <span className="fab-label">View order</span>
            <span className="fab-badge">{totalCartQty}</span>
            <span className="fab-price">${totalCartPrice.toFixed(2)}</span>
          </button>

          {cartPopupOpen && (
            <div className="menu-cart-popup">
              <div className="mcp-header">
                <span>Your order</span>
                <span className="mcp-total">${totalCartPrice.toFixed(2)}</span>
              </div>
              <div className="mcp-body">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="mcp-item">
                    <div className="mcp-item-left">
                      <span className="mcp-item-name">{item.name}</span>
                      {item.selectedExtras?.length > 0 && (
                        <span className="mcp-item-extras">+ {item.selectedExtras.map(e => e.name).join(", ")}</span>
                      )}
                      {item.removedExtras?.length > 0 && (
                        <span className="mcp-item-removed">✕ No {item.removedExtras.map(e => e.name).join(", ")}</span>
                      )}
                      {item.specialNote && (
                        <span className="mcp-item-note">📝 {item.specialNote}</span>
                      )}
                    </div>
                    <div className="mcp-item-right">
                      <span className="mcp-item-qty">×{item.quantity}</span>
                      <span className="mcp-item-price">${(getLinePrice(item) * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mcp-footer">
                <button
                  className="mcp-checkout"
                  onClick={() => { setCartPopupOpen(false); navigate("/cart"); }}
                >
                  Proceed to checkout →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Header ── */}
      <div className="menu-header">
        <h1 className="menu-title">Our Menu</h1>
        <div className="menu-search-wrap">
          <span className="menu-search-icon">🔍</span>
          <input
            type="text"
            className="menu-search"
            placeholder="Search dishes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="menu-search-clear" onClick={() => setSearch("")}>×</button>
          )}
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="menu-layout">

        {/* Desktop sidebar */}
        <aside className="menu-sidebar">
          <div className="menu-sidebar-inner">
            <p className="sidebar-label">Categories</p>
            <nav className="menu-categories">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`cat-btn ${activeCategory === cat ? "cat-btn--active" : ""}`}
                  onClick={() => { setActiveCategory(cat); setBurgerType("All"); }}
                >
                  <span className="cat-icon">{CATEGORY_ICONS[cat] || "🍽️"}</span>
                  <span className="cat-name">{cat}</span>
                  {activeCategory === cat && <span className="cat-active-dot" />}
                </button>
              ))}
            </nav>

            {activeCategory === "Burgers" && (
              <>
                <p className="sidebar-label" style={{ marginTop: 20 }}>Type</p>
                <div className="burger-types">
                  {["All", "Beef", "Chicken"].map(type => (
                    <button
                      key={type}
                      className={`type-btn ${burgerType === type ? "type-btn--active" : ""}`}
                      onClick={() => setBurgerType(type)}
                    >
                      {type === "All" ? "🍔 All" : type === "Beef" ? "🥩 Beef" : "🐔 Chicken"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Grid */}
        <main className="menu-grid-wrap">

          {/* Mobile: category pills */}
          <div className="menu-cat-scroll">
            {categories.map(cat => (
              <button
                key={cat}
                className={`mobile-cat-pill ${activeCategory === cat ? "mobile-cat-pill--active" : ""}`}
                onClick={() => { setActiveCategory(cat); setBurgerType("All"); }}
              >
                {CATEGORY_ICONS[cat] || "🍽️"} {cat}
              </button>
            ))}
          </div>

          {/* Mobile: burger type pills */}
          {activeCategory === "Burgers" && (
            <div className="menu-cat-scroll menu-cat-scroll--sub">
              {["All", "Beef", "Chicken"].map(type => (
                <button
                  key={type}
                  className={`mobile-cat-pill mobile-cat-pill--sm ${burgerType === type ? "mobile-cat-pill--active" : ""}`}
                  onClick={() => setBurgerType(type)}
                >
                  {type === "All" ? "🍔 All" : type === "Beef" ? "🥩 Beef" : "🐔 Chicken"}
                </button>
              ))}
            </div>
          )}

          {/* Cards */}
          <div className="menu-grid">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : filteredItems.length === 0
              ? (
                <div className="menu-empty">
                  <span className="menu-empty-icon">🔍</span>
                  <p>No items found</p>
                  {search && <button onClick={() => setSearch("")}>Clear search</button>}
                </div>
              )
              : filteredItems.map((item, i) => {
                  const qty = counter[item.name] || 0;
                  return (
                    <div
                      key={item.id || i}
                      className="menu-card"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      {/* Image — tap to open modal */}
                      <div
                        className="mc-img-wrap"
                        onClick={() => setModalItem(item)}
                      >
                        <img
                          src={`${BACKEND}/images/${item.image}`}
                          alt={item.name}
                          className="mc-img"
                          loading="lazy"
                        />
                        <div className="mc-img-scrim" />
                      </div>

                      {/* Body */}
                      <div className="mc-body">
                        <div className="mc-name-row">
                          <h3
                            className="mc-name"
                            onClick={() => setModalItem(item)}
                          >
                            {item.name}
                          </h3>
                        </div>

                        {item.description && (
                          <p className="mc-desc">{item.description}</p>
                        )}

                        <div className="mc-footer">
                          <span className="mc-price">${item.price.toFixed(2)}</span>

                          <div className="mc-controls" onClick={e => e.stopPropagation()}>
                            {qty > 0 && (
                              <button
                                className="mc-minus"
                                onClick={() => removeFromCart(item.name)}
                              >
                                −
                              </button>
                            )}
                            <button
                              className={`mc-add ${qty > 0 ? "mc-add--has" : ""}`}
                              onClick={() => setModalItem(item)}
                            >
                              {qty > 0 ? qty : "+"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </main>
      </div>

      {/* ── Item modal ── */}
      {modalItem && (
        <ItemModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}

export default Menu;