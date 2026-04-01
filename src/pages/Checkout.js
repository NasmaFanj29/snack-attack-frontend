import React, { useState } from 'react';
import axios from 'axios';
import logo from "../assets/logo.png"; 
import '../style/checkout.css';

function Checkout({ cart, setCart , tableId }) {
    const [isOrdered, setIsOrdered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: ''
    });

    const cartItems = Array.isArray(cart) ? cart : [];

    // Calculations
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const vat = subtotal * 0.11;
    const finalTotal = subtotal + vat; 
    const totalProductCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        
        if (cartItems.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        setLoading(true);

        // Change this in Checkout.js
        const orderData = {
            customer: customerInfo,
            items: cartItems.map(item => ({
                id: item.databaseId || item.id,
                quantity: item.quantity,
                price: item.price
            })),
            total_price: finalTotal.toFixed(2),
            table_id: tableId // Halla2 sar dynamic!
        };

        try {
            const response = await axios.post('http://192.168.0.195:5000/place-order', orderData);
            
            if (response.data.success) {
                setIsOrdered(true);
                setCart([]); // Clear cart after success
                localStorage.removeItem('snackAttackCart'); // Clear storage
                
                alert(`Mabrouk! Order placed successfully. You earned ${response.data.pointsEarned} Hearts ❤️`);
            }
        } catch (error) {
            console.error("Checkout Error:", error);
            alert(error.response?.data?.error || "Error connecting to server. Check if backend is running!");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
    };

    return (
        <div className="checkout-page">
            <div className="overlay"></div>

            {!isOrdered ? (
                <div className="checkout-container">
                    <div className="info-form-card">
                        <h2 className="checkout-title">Complete Your Order</h2>
                        <form onSubmit={handlePlaceOrder}>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    placeholder="Enter your name"
                                    value={customerInfo.name} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input 
                                    type="tel" 
                                    name="phone" 
                                    placeholder="e.g. 70123456"
                                    value={customerInfo.phone} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                            
                            <div className="checkout-summary-mini">
                                <p>Total Items: {totalProductCount}</p>
                                <p>Final Amount: <strong>${finalTotal.toFixed(2)}</strong></p>
                            </div>

                            <button type="submit" className="place-order-btn" disabled={loading}>
                                {loading ? "Processing..." : "Place Order"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="receipt-overlay">
                    <div className="receipt-paper">
                        <img src={logo} alt="Logo" className="receipt-logo-bw" />
                        <h3>ORDER CONFIRMED!</h3>
                        <p>Thank you, {customerInfo.name}!</p>
                        <div className="receipt-divider">------------------------------------------</div>
                        <div className="receipt-items">
                            {cartItems.map((item, index) => (
                                <div key={index} className="receipt-item">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>${(item.quantity * item.price).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="receipt-divider">------------------------------------------</div>
                        <div className="receipt-summary">
                            <p>Subtotal: ${subtotal.toFixed(2)}</p>
                            <p>VAT (11%): ${vat.toFixed(2)}</p>
                            <p className="final-total">TOTAL: ${finalTotal.toFixed(2)}</p>
                        </div>
                        <div className="product-count-box" style={{marginTop: '10px', fontSize: '12px'}}>
                            TOTAL PRODUCTS: {totalProductCount}
                        </div>
                        <button className="back-btn" onClick={() => (window.location.href = '/')}>
                            New Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Checkout;