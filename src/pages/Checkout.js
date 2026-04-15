import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import logo from "../assets/logo.png";
import '../style/checkout.css';
import { QRCodeCanvas } from "qrcode.react";
import socket from "../socket";

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

    // ✅ isScanner = anyone who opened via QR link (?orderId=...&mode=add)
    const isScanner = !!(urlOrderId && searchParams.get("mode") === "add");

    const [orderedItems, setOrderedItems] = useState(stateCartItems);
    const [tableId, setTableId] = useState(stateTableId);
    const [step, setStep] = useState("waiting");
    const [payers, setPayers] = useState([]);
    const [showQR, setShowQR] = useState(false);
    const [loading, setLoading] = useState(false);

    // ✅ Each scanner gets a stable local ID for their own row
    const myPayerIdRef = useRef(null);
    const isEditingRef = useRef(false);

    const myUserId = useRef(localStorage.getItem("userId"));

    if (!myUserId.current) {
        myUserId.current = Date.now().toString();
        localStorage.setItem("userId", myUserId.current);
    }

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
    const totalPaidSoFar = payers.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const remainingBalance = finalTotal - totalPaidSoFar;
const lockedRef = useRef(false);
    const qrValue = `${window.location.origin}/checkout?orderId=${activeOrderId}&mode=add`;

    // ✅ Sync full payers array to backend (replace mode)
    const syncPayersToBackend = async (updatedPayers) => {
        if (!activeOrderId) return;
        try {
            await axios.put(
                `https://snack-attack-backend.onrender.com/admin/orders/${activeOrderId}/status`,
                {
                    payment_splits: updatedPayers,
                    replace_splits: true
                }
            );
        } catch (err) {
            console.error("Sync payers error:", err);
        }
    };

    // ✅ STEP 1: On mount — fetch order data
   
   useEffect(() => {
    if (!activeOrderId) return;

    axios.get(`https://snack-attack-backend.onrender.com/orders/${activeOrderId}`)
        .then(res => {

            setOrderedItems(res.data.items || []);
            setTableId(res.data.order?.table_id || "1");

            let existingSplits = [];
            try {
                const raw = res.data.order?.payment_splits;
                if (raw) {
                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    existingSplits = Array.isArray(parsed) ? parsed : [];
                }
            } catch {
                existingSplits = [];
            }

            const status = res.data.order?.status?.toLowerCase();

            // ✅ FINAL STATES FIRST (IMPORTANT)
            if (status === "paid") {
                setStep("receipt");
                return;
            }

            if (status === "rejected") {
                setStep("rejected");
                return;
            }

            if (isScanner) {
                const newId = Date.now();
                myPayerIdRef.current = newId;

                const myRow = {
                    id: newId,
                    name: "",
                    amount: 0,
                    method: "cash",
                    ownerId: myUserId.current
                };

                const merged = [...existingSplits, myRow];
                setPayers(merged);
                syncPayersToBackend(merged);

                setStep("payment");
                return;
            }

            // ✅ ONLY fallback state
            if (["accepted", "preparing", "ready", "served", "paymentpending"].includes(status)) {
                setStep("payment");
            }

            // default fallback
            if (existingSplits.length > 0) {
                const safeSplits = existingSplits.map(p => ({
                    ...p,
                    ownerId: p.ownerId || "legacy"
                }));
                setPayers(safeSplits);
            } else {
                setPayers([{
                    id: 1,
                    name: "",
                    amount: 0,
                    method: "cash",
                    ownerId: myUserId.current
                }]);
            }

        })
        .catch(err => console.error(err));

},  [activeOrderId]);

    // ✅ STEP 2: Socket — join order room + listen for payer updates
    useEffect(() => {
        if (!activeOrderId) return;
        socket.emit("joinOrder", activeOrderId);

        socket.on("payersUpdated", (updated) => {
            if (!isEditingRef.current) {
                setPayers(updated);
            }
        });

        socket.on("cartUpdated", () => {
            axios.get(`https://snack-attack-backend.onrender.com/orders/${activeOrderId}`)
                .then(res => setOrderedItems(res.data.items || []));
        });

        return () => {
            socket.off("payersUpdated");
            socket.off("cartUpdated");
        };
    }, [activeOrderId]);

    // ✅ STEP 3: Polling — order status + payer sync fallback
    useEffect(() => {
        if (!activeOrderId) return;

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`https://snack-attack-backend.onrender.com/orders/${activeOrderId}`);
                const rawStatus = res.data.order?.status || "";
                    const status = (res.data.order?.status || "").trim().toLowerCase();
                       if (status === "paid" || ((step === "waitingForPayment" || step === "receipt") && ["accepted", "preparing", "ready", "served"].includes(status))) {
                            setStep("receipt");
                            return;
                        }
                        if (status === "rejected") {
                            setStep("rejected");
                            return;
                        }

                   // ✅ 2. Prevent falling back to payment eza 5alasna w wselna 3al receipt
                        if (step !== "waitingForPayment" && step !== "receipt" && status !== "paymentpending") {
                            if (status === "accepted" || status === "preparing" || status === "paymentpending") {
                                setStep("payment");
                            }
                        }
                    
                

                // Sync payers from backend only when not editing
                if (!isEditingRef.current) {
                    const raw = res.data.order?.payment_splits;
                    if (raw) {
                        try {
                            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setPayers(parsed);
                            }
                        } catch { /* keep current */ }
                    }
                }
            } catch { /* silent */ }
        }, 1500);

        return () => clearInterval(interval);
    },  [activeOrderId, step]);

    // ✅ Auto-fill amount for single payer
    useEffect(() => {
        if (payers.length === 1 && finalTotal > 0) {
            setPayers(p => [{ ...p[0], amount: parseFloat(finalTotal.toFixed(2)) }]);
        }
    }, [finalTotal]);

    // ✅ Payer handlers
    const addPayer = () => {
        const updated = [...payers, { id: Date.now(), name: "", amount: 0, method: 'cash', ownerId: myUserId.current }];
        setPayers(updated);
        syncPayersToBackend(updated);
    };

    const updatePayer = (id, field, value) => {
        isEditingRef.current = true;
        const updated = payers.map((p) => (p.id === id ? { ...p, [field]: value } : p));
        setPayers(updated);
        clearTimeout(window._payerSyncTimeout);
        window._payerSyncTimeout = setTimeout(() => {
            syncPayersToBackend(updated);
            isEditingRef.current = false;
        }, 800);
    };

    // ✅ FIX #2: Better delete validation - prevent deleting own last row (scanners)
    const removePayer = (payer) => {
        const isMine = payer.ownerId === myUserId.current;
        
        // Rule 1: Can only delete your own rows
        if (!isMine) return;

        // Rule 2: Cannot delete if it's your only row (prevent empty submission)
        const myRows = payers.filter(p => p.ownerId === myUserId.current);
        if (myRows.length <= 1) return;

        // Safe to delete
        const updated = payers.filter((p) => p.id !== payer.id);
        setPayers(updated);
        syncPayersToBackend(updated);
    };

    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put(`https://snack-attack-backend.onrender.com/admin/orders/${activeOrderId}/status`, {
                status: "PaymentPending",
                payment_splits: payers,
                replace_splits: true
            });
            lockedRef.current = false;
            setStep("waitingForPayment");
            } catch {
            alert("Error confirming payment!");
            } finally {
            setLoading(false);
            }
    };

    // ============================================================
    // RENDER
    // ============================================================

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
                                <p style={{ color: '#606060', marginBottom: '15px' }}>
                                    Order #{activeOrderId} | Table #{tableId}
                                </p>

                                <div className="checkout-section group-split-box">

                                    {isScanner ? (
                                        <>
                                            <p style={{ color: '#FFC20E', fontWeight: 'bold', marginBottom: '8px' }}>
                                                👤 Your Share
                                            </p>

                                            {payers
                                                .filter(p => p.id === myPayerIdRef.current)
                                                .map((payer) => (
                                                    <div
                                                        key={payer.id}
                                                        className="payer-row-checkout"
                                                        style={{
                                                            border: '1px solid #FFC20E',
                                                            borderRadius: '8px',
                                                            padding: '6px',
                                                            marginBottom: '10px'
                                                        }}
                                                    >
                                                        <input
                                                            type="text"
                                                            placeholder="Your Name *"
                                                            className="glass-input-small"
                                                            style={{ width: '100px' }}
                                                            value={payer.name || ""}
                                                            onChange={(e) =>
                                                                updatePayer(payer.id, 'name', e.target.value)
                                                            }
                                                            autoFocus
                                                        />

                                                        <input
                                                            type="number"
                                                            placeholder="Amount"
                                                            className="glass-input-small"
                                                            value={payer.amount || ""}
                                                            onChange={(e) =>
                                                                updatePayer(payer.id, 'amount', e.target.value)
                                                            }
                                                        />

                                                        <select
                                                            className="glass-select"
                                                            value={payer.method}
                                                            onChange={(e) =>
                                                                updatePayer(payer.id, 'method', e.target.value)
                                                            }
                                                        >
                                                            <option value="cash">💵 Cash</option>
                                                            <option value="card">💳 Card</option>
                                                        </select>
                                                    </div>
                                                ))}

                                            {payers.filter(p => p.id !== myPayerIdRef.current).length > 0 && (
                                                <>
                                                    <p style={{ color: '#595858', fontSize: '0.9rem', marginTop: '8px', marginBottom: '4px' }}>
                                                        Others at this table:
                                                    </p>

                                                    {payers
                                                        .filter(p => p.id !== myPayerIdRef.current)
                                                        .map((payer, i) => (
                                                            <div
                                                                key={payer.id}
                                                                className="payer-row-checkout"
                                                                style={{ opacity: 0.6 }}
                                                            >
                                                                <span className="glass-input-small" style={{ width: '100px', display: 'inline-block', padding: '6px', color: '#222' }}>
                                                                    {payer.name || `Person ${i + 1}`}
                                                                </span>

                                                                <span className="glass-input-small" style={{ display: 'inline-block', padding: '6px', color: '#222' }}>
                                                                    ${Number(payer.amount || 0).toFixed(2)}
                                                                </span>

                                                                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>
                                                                    {payer.method === 'cash' ? '💵' : '💳'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {payers.map((payer) => {
                                                const isMine = payer.ownerId === myUserId.current;
                                                const myRowsCount = payers.filter(p => p.ownerId === myUserId.current).length;

                                                return (
                                                    <div key={payer.id} className="payer-row-checkout">

                                                        <input
                                                            type="text"
                                                            placeholder="Name *"
                                                            className="glass-input-small"
                                                            style={{ width: '80px' }}
                                                            value={payer.name || ""}
                                                            disabled={!isMine}
                                                            onChange={(e) =>
                                                                updatePayer(payer.id, 'name', e.target.value)
                                                            }
                                                        />

                                                        {payer.method === 'card' && (
                                                            <input
                                                                type="tel"
                                                                placeholder="Phone *"
                                                                className="glass-input-small"
                                                                style={{ width: '80px' }}
                                                                value={payer.phone || ""}
                                                                disabled={!isMine}
                                                                onChange={(e) =>
                                                                    updatePayer(payer.id, 'phone', e.target.value)
                                                                }
                                                            />
                                                        )}

                                                        <input
                                                            type="number"
                                                            value={payer.amount}
                                                            className="glass-input-small"
                                                            disabled={!isMine}
                                                            onChange={(e) =>
                                                                updatePayer(payer.id, 'amount', e.target.value)
                                                            }
                                                        />

                                                        <select
                                                            className="glass-select"
                                                            value={payer.method}
                                                            disabled={!isMine}
                                                            onChange={(e) =>
                                                                updatePayer(payer.id, 'method', e.target.value)
                                                            }
                                                        >
                                                            <option value="cash">💵 Cash</option>
                                                            <option value="card">💳 Card</option>
                                                        </select>

                                                        {isMine && myRowsCount > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removePayer(payer)}
                                                                style={{
                                                                    color: '#ff4d4d',
                                                                    border: 'none',
                                                                    background: 'transparent'
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}

                                                    </div>
                                                );
                                            })}

                                            {!isScanner && (
                                                <button
                                                    type="button"
                                                    className="add-payer-btn-glass"
                                                    onClick={() => setShowQR(true)}
                                                    style={{
                                                        width: '100%',
                                                        marginTop: '10px',
                                                        background: '#FFC20E',
                                                        color: '#000',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Scan to split payment 📲
                                                </button>
                                            )}

                                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                                <button
                                                    type="button"
                                                    className="add-payer-btn-glass"
                                                    onClick={() => navigate(`/cart/${activeOrderId}`)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid #FFC20E',
                                                        color: '#FFC20E'
                                                    }}
                                                >
                                                    ✏️ Edit Order
                                                </button>
                                            </div>
                                        </>
                                    )}

                                </div>

                                <form onSubmit={handleConfirmPayment}>
                                    <div className="checkout-summary-mini-glass">
                                        <div className="summary-row">
                                            <span>Total Bill:</span>
                                            <span>${finalTotal.toFixed(2)}</span>
                                        </div>

                                        <div
                                            className="summary-row"
                                            style={{ color: remainingBalance > 0 ? '#d90d0d' : '#95b508' }}
                                        >
                                            <span>Remaining:</span>
                                            <span>${remainingBalance.toFixed(2)}</span>
                                        </div>
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
                    </div>

                </div>
            </div>
        );
    }
   if (step === "receipt") {
        return (
            <div className="checkout-page">
               
                <div className="overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh', overflowY: 'auto' }}>
                    
                    
                    <div className="receipt-paper" style={{ maxWidth: '420px', width: '85%', margin: '0 auto' }}>
                        <img src={logo} alt="Logo" className="receipt-logo-bw" />
                        <div className="receipt-branch-info">
                            <h1>Snack Attack</h1>
                            <h3>Hamra - Bliss Street</h3>
                            <p>Tel: 03 231 506</p>
                        </div>
                        <div className="receipt-header-info">
                            <p><strong>Order #:</strong> {activeOrderId}</p>
                            <p><strong>Table:</strong> #{tableId}</p>
                            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="receipt-divider">-------------------------------------------</div>
                        <div className="receipt-items">
                            {orderedItems.map((item, index) => (
                                <div key={index} className="r-item-container">
                                    <div className="r-item-row">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>${(getItemBasePrice(item) * item.quantity).toFixed(2)}</span>
                                    </div>
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

                    {/* ✅ El Text w el Button ta7t el wara2a msh 7adda */}
                    <div style={{ textAlign: 'center', width: '100%', maxWidth: '420px' }}>
                        <h2 style={{ color: '#fff', fontSize: '32px', fontWeight: '900', textShadow: '0px 4px 15px rgba(0,0,0,0.6)', marginBottom: '20px' }}>
                            ✅ PAID! ENJOY!
                        </h2>
                        <button className="back-btn-new" onClick={() => window.location.href = '/'}>
                            New Order
                        </button>
                    </div>

                </div>
            </div>
        );
    }

    if (step === "rejected") {
        return (
            <div className="checkout-page">
                <div className="overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <div className="info-form-card glass-effect" style={{ padding: '50px' }}>
                        <h2>❌ ORDER REJECTED</h2>
                        <button onClick={() => window.location.href = '/'}>Go Back</button>
                    </div>
                </div>
            </div>
        );
    }

}


export default Checkout;
