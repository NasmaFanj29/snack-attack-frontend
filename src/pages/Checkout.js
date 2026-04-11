import React, { useState } from 'react';
import axios from 'axios';
import logo from "../assets/logo.png"; 
import '../style/checkout.css';

function Checkout({ cart, setCart, tableId }) {
    const [isOrdered, setIsOrdered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash'); 
    const [usePoints, setUsePoints] = useState(false); 
    const [userPoints, setUserPoints] = useState(150); 
    const [orderedItems, setOrderedItems] = useState([]); 
    
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        cardNumber: '', 
        expiry: '',      
        cvv: ''           
    });

    const cartItems = Array.isArray(cart) ? cart : [];

    // --- 💰 MATH: VAT & TOTALS ---
    const getItemBasePrice = (item) => {
        const extrasTotal = item.selectedExtras ? item.selectedExtras.reduce((sum, e) => sum + Number(e.price), 0) : 0;
        return Number(item.price) + extrasTotal;
    };

    const subtotal = cartItems.reduce((acc, item) => acc + (getItemBasePrice(item) * item.quantity), 0);
    const totalVAT = subtotal * 0.11;
    const baseTotal = subtotal + totalVAT;
    const pointsDiscount = usePoints ? (userPoints / 100) : 0;
    const finalTotal = Math.max(0, baseTotal - pointsDiscount); 

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0) { alert("Your cart is empty!"); return; }

        setLoading(true);

        const orderData = {
            customer: customerInfo,
            items: cartItems.map(item => ({
                id: item.databaseId || item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price, 
                extras: item.selectedExtras || [] 
            })),
            total_price: finalTotal.toFixed(2), 
            table_id: tableId 
        };

        try {
            const response = await axios.post('https://snack-attack-backend.onrender.com/place-order', orderData);
            if (response.data.success) {
                setOrderedItems([...cartItems]); 
                setIsOrdered(true);
                setCart([]); 
                localStorage.removeItem('snackAttackCart'); 
            }
        } catch (error) {
            alert(error.response?.data?.error || "Error connecting to server.");
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
                        <h2 className="checkout-title">Checkout</h2>
                        <form onSubmit={handlePlaceOrder}>
                            <div className={`points-box ${usePoints ? 'selected' : ''}`} onClick={() => setUsePoints(!usePoints)}>
                                <div className="points-text">
                                    <p>Redeem <strong>{userPoints} Hearts ❤️</strong></p>
                                    <span>Get ${(userPoints/100).toFixed(2)} off your bill</span>
                                </div>
                                <input type="checkbox" checked={usePoints} readOnly />
                            </div>

                            <div className="input-group">
                                <label>Full Name</label>
                                <input type="text" name="name" value={customerInfo.name} onChange={handleChange} required placeholder="Nasma Fanj" />
                            </div>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input type="tel" name="phone" value={customerInfo.phone} onChange={handleChange} required placeholder="70 123 456" />
                            </div>

                            <label className="method-label">Payment Method</label>
                            <div className="payment-methods">
                                <div className={`pay-option ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}>💵 Cash</div>
                                <div className={`pay-option ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => setPaymentMethod('card')}>💳 Card</div>
                            </div>

                            {paymentMethod === 'card' && (
                                <div className="card-details-form">
                                    <input type="text" name="cardNumber" placeholder="Card Number" maxLength="16" onChange={handleChange} required />
                                    <div className="row">
                                        <input type="text" name="expiry" placeholder="MM/YY" onChange={handleChange} required />
                                        <input type="text" name="cvv" placeholder="CVV" maxLength="3" onChange={handleChange} required />
                                    </div>
                                </div>
                            )}
                            
                            <div className="checkout-summary-mini">
                                <div className="summary-row"><span>Subtotal:</span> <span>${subtotal.toFixed(2)}</span></div>
                                <div className="summary-row"><span>Total VAT:</span> <span>${totalVAT.toFixed(2)}</span></div>
                                {usePoints && <div className="summary-row discount"><span>Hearts Discount:</span> <span>-${pointsDiscount.toFixed(2)}</span></div>}
                                <hr />
                                <div className="summary-row final"><span>Total:</span> <strong>${finalTotal.toFixed(2)}</strong></div>
                            </div>

                            <button type="submit" className="place-order-btn" disabled={loading}>
                                {loading ? "PROCESSING..." : "Place Order"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                /* --- ✨ THE REWRITTEN PRO RECEIPT WITH LOGO FIX --- */
                <div className="receipt-overlay">
                    <div className="receipt-paper" style={{ textAlign: 'left', padding: '30px', fontFamily: 'monospace', maxWidth: '400px' }}>
                        
                        {/* 🛠️ LOGO CENTERED REGARDLESS OF TEXT ALIGNMENT */}
                        <img src={logo} alt="Logo" className="receipt-logo-bw" />
                                                    
                        <h2 style={{ textAlign: 'center', marginBottom: '5px', fontSize: '18px' }}>RECEIPT</h2>
                        <h3 style={{ textAlign: 'center', marginTop: '0', color: '#555', fontSize: '24px', fontWeight: 'bold' }}>SNACK ATTACK</h3>
                        
                        <div className="receipt-header-info" style={{ fontSize: '14px', marginBottom: '5px', lineHeight: '0.8' }}>
                            <p><strong>Customer:</strong> {customerInfo.name || "Guest"}</p>
                            <p><strong>Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                            <p><strong>Order Number:</strong> #SA-{Math.floor(1000 + Math.random() * 9000)}</p>
                            <p><strong>Order Type:</strong> DINE-IN</p>
                            <div style={{ display: 'flex', gap: '150px', fontSize: '14px', marginBottom: '10px' }}>
                                <span><strong>Table:</strong> #{tableId}</span>
                                <span><strong>Paid:</strong> {paymentMethod.toUpperCase()}</span>
                            </div>
                            <p><strong>Server:</strong> Mohammd S.</p>
                        </div>

                        <div className="receipt-divider">-----------------------------------------------</div>
                        
                        <div className="receipt-items">
                            {orderedItems.map((item, index) => {
                                const itemBaseWithExtras = getItemBasePrice(item);
                                const itemTotalWithVAT = itemBaseWithExtras * 1.11 * item.quantity;

                                return (
                                    <div key={index} className="receipt-item-group" style={{ marginBottom: '12px' }}>
                                        <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>${itemTotalWithVAT.toFixed(2)}</span>
                                        </div>
                                        
                                        {/* --- 🍟 SHOW ADD-ONS (EXTRAS) --- */}
                                        {item.selectedExtras && item.selectedExtras.length > 0 && (
                                            <div className="receipt-extras" style={{ marginLeft: '15px', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
                                                {item.selectedExtras.map((extra, idx) => (
                                                    <div key={idx}>+ {extra.name} (${Number(extra.price).toFixed(2)})</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="receipt-divider">-----------------------------------------------</div>
                        
                        <div className="receipt-summary" style={{ fontSize: '14px' }}>
                            {(() => {
                                const finalSub = orderedItems.reduce((acc, item) => acc + (getItemBasePrice(item) * item.quantity), 0);
                                const finalTax = finalSub * 0.11;
                                const finalGrand = finalSub + finalTax - (usePoints ? (userPoints/100) : 0);

                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>Subtotal:</span>
                                            <span>${finalSub.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>Sales Tax (11%):</span>
                                            <span>${finalTax.toFixed(2)}</span>
                                        </div>
                                        {usePoints && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                                                <span>Hearts Discount:</span>
                                                <span>-${(userPoints/100).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="receipt-divider">--------------------------------------------</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#000000' }}>
                                            <span>TOTAL:</span>
                                            <span>${finalGrand.toFixed(2)}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <button className="back-btn" onClick={() => (window.location.href = '/')} style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#333',
                             color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                            New Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Checkout;