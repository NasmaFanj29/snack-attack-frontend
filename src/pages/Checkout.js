import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import logo from "../assets/logo.png";
import '../style/checkout.css';
import { QRCodeCanvas } from "qrcode.react";

function Checkout({ setCart }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // ✅ Unified IDs men el URL aw el state
    const urlOrderId = searchParams.get('orderId');
    const {
        orderId: stateOrderId,
        cartItems: stateCartItems = [],
        tableId: stateTableId = "1",
    } = location.state || {};

    const activeOrderId = stateOrderId || urlOrderId;
    const isScanner = !!urlOrderId;

    const [orderedItems, setOrderedItems] = useState(stateCartItems);
    const [tableId, setTableId] = useState(stateTableId);
    const [step, setStep] = useState("waiting");
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
    const [payers, setPayers] = useState([{ id: 1, name: "", amount: 0, method: 'cash' }]);
    const [showQR, setShowQR] = useState(false);
    const [loading, setLoading] = useState(false);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');

    if (mode === 'add' && isScanner && activeOrderId) {
        const addNewScannerPayer = async () => {
            try {
                console.log("🔥 SCANNER TRIGGERED");

                const res = await axios.get(`https://snack-attack-backend.onrender.com/orders/${activeOrderId}`);

                const existingSplits = res.data.order?.payment_splits
                    ? JSON.parse(res.data.order.payment_splits)
                    : [];

                const updated = [
                    ...existingSplits,
                    { id: Date.now(), name: "", amount: 0, method: 'cash' }
                ];

                setPayers(updated);

                await axios.put(
                    `https://snack-attack-backend.onrender.com/admin/orders/${activeOrderId}/status`,
                    {
                        payment_splits: updated,
                        replace_splits: true
                    }
                );
            } catch (e) {
                console.error(e);
            }
        };

        addNewScannerPayer();
    }
}, [location.search, activeOrderId]); // 🔥🔥🔥

    // ✅ Ref to avoid overwriting payers while user is actively editing
    const isEditingRef = useRef(false);

    // ✅ Calculation Helpers
    const getItemBasePrice = (item) => {
        if (!item) return 0;
        const extrasTotal = (item.selectedExtras && Array.isArray(item.selectedExtras))
            ? item.selectedExtras.reduce((sum, e) => sum + Number(e.price || 0), 0)
            : 0;
        return Number(item.price || item.price_at_time || 0) + extrasTotal;
    };

    const subtotal = (orderedItems && Array.isArray(orderedItems))
        ? orderedItems.reduce((acc, item) => acc + (Number(item.price || item.price_at_time || 0) * (item.quantity || 1)), 0)
        : 0;

    const totalVAT = subtotal * 0.11;
    const finalTotal = subtotal + totalVAT;

    // ✅ Sync payers to backend (replace mode)
    const syncPayersToBackend = async (updatedPayers) => {
        if (!activeOrderId) return;
        try {
            await axios.put(
                `https://snack-attack-backend.onrender.com/admin/orders/${activeOrderId}/status`,
                {
                    status: "PaymentPending",
                    payment_splits: updatedPayers,
                    replace_splits: true
                }
            );
        } catch (err) {
            console.error("Sync payers error:", err);
        }
    };

    // ✅ Fetch Data automatically — for both original user and scanners
    useEffect(() => {
        if (activeOrderId) {
            axios.get(`https://snack-attack-backend.onrender.com/orders/${activeOrderId}`)
                .then(res => {
                    setOrderedItems(res.data.items || []);
                    setTableId(res.data.order?.table_id || "1");

                    // Load existing payers from backend
                    const splits = res.data.order?.payment_splits;
                    if (splits) {
                        try {
                            const parsed = typeof splits === 'string' ? JSON.parse(splits) : splits;
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setPayers(parsed);
                            }
                        } catch (e) { /* keep default */ }
                    }

                    const status = res.data.order?.status?.toLowerCase();
                    if (["accepted", "preparing", "ready", "served", "paymentpending"].includes(status)) {
                        setStep("payment");
                    } else if (status === "paid") {
                        setStep("receipt");
                    } else if (status === "paid" || status === "Paid") { 
                        setStep("receipt");
                    }
                })
                .catch(err => console.error(err));
        }
    }, [activeOrderId]);

    // ✅ Real-time Polling — order status + shared payers
    useEffect(() => {
    if (!activeOrderId) return;

    const interval = setInterval(async () => {
        try {
            const res = await axios.get(`https://snack-attack-backend.onrender.com/orders/${activeOrderId}`);
            const status = res.data.order.status.toLowerCase();

            // 🔥 الحل هون
            if (["accepted", "preparing", "ready", "served", "paymentpending"].includes(status)) {
                setStep("payment");
            }

            if (status === "paid") {
                setStep("receipt");
            }

            if (status === "rejected") {
                setStep("rejected");
            }

        } catch (err) {
            console.log("Polling...");
        }
    }, 1500); // خففناها لسرعة

    return () => clearInterval(interval);
}, [activeOrderId]);

    useEffect(() => {
        if (payers.length === 1 && finalTotal > 0) {
            setPayers((p) => [{ ...p[0], amount: finalTotal.toFixed(2) }]);
        }
    }, [finalTotal]);

    const totalPaidSoFar = payers.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const remainingBalance = finalTotal - totalPaidSoFar;
    const qrValue = `${window.location.origin}/checkout?orderId=${activeOrderId}&mode=add`;

   


    const addPayer = () => {
        const updated = [...payers, { id: Date.now(), name: "", amount: 0, method: 'cash' }];
        setPayers(updated);
        syncPayersToBackend(updated);
    };

    const updatePayer = (id, field, value) => {
        isEditingRef.current = true;
        const updated = payers.map((p) => (p.id === id ? { ...p, [field]: value } : p));
        setPayers(updated);
        // Debounce sync so we don't spam on every keystroke
        clearTimeout(window._payerSyncTimeout);
        window._payerSyncTimeout = setTimeout(() => {
            syncPayersToBackend(updated);
            isEditingRef.current = false;
        }, 800);
    };

    const removePayer = (id) => {
        if (payers.length <= 1) return;
        const updated = payers.filter((p) => p.id !== id);
        setPayers(updated);
        syncPayersToBackend(updated);
    };

    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        const invalidPayer = payers.find(p => !p.name || (p.method === 'card' && !p.phone));
            if (invalidPayer) return alert("Please fill Name (and Phone for Card)!");
        try {
            await axios.put(`https://snack-attack-backend.onrender.com/admin/orders/${activeOrderId}/status`, {
                status: "PaymentPending",
                customer: customerInfo,
                payment_splits: payers,
                replace_splits: true
            });
            setStep("waitingForPayment");
        } catch (err) { alert("Error!"); }
        finally { setLoading(false); }
    };

    if (step === "waiting" || step === "waitingForPayment") {
        return (
            <div className="checkout-page">
                <div className="overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <div className="info-form-card glass-effect" style={{ padding: '50px' }}>
                        <img src={logo} alt="Logo" width="160" style={{ marginBottom: '20px' }} />
                        <h2>{step === "waiting" ? "WAITING FOR APPROVAL... 👨‍🍳" : "WAITING FOR ADMIN... 💰"}</h2>
                        <p>Order #{activeOrderId} — Stay on this page.</p>
                        <div className="loader-line"></div>
                    </div>
                </div>
            </div>
        );
    }

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
                        <div className="checkout-container">
                            <div className="info-form-card glass-effect">
                                <h2 className="checkout-title">✅ COMPLETE PAYMENT</h2>
                                <p style={{ color: '#606060', marginBottom: '15px' }}>Order #{activeOrderId} | Table #{tableId}</p>

                                <div className="checkout-section group-split-box">
                                    {payers.map((payer) => (
                                        <div key={payer.id} className="payer-row-checkout">
                                           <input type="text"  placeholder="Name *"  className="glass-input-small" style={{width: '80px'}} value={payer.name || ""} onChange={(e) => updatePayer(payer.id, 'name', e.target.value)}/>
                                           
                                        {payer.method === 'card' && (
                                            <input type="tel"  placeholder="Phone *"  className="glass-input-small" style={{width: '80px'}}  value={payer.phone || ""} onChange={(e) => updatePayer(payer.id, 'phone', e.target.value)}/>
                                        )}
                                        <input type="number" value={payer.amount} className="glass-input-small"  onChange={(e) => updatePayer(payer.id, 'amount', e.target.value)} />
                                            <select
                                            className="glass-select" value={payer.method} onChange={(e) => updatePayer(payer.id, 'method', e.target.value)}>
                                                <option value="cash">💵 Cash</option>
                                                <option value="card">💳 Card</option>
                                            </select>
                                            {payers.length > 1 && (
                                                <button type="button" onClick={() => removePayer(payer.id)} style={{ color: '#ff4d4d', border: 'none', background: 'transparent' }}>✕</button>
                                            )}
                                        </div>
                                    ))}

                                 
                                    {!isScanner && (
                                        <button type="button" className="add-payer-btn-glass" onClick={() => setShowQR(true)} style={{ width: '100%', marginTop: '10px', background: '#FFC20E', color: '#000', fontWeight: 'bold' }} >
                                            Scan to split payment 📲
                                        </button>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                       
                                        <button type="button" className="add-payer-btn-glass" onClick={() => navigate(`/cart/${activeOrderId}`)} style={{ background: 'transparent', border: '1px solid #FFC20E', color: '#FFC20E' }}>✏️ Edit Order</button>
                                    </div>
                                </div>

                                <form onSubmit={handleConfirmPayment}>
                                    <div className="checkout-summary-mini-glass">
                                        <div className="summary-row"><span>Total Bill:</span><span>${finalTotal.toFixed(2)}</span></div>
                                        <div className="summary-row" style={{ color: remainingBalance > 0 ? '#d90d0d' : '#95b508' }}>
                                            <span>Remaining:</span><span>${remainingBalance.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button type="submit" className="place-order-btn-final" disabled={loading}>
                                        {loading ? "CONFIRMING..." : "CONFIRM PAYMENT 💳"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="receipt-overlay">
                            <div className="receipt-paper">
                                <img src={logo} alt="Logo" className="receipt-logo-bw" />
                                <div className="receipt-branch-info"><h1>Snack Attack</h1><h3>Hamra - Bliss Street</h3><p>Tel: 03 231 506</p></div>
                                <div className="receipt-header-info">
                                    <p><strong>Order #:</strong> {activeOrderId}</p>
                                    <p><strong>Table:</strong> #{tableId}</p>
                                    <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                </div>
                                <div className="receipt-divider">-------------------------------------------</div>
                                <div className="receipt-items">
                                    {orderedItems.map((item, index) => (
                                        <div key={index} className="r-item-container">
                                            <div className="r-item-row"><span>{item.quantity}x {item.name}</span><span>${(getItemBasePrice(item) * item.quantity).toFixed(2)}</span></div>
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

    if (step === "receipt") {
        return (<div className="checkout-page"><div className="receipt-overlay" style={{ paddingTop: '50px' }}><h2>✅ PAID! ENJOY!</h2><button onClick={() => window.location.href = '/'}>New Order</button></div></div>);
    }
}

export default Checkout;