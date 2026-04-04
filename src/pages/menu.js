import React, { useState, useEffect } from "react";
import "../style/menu.css";
import axios from "axios";

function Menu({ addToCart, setMenuItems }) {
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [burgerType, setBurgerType] = useState("All");
  const [menuData, setMenuData] = useState([]);
  const [counter, setCounter] = useState({}); // Kirmal el-dynamic button numbers

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

  // Handle Quick Add & Counter
  const handleAddClick = (item) => {
    // 1. Update Local Counter (1, 2, 3...)
    setCounter((prev) => ({
      ...prev,
      [item.name]: (prev[item.name] || 0) + 1,
    }));

    // 2. Add to Global Cart
    addToCart(item.name, item.price, item.image, 1);
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
                    onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }}
                  />
                </div>

                <div className="menu-info">
                  <div className="title-row">
                    <h3>{item.name}</h3>
                    <button 
                      className={`dynamic-add-btn ${counter[item.name] > 0 ? "has-items" : ""}`} 
                      onClick={() => handleAddClick(item)}
                    >
                      {counter[item.name] > 0 ? counter[item.name] : "+"}
                    </button>
                  </div>
                  
                  <p className="menu-description">
                    {item.description || "Fresh and delicious!"}
                  </p>
                  <p className="price">${item.price.toFixed(2)}</p>
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