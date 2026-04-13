import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import logo from "../assets/logo.png";
import '../style/checkout.css';
import { QRCodeCanvas } from "qrcode.react";

function Checkout({ setCart }) {
    const location = useLocation();
    const navigate = useNavigate();

     const [searchParams] = useSearchParams();
    const splitAmount = searchParams.get('amount');
    const splitOrderId = searchParams.get('orderId');
    const isSplitRequest = !!splitAmount;
    const [step, setStep] = useState(isSplitRequest ? "payment" : "waiting");

    // Receive order info placed by Cart.js
    const {
        orderId: initialOrderId,
        cartItems: initialCartItems = [],
        tableId = "1",
    } = location.state || {};

    const [orderId] = useState(initialOrderId);
   const [orderedItems, setOrderedItems] = useState(initialCartItems);
    const [orderStatus, setOrderStatus] = useState("Requested");
    

    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
    const [payers, setPayers] = useState([{ id: 1, name: "Me", amount: 0, method: 'cash' }]);
    const [showQR, setShowQR] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isOrdered, setIsOrdered] = useState(false);
   
    

    const getItemBasePrice = (item) => {
        const extrasTotal = item.selectedExtras
            ? item.selectedExtras.reduce((sum, e) => sum + Number(e.price), 0)
            : 0;
        return Number(item.price) + extrasTotal;
    };

    const subtotal = (orderedItems && orderedItems.length > 0) 
        ? orderedItems.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0)
        : 0;
    
    const totalVAT = subtotal * 0.11;
    const finalTotal = subtotal + totalVAT;

    // Sync single payer amount to finalTotal
    useEffect(() => {
        if (payers.length === 1) {
            setPayers((p) => [{ ...p[0], amount: finalTotal.toFixed(2) }]);
        }
    }, [finalTotal]);

    // ── POLL for admin decision while on "waiting" step ──────────────────────
    useEffect(() => {
        if (step !== "waiting" || !orderId) return;

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(
                    `https://snack-attack-backend.onrender.com/order-status/${orderId}`
                );
                const status = (res.data.status || "").toLowerCase();
                setOrderStatus(status);

                if (status === "accepted" || status === "preparing") {
                    clearInterval(interval);
                    setStep("payment"); // ✅ Admin accepted → show payment form
                }
                if (status === "rejected") {
                    clearInterval(interval);
                    setStep("rejected");
                }
            } catch (err) {
                console.log("Still waiting for admin...");
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [step, orderId]);
    useEffect(() => {
        if (step !== "waitingForPayment" || !orderId) return;

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(
                    `https://snack-attack-backend.onrender.com/order-status/${orderId}`
                );
                const status = (res.data.status || "").toLowerCase();
                if (status === "paid") {
                    clearInterval(interval);
                    if (setCart) setCart([]);
                    setStep("receipt"); 
                }
            } catch (err) {
                console.log("Waiting for payment confirmation...");
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [step, orderId, setCart]);

    useEffect(() => {
    if (isSplitRequest && splitOrderId) {
        axios.get(`https://snack-attack-backend.onrender.com/orders/${splitOrderId}`)
            .then(res => {
                setOrderedItems(res.data.items);
            })
            .catch(err => console.error(err));
    }
}, [isSplitRequest, splitOrderId]);

    const totalPaidSoFar = payers.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const remainingBalance = finalTotal - totalPaidSoFar;
    const qrValue = `https://snackattacknasma.netlify.app/split/table/${tableId}?amount=${remainingBalance.toFixed(2)}&orderId=${orderId}`;

    const addPayer = () =>
        setPayers([...payers, { id: Date.now(), name: `Friend ${payers.length}`, amount: 0, method: 'cash' }]);

    const updatePayer = (id, field, value) =>
        setPayers(payers.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

    const removePayer = (id) => {
        if (payers.length > 1) setPayers(payers.filter((p) => p.id !== id));
    };

    const handleChange = (e) =>
        setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });

    // Confirm payment details (PATCH existing order, don't create a new one)
    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        if (!customerInfo.name || !customerInfo.phone) {
            alert("Please fill in your name and phone number!");
            return;
        }
        setLoading(true);
        if (!orderId) {
    alert("Order ID missing!");
    return;
}
        try {
            const res = await axios.put( `https://snack-attack-backend.onrender.com/orders/${orderId}/status`,
                {
                    status: "PaymentPending",
                    customer: customerInfo,
                    payment_splits: payers,
                }
            );
            if (res.data.success) {
                setStep("waitingForPayment");
            }
        } catch (err) {
            alert("Error confirming payment. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
if (isSplitRequest) {
    return (
        <div className="checkout-page">
            <div className="overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="info-form-card glass-effect">
                    <img src={logo} alt="Logo" width="120" />

                    <h2>SPLIT PAYMENT 📲</h2>
                    <p>Contributing to Table #{tableId}</p>

                    {/* ✅ عرض الأكل */}
                    <div style={{ margin: '15px 0', textAlign: 'left' }}>
                        {orderedItems.map((item, index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{item.quantity}x {item.name}</span>
                                <span>${(Number(item.price) * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    {/* ✅ المبلغ */}
                    <div style={{ margin: '20px 0', fontSize: '2.5rem', fontWeight: '900', color: '#FFC20E' }}>
                        ${splitAmount}
                    </div>

                    <button
                        className="place-order-btn-final"
                        onClick={() => alert("Paying Share...")}
                    >
                        PAY MY SHARE 💳
                    </button>
                </div>
            </div>
        </div>
    );
}
    // ── WAITING SCREEN ────────────────────────────────────────────────────────
    if (step === "waiting") {
        return (
            <div className="checkout-page">
                <div className="overlay" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#fff',
                    textAlign: 'center'
                }}>
                    <div className="info-form-card glass-effect" style={{ padding: '50px' }}>
                        <img src={logo} alt="Snack Attack Logo" width="160" style={{ marginBottom: '20px' }} />
                        <h2>WAITING FOR APPROVAL... 👨‍🍳</h2>
                        <p>Order #{orderId} sent — waiting for admin to accept</p>
                        <div className="loader-line"></div>
                    </div>
                </div>
            </div>
        );
    }
    // ── STEP: WAITING FOR PAYMENT CONFIRMATION ────────────────────────────
    if (step === "waitingForPayment") {
        return (
            <div className="checkout-page">
                <div className="overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', textAlign: 'center' }}>
                    <div className="info-form-card glass-effect" style={{ padding: '50px' }}>
                        <img src={logo} alt="Snack Attack Logo" width="160" style={{ marginBottom: '20px' }} />
                        <h2>WAITING FOR ADMIN... 💰</h2>
                        <p>Payment details sent! Please wait for staff to confirm.</p>
                        <div className="loader-line"></div>
                    </div>
                </div>
            </div>
        );
    }

    // ── REJECTED SCREEN ───────────────────────────────────────────────────────
    if (step === "rejected") {
        return (
            <div className="checkout-page">
                <div className="overlay" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#fff',
                    textAlign: 'center'
                }}>
                    <div className="info-form-card glass-effect" style={{ padding: '50px' }}>
                        <img src={logo} alt="Snack Attack Logo" width="160" style={{ marginBottom: '20px' }} />
                        <h2>ORDER REJECTED ❌</h2>
                        <p>Sorry, the kitchen couldn't accept your order.</p>
                        <button
                            className="place-order-btn-final"
                            style={{ marginTop: '20px' }}
                            onClick={() => navigate('/')}
                        >
                            TRY AGAIN
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── PAYMENT FORM (shown after admin accepts) ──────────────────────────────
    if (step === "payment") {
        return (
            <div className="checkout-page">
                <div className="overlay">
                {showQR && (
                    <div className="qr-popup-overlay">
                        <div className="qr-popup-content slide-down">
                            <QRCodeCanvas value={qrValue} size={200} />
                            <button onClick={() => setShowQR(false)}>DONE</button>
                        </div>
                    </div>
                )}
                <div className="layout-wrapper">
                    {/* LEFT — Payment Form */}
                    <div className="checkout-container">
                        <div className="info-form-card glass-effect">
                            <h2 className="checkout-title">✅ Order Accepted! Complete Payment</h2>

                            {/* Accepted banner */}
                            <div style={{
                                background: 'rgba(149,181,8,0.2)',
                                border: '1px solid #95b508',
                                borderRadius: '8px',
                                padding: '10px 16px',
                                marginBottom: '16px',
                                color: '#71900b',
                                fontWeight: 600,
                                fontSize: '0.9rem'
                            }}>
                                🎉 The kitchen accepted your order #{orderId}. Please fill in your payment details below.
                            </div>

                            <div className="checkout-section group-split-box">
                                {payers.map((payer) => (
                                    <div key={payer.id} className="payer-row-checkout">
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
                                            <button
                                                type="button"
                                                onClick={() => removePayer(payer.id)}
                                                style={{ background: 'transparent', color: '#ff4d4d', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <input
                                    type="text"
                                    name="name"
                                    value={customerInfo.name}
                                    placeholder="Full Name *"
                                    className="glass-input-main"
                                    onChange={handleChange}
                                />
                                <input
                                    type="tel" name="phone" value={customerInfo.phone} placeholder="Phone Number *" className="glass-input-main" onChange={handleChange}
                                />

                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    
                                    <button type="button" className="add-payer-btn-glass" onClick={() => setShowQR(true)}>
                                        📲 Split Bill Share QR
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleConfirmPayment}>
                                <div className="checkout-summary-mini-glass">
                                    <div className="summary-row">
                                        <span>Total:</span>
                                        <span>${finalTotal.toFixed(2)}</span>
                                    </div>
                                    {payers.length > 1 && (
                                        <div className="summary-row" style={{ color: remainingBalance > 0 ? '#ff4d4d' : '#95b508' }}>
                                            <span>Remaining:</span>
                                            <span>${remainingBalance.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="place-order-btn-final"
                                    disabled={loading}
                                >
                                    {loading ? "CONFIRMING..." : "CONFIRM PAYMENT 💳"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT — Receipt Preview */}
                    <div className="receipt-overlay">
                        <div className="receipt-paper">
                            <img src={logo} alt="Logo" className="receipt-logo-bw" />
                            <div className="receipt-branch-info">
                                <h1>Snack Attack</h1>
                                <h3>Hamra - Bliss Street</h3>
                                <p>Tel: 03 231 506</p>
                            </div>
                            <div className="receipt-header-info">
                                <p><strong>Order #:</strong> {orderId}</p>
                                <p><strong>Table:</strong> #{tableId}</p>
                                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                <p><strong>Customer:</strong> {customerInfo.name || "Guest"}</p>
                                <p><strong>Number:</strong> {customerInfo.phone || "N/A"}</p>
                            </div>
                            <div className="receipt-divider">-------------------------------------------</div>
                            <div className="receipt-items">
                                {orderedItems.map((item, index) => (
                                    <div key={index} className="r-item-container">
                                        <div className="r-item-row">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>${(getItemBasePrice(item) * item.quantity).toFixed(2)}</span>
                                        </div>
                                        {item.selectedExtras && item.selectedExtras.length > 0 && (
                                            <div className="r-extras">
                                                {item.selectedExtras.map((extra, i) => (
                                                    <p key={i}>+ {extra.name} (${Number(extra.price).toFixed(2)})</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="receipt-divider">-------------------------------------------</div>
                            <div className="receipt-summary">
                                <div className="r-summary-line"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                                <div className="r-summary-line"><span>VAT (11%):</span><span>${totalVAT.toFixed(2)}</span></div>
                                <div className="receipt-total-row"><span>TOTAL:</span><span>${finalTotal.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        );
    }

    // ── RECEIPT (after payment confirmed) ────────────────────────────────────
    if (step === "receipt") {
        return (
            <div className="checkout-page">
                <div className="receipt-overlay" style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
                    <div className="receipt-paper">
                        <img src={logo} alt="Logo" className="receipt-logo-bw" />
                        <div className="receipt-branch-info">
                            <h1>Snack Attack</h1>
                            <h3>Hamra - Bliss Street</h3>
                            <p>Tel: 03 231 506</p>
                        </div>
                        <div className="receipt-header-info">
                            <p><strong>Order #:</strong> {orderId}</p>
                            <p><strong>Table:</strong> #{tableId}</p>
                            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                            <p><strong>Customer:</strong> {customerInfo.name || "Guest"}</p>
                            <p><strong>Number:</strong> {customerInfo.phone || "N/A"}</p>
                        </div>
                        <div className="receipt-divider">--------------------------------------------</div>
                        <div className="receipt-items">
                            {orderedItems.map((item, index) => (
                                <div key={index} className="r-item-container">
                                    <div className="r-item-row">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>${(getItemBasePrice(item) * item.quantity).toFixed(2)}</span>
                                    </div>
                                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                                        <div className="r-extras">
                                            {item.selectedExtras.map((extra, i) => (
                                                <p key={i}>+ {extra.name} (${Number(extra.price).toFixed(2)})</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="receipt-divider">--------------------------------------------</div>
                        <div className="receipt-summary">
                            <div className="r-summary-line"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                            <div className="r-summary-line"><span>VAT (11%):</span><span>${totalVAT.toFixed(2)}</span></div>
                            <div className="receipt-total-row"><span>TOTAL:</span><span>${finalTotal.toFixed(2)}</span></div>
                        </div>
                        <div style={{ textAlign: 'center', margin: '16px 0', color: '#95b508', fontWeight: 700, fontSize: '1.1rem' }}>
                            ✅ PAYMENT CONFIRMED — ENJOY YOUR MEAL!
                        </div>
                        <button className="back-btn-new" onClick={() => (window.location.href = '/')}>
                            New Order
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default Checkout;
