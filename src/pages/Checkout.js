import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logo from "../assets/logo.png"; 
import '../style/checkout.css';
import { QRCodeCanvas } from "qrcode.react";

function Checkout({ cart, setCart, tableId }) {
    const [isOrdered, setIsOrdered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash'); 
    const [usePoints, setUsePoints] = useState(false); 
    const [userPoints, setUserPoints] = useState(150); 
    const [orderedItems, setOrderedItems] = useState([]); 
    const [showQR, setShowQR] = useState(false);
    
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        cardNumber: '', 
        expiry: '',      
        cvv: ''           
    });

    const cartItems = Array.isArray(cart) ? cart : [];
    
    // --- 👥 GROUP SPLIT STATE ---
    const [payers, setPayers] = useState([
        { id: 1, name: "Me", amount: 0, method: 'cash' }
    ]);

    // --- 💰 MATH LOGIC ---
    const getItemBasePrice = (item) => {
        const extrasTotal = item.selectedExtras ? item.selectedExtras.reduce((sum, e) => sum + Number(e.price), 0) : 0;
        return Number(item.price) + extrasTotal;
    };

    const subtotal = cartItems.reduce((acc, item) => acc + (getItemBasePrice(item) * item.quantity), 0);
    const totalVAT = subtotal * 0.11;
    const baseTotal = subtotal + totalVAT;
    const pointsDiscount = usePoints ? (userPoints / 100) : 0;
    const finalTotal = Math.max(0, baseTotal - pointsDiscount);

    // Sync first payer with total automatically
    useEffect(() => {
        if (payers.length === 1) {
            setPayers([{ ...payers[0], amount: finalTotal.toFixed(2) }]);
        }
    }, [finalTotal]);

    const addPayer = () => {
        setPayers([...payers, { id: Date.now(), name: `Friend ${payers.length + 1}`, amount: 0, method: 'cash' }]);
    };

    const updatePayer = (id, field, value) => {
        const updated = payers.map(p => p.id === id ? { ...p, [field]: value } : p);
        setPayers(updated);
    };

    const removePayer = (id) => {
        if (payers.length > 1) setPayers(payers.filter(p => p.id !== id));
    };

    const totalPaidSoFar = payers.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const remainingBalance = finalTotal - totalPaidSoFar;
    const qrValue = `https://snackattacknasma.netlify.app/split/table/${tableId}`;

    // --- 🚀 PLACE ORDER ---
    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0) { alert("Your cart is empty!"); return; }
        if (Math.abs(remainingBalance) > 0.01) { 
            alert(`Please split the remaining $${remainingBalance.toFixed(2)}!`); 
            return; 
        }

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
            table_id: tableId,
            payment_splits: payers
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

            {/* ✅ QR Pop-up Modal (Zide hayda el-block) */}
            {showQR && (
                <div className="qr-popup-overlay">
                    <div className="qr-popup-content slide-down">
                        <h3 style={{ color: '#000', marginBottom: '15px' }}>Scan to Join Split</h3>
                        <QRCodeCanvas value={qrValue} size={200} />
                        <button type="button" className="close-popup-btn" onClick={() => setShowQR(false)}>
                            DONE
                        </button>
                    </div>
                </div>
            )}

            {!isOrdered ? (
                <div className="checkout-container">
                    <div className="info-form-card glass-effect">
                        <h2 className="checkout-title">Checkout</h2>
                        
                        <div className="checkout-section group-split-box glass-panel-inner">
                            <h3 className="section-subtitle">Split Payment</h3>
                            
                            <div className="payers-list">
                                {payers.map((payer) => (
                                    <div key={payer.id} className="payer-row-checkout slide-down">
                                        <input 
                                            type="number" 
                                            value={payer.amount} 
                                            className="glass-input-small" 
                                            onChange={(e) => updatePayer(payer.id, 'amount', e.target.value)} 
                                        />
                                        <select 
                                            className="glass-select" 
                                            value={payer.method} 
                                            onChange={(e) => updatePayer(payer.id, 'method', e.target.value)}
                                        >
                                            <option value="cash">💵 Cash</option>
                                            <option value="card">💳 Card</option>
                                        </select>
                                        {payers.length > 1 && (
                                            <button type="button" className="remove-btn-checkout" onClick={() => removePayer(payer.id)}>×</button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="customer-info-inputs">
                                <input type="text" name="name" value={customerInfo.name} onChange={handleChange} required placeholder="Full Name" className="glass-input-main" />
                                <input type="tel" name="phone" value={customerInfo.phone} onChange={handleChange} required placeholder="Phone Number" className="glass-input-main" />
                            </div>

                            <div className="split-actions">
                                <button type="button" className="add-payer-btn-glass" onClick={() => setShowQR(true)}>
                                    ➕ Add Person (Scan QR)
                                </button>
                                <button type="button" className="manual-add-btn-glass" onClick={addPayer}>
                                    Manual Add
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handlePlaceOrder}>
                            <div className="checkout-summary-mini-glass">
                                <div className="summary-row"><span>Total:</span> <span>${finalTotal.toFixed(2)}</span></div>
                                <div className="summary-row" style={{ color: Math.abs(remainingBalance) > 0.01 ? '#ff4d4d' : '#95b508' }}>
                                    <span>Remaining:</span> <strong>${remainingBalance.toFixed(2)}</strong>
                                </div>
                            </div>

                            <button type="submit" className="place-order-btn-final" disabled={loading || Math.abs(remainingBalance) > 0.01}>
                                {loading ? "PROCESSING..." : "Place Order"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="receipt-overlay">
                    <div className="receipt-paper">
                        <img src={logo} alt="Logo" className="receipt-logo-bw" />
                        <h2 className="r-title">RECEIPT</h2>
                        <h3 className="r-brand">SNACK ATTACK</h3>
                        <div className="receipt-header-info">
                            <p><strong>Customer:</strong> {customerInfo.name || "Guest"}</p>
                            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                            <p><strong>Table:</strong> #{tableId}</p>
                        </div>
                        <div className="receipt-divider">------------------------------------------</div>
                        <div className="receipt-items">
                            {orderedItems.map((item, index) => (
                                <div key={index} className="r-item-row">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>${(getItemBasePrice(item) * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="receipt-divider">------------------------------------------</div>
                        <div className="receipt-total-row">
                            <span>TOTAL:</span>
                            <span>${finalTotal.toFixed(2)}</span>
                        </div>
                        <button className="back-btn-new" onClick={() => (window.location.href = '/')}>New Order</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Checkout;