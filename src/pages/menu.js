import React, { useState, useEffect } from "react";
import "../style/menu.css";
import axios from "axios";

function Menu({ addToCart, setMenuItems }) {
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [burgerType, setBurgerType] = useState("All");
  const [counter, setCounter] = useState({});
  const [menuData, setMenuData] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/menu")
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

  const categories = [...new Set(menuData.map((item) => item.category))];

  const filteredItems = menuData
    .filter((item) => item.category === activeCategory)
    .filter((item) =>
      activeCategory === "Burgers" && burgerType !== "All"
        ? item.type?.toLowerCase() === burgerType.toLowerCase()
        : true
    )
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );

  const handleUpdateCounter = (name, delta) => {
    setCounter((prev) => ({
      ...prev,
      [name]: Math.max((prev[name] || 0) + delta, 0),
    }));
  };

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
        </div>

        <div className="menu-list-wrapper">
          <div className="menu-list">
            {filteredItems.map((item, i) => (
              <div className="menu-card" key={i}>
                <div className="menu-img">
                  <img
                    src={`http://localhost:5000/images/${item.image}`}
                    alt={item.name}
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/150";
                    }}
                  />
                </div>

                <div className="menu-info">
                  <h3>{item.name}</h3>
                  <p className="price">${item.price.toFixed(2)}</p>

                  <div className="quantity-selector">
                    <button
                      className="qty-btn"
                      onClick={() =>
                        handleUpdateCounter(item.name, -1)
                      }
                    >
                      −
                    </button>
                    <span className="qty-display">
                      {counter[item.name] || 0}
                    </span>
                    <button
                      className="qty-btn"
                      onClick={() =>
                        handleUpdateCounter(item.name, 1)
                      }
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="add-cart-btn"
                    onClick={() => {
                      if ((counter[item.name] || 0) > 0) {
                        addToCart(
                          item.name,
                          item.price,
                          item.image,
                          counter[item.name]
                        );
                        setCounter({
                          ...counter,
                          [item.name]: 0,
                        });
                      }
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Menu;
