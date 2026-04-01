import React from "react";
import "../style/cart.css";
import { useNavigate } from "react-router-dom";

function Cart({ cart, setCart }) {
  const navigate = useNavigate();
  const safeCart = Array.isArray(cart) ? cart : [];

  const removeItem = (id) => setCart(safeCart.filter(item => item.id !== id));

  const updateQty = (id, delta) => {
    setCart(
      safeCart.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const totalPrice = safeCart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="cart-page">
      <div className="overlay"></div>
      <h1 className="cart-title">YOUR BASKET</h1>

      {safeCart.length === 0 ? (
        <div className="empty-container">
          <p className="empty-msg">
            Your cart is feeling lonely. Add some snacks!
          </p>
          <button
            className="checkout-btn"
            onClick={() => navigate("/menu")}
          >
            GO TO MENU
          </button>
        </div>
      ) : (
        <div className="cart-list">
          {safeCart.map((item) => (
            <div
              className={`cart-card ${!item.image ? "no-img-card" : ""}`}
              key={item.id}
            >
              {item.image && (
                <div className="cart-img-wrapper">
                  <img
                    src={`http://localhost:5000/images/${item.image}`}
                    alt={item.name}
                    onError={(e) => {
                      e.target.parentElement.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="cart-info">
                <h3>{item.name}</h3>
                <p className="item-price-tag">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>

                <div className="cart-actions-row">
                  <div className="quantity-selector">
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(item.id, -1)}
                    >
                      −
                    </button>
                    <span className="qty-display">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(item.id, 1)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="remove-item-btn"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="cart-summary">
            <h2>Total Price: ${totalPrice.toFixed(2)}</h2>
            <button
              className="checkout-btn"
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
