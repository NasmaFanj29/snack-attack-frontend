import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";

import logo from "../assets/logo.png";
import "../style/checkout.css";

import socket from "../socket";
import useTheme from "../hooks/useTheme";
import PaymentGateway from "../components/PaymentGateway";

const BACKEND = "https://snack-attack-backend.onrender.com";
const WHISH_NUMBER = "+961 XX XXX XXX";
const EXCHANGE_RATE = 89500;

const generateWhishCode = () =>
  Math.floor(100 + Math.random() * 900).toString();

/* ───────────────────────────────────────────────────────────── */
/* EDIT ITEM MODAL */
/* ───────────────────────────────────────────────────────────── */

function EditItemModal({ item, onClose, onSave }) {
  const [selectedExtras, setSelectedExtras] = useState(
    Array.isArray(item.selectedExtras)
      ? item.selectedExtras
      : item.selected_extras || []
  );

  const [pendingNote, setPendingNote] = useState(
    item.specialNote || item.special_note || ""
  );

  const [pendingRemoved, setPendingRemoved] = useState(
    Array.isArray(item.removedExtras) ? item.removedExtras : []
  );

  const [itemExtras, setItemExtras] = useState([]);
  const [removableExtras, setRemovableExtras] = useState([]);
  const [subView, setSubView] = useState("main");

  const REMOVE_IDS = {
    Burgers: [
      1, 2, 3, 4, 5, 8, 9, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24, 25, 26, 27, 29, 31, 32, 35, 36, 37,
    ],
    Salad: [
      1, 7, 10, 11, 12, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37,
    ],
    Sandwiches: [
      1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 35, 36, 37,
    ],
  };

  useEffect(() => {
    if (!item.id && !item.item_id && !item.databaseId) return;

    const id = item.databaseId || item.item_id || item.id;

    axios
      .get(`${BACKEND}/item-extras/${id}`)
      .then((res) => {
        const all = res.data || [];
        setItemExtras(all);

        const ids = REMOVE_IDS[item.category] || [];
        setRemovableExtras(all.filter((e) => ids.includes(e.id)));
      })
      .catch(() => {
        setItemExtras([]);
        setRemovableExtras([]);
      });
  }, []);

  const toggleExtra = (extra) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const toggleRemove = (extra) => {
    setPendingRemoved((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const modalPrice =
    Number(item.price || 0) +
    selectedExtras.reduce((s, e) => s + Number(e.price || 0), 0);

  const handleSave = () => {
    onSave({
      ...item,
      selectedExtras,
      removedExtras: pendingRemoved,
      specialNote: pendingNote || null,
    });
  };

  /* NOTE VIEW */

  if (subView === "note") {
    return (
      <div className="modal-overlay" onClick={() => setSubView("main")}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button
            className="close-modal"
            onClick={() => setSubView("main")}
          >
            ×
          </button>

          <div className="modal-header">
            <h2>Special Instructions</h2>
            <p style={{ color: "#666", fontSize: "14px" }}>
              For {item.name}
            </p>
          </div>

          <div className="modal-scroll-area">
            <textarea
              className="notes-textarea"
              placeholder="e.g. No onions..."
              rows="5"
              value={pendingNote}
              onChange={(e) => setPendingNote(e.target.value)}
            />
          </div>

          <div
            className="modal-footer"
            style={{ display: "flex", gap: "8px" }}
          >
            <button
              className="add-btn-final"
              style={{
                background: "var(--surface-3)",
                color: "var(--text-muted)",
                flex: "0 0 auto",
                width: "auto",
                padding: "16px 20px",
              }}
              onClick={() => setSubView("main")}
            >
              ← Back
            </button>

            <button
              className="add-btn-final"
              onClick={() => setSubView("main")}
              disabled={!pendingNote.trim()}
            >
              Save Note ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* REMOVE VIEW */

  if (subView === "remove") {
    return (
      <div className="modal-overlay" onClick={() => setSubView("main")}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button
            className="close-modal"
            onClick={() => setSubView("main")}
          >
            ×
          </button>

          <div className="modal-header">
            <h2>Remove Ingredients</h2>

            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              from {item.name}
            </p>
          </div>

          <div className="modal-scroll-area">
            {removableExtras.length > 0 ? (
              <div className="extras-section">
                <div className="extra-group">
                  {removableExtras.map((extra) => (
                    <label key={extra.id} className="extra-label">
                      <div className="extra-info">
                        <input
                          type="checkbox"
                          checked={pendingRemoved.some(
                            (e) => e.id === extra.id
                          )}
                          onChange={() => toggleRemove(extra)}
                        />
                        <span>{extra.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p
                style={{
                  textAlign: "center",
                  color: "#999",
                  padding: "20px",
                }}
              >
                No removable ingredients
              </p>
            )}
          </div>

          <div
            className="modal-footer"
            style={{ display: "flex", gap: "8px" }}
          >
            <button
              className="add-btn-final"
              style={{
                background: "var(--surface-3)",
                color: "var(--text-muted)",
                flex: "0 0 auto",
                width: "auto",
                padding: "16px 20px",
              }}
              onClick={() => setSubView("main")}
            >
              ← Back
            </button>

            <button
              className="add-btn-final"
              onClick={() => setSubView("main")}
              disabled={pendingRemoved.length === 0}
              style={{
                backgroundColor:
                  pendingRemoved.length > 0
                    ? "#d90d0d"
                    : "var(--surface-3)",
                color:
                  pendingRemoved.length > 0
                    ? "#fff"
                    : "var(--text-muted)",
              }}
            >
              Confirm Remove ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* MAIN VIEW */

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          ×
        </button>

        <div className="modal-header">
          {item.image && (
            <img
              src={`${BACKEND}/images/${item.image}`}
              alt={item.name}
            />
          )}

          <h2>{item.name}</h2>

          {item.description && <p>{item.description}</p>}
        </div>

        <div className="modal-actions">
          <button
            className="menu-action-btn notes-btn"
            onClick={() => setSubView("note")}
          >
            📝 {pendingNote ? "Edit Note" : "Add Note"}
          </button>

          {!["Beverages", "Appetizers", "Dips"].includes(
            item.category
          ) && (
            <button
              className="menu-action-btn remove-btn"
              onClick={() => setSubView("remove")}
            >
              ✕{" "}
              {pendingRemoved.length > 0
                ? "Edit Remove"
                : "Remove Ingredients"}
            </button>
          )}
        </div>

        <div className="modal-scroll-area">
          {itemExtras.length > 0 && (
            <div className="extras-section">
              <h3>Customize Your Order</h3>

              <div className="extra-group">
                <div className="extra-group-title">Add Extras</div>

                {itemExtras.map((extra) => (
                  <label key={extra.id} className="extra-label">
                    <div className="extra-info">
                      <input
                        type="checkbox"
                        checked={selectedExtras.some(
                          (e) => e.id === extra.id
                        )}
                        onChange={() => toggleExtra(extra)}
                      />

                      <span>{extra.name}</span>
                    </div>

                    <span className="extra-price">
                      +${Number(extra.price).toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="add-btn-final" onClick={handleSave}>
            Save Changes — ${modalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* CHECKOUT */
/* ───────────────────────────────────────────────────────────── */

function Checkout({ setCart }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlOrderId = searchParams.get("orderId");

  const {
    orderId: stateOrderId,
    cartItems: stateCartItems = [],
    tableId: stateTableId = "1",
  } = location.state || {};

  const activeOrderId = stateOrderId || urlOrderId;

  const isScanner =
    !!(urlOrderId && searchParams.get("mode") === "add");

  const { isDark } = useTheme();

  const [orderedItems, setOrderedItems] =
    useState(stateCartItems);

  const [tableId, setTableId] = useState(stateTableId);

  const [step, setStep] = useState("waiting");

  const [payers, setPayers] = useState([]);

  const [showQR, setShowQR] = useState(false);

  const [loading, setLoading] = useState(false);

  const [txIdSubmitted, setTxIdSubmitted] =
    useState(false);

  const [liveCount, setLiveCount] = useState(1);

  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] =
    useState(null);

  /* CARD GATEWAY */

  const [showCardGateway, setShowCardGateway] =
    useState(false);

  const [activeCardPayer, setActiveCardPayer] =
    useState(null);

  const myPayerIdRef = useRef(null);

  const ignoreUpdatesUntil = useRef(0);

  const syncTimerRef = useRef(null);

  const cartClearedRef = useRef(false);

  const myUserId = useRef(
    localStorage.getItem("userId")
  );

  if (!myUserId.current) {
    myUserId.current = Date.now().toString();
    localStorage.setItem("userId", myUserId.current);
  }

  const subtotal = (orderedItems || []).reduce(
    (acc, item) =>
      acc +
      Number(item.price || item.price_at_time || 0) *
        (item.quantity || 1),
    0
  );

  const totalVAT = subtotal * 0.11;
const [serverTotal, setServerTotal] = useState(0);
  const finalTotal = serverTotal > 0 ? serverTotal : subtotal + totalVAT;

  const qrValue = `${window.location.origin}/checkout?orderId=${activeOrderId}&mode=add`;

  const isEditing = () =>
    Date.now() < ignoreUpdatesUntil.current;

  /* ───────────────────────────────────────── */

  function getPayerUsdTotal(payer) {
    if (payer.method === "card") {
      return Number(payer.amount) || 0;
    }

    let total = 0;

    const first = Number(payer.amount) || 0;

    const second =
      Number(payer.cashSecondAmount) || 0;

    const secondCurrency =
      payer.currency === "USD" ? "LBP" : "USD";

    total +=
      payer.currency === "USD"
        ? first
        : first / EXCHANGE_RATE;

    if (payer.cashHasSplit) {
      total +=
        secondCurrency === "USD"
          ? second
          : second / EXCHANGE_RATE;
    }

    return total;
  }

  const totalPaidSoFar = payers.reduce(
    (acc, p) => acc + getPayerUsdTotal(p),
    0
  );

  const remainingBalance =
    finalTotal - totalPaidSoFar;

  /* ───────────────────────────────────────── */

  const defaultPayer = (id) => ({
    id: id || Date.now(),
    name: "",
    phone: "",
    amount: 0,

    method: "cash",

    currency: "USD",

    cashHasSplit: false,

    cashSecondAmount: 0,

    whishCode: null,

    whishConfirmed: false,

    transactionId: "",

    txIdRequested: false,

    ownerId: myUserId.current,

    paid: false,
  });

  /* ───────────────────────────────────────── */

  const syncPayersToBackend = async (
    updatedPayers
  ) => {
    if (!activeOrderId) return;

    try {
      await axios.put(
        `${BACKEND}/admin/orders/${activeOrderId}/status`,
        {
          payment_splits: updatedPayers,
          replace_splits: true,
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  /* ───────────────────────────────────────── */

  const handleSaveEditedItem = async (
    updatedItem
  ) => {
    const newItems = orderedItems.map((it, idx) =>
      idx === editingIndex
        ? { ...it, ...updatedItem }
        : it
    );

    setOrderedItems(newItems);

    setEditingItem(null);
    setEditingIndex(null);

    try {
      await axios.put(
        `${BACKEND}/admin/orders/${activeOrderId}/status`,
        {
          items: newItems,
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  /* ───────────────────────────────────────── */

  useEffect(() => {
    if (!activeOrderId) return;

    axios
      .get(`${BACKEND}/orders/${activeOrderId}`)
      .then((res) => {
        setOrderedItems(res.data.items || []);

        setTableId(
          res.data.order?.table_id || "1"
        );
setServerTotal(Number(res.data.order?.total_price || 0));
        let existingSplits = [];

        try {
          const raw =
            res.data.order?.payment_splits;

          if (raw) {
            const parsed =
              typeof raw === "string"
                ? JSON.parse(raw)
                : raw;

            existingSplits = Array.isArray(parsed)
              ? parsed
              : [];
          }
        } catch {
          existingSplits = [];
        }

        const status = (
          res.data.order?.status || ""
        )
          .trim()
          .toLowerCase();

        if (status === "paid") {
          setStep("receipt");
          return;
        }

        if (
          [
            "accepted",
            "preparing",
            "ready",
            "served",
          ].includes(status)
        ) {
          setStep("payment");
        }

        if (existingSplits.length > 0) {
          setPayers(existingSplits);
        } else {
          setPayers([defaultPayer(1)]);
        }
      })
      .catch(console.error);
  }, [activeOrderId]);

  /* ───────────────────────────────────────── */

  useEffect(() => {
    if (!activeOrderId) return;

    socket.emit("joinOrder", activeOrderId);

    socket.on("cartUpdated", () => {
      axios
        .get(`${BACKEND}/orders/${activeOrderId}`)
        .then((res) =>
          setOrderedItems(res.data.items || [])
        )
        .catch(() => {});
    });

    socket.on("presenceUpdate", ({ count }) => {
      setLiveCount(count);
    });

    return () => {
      socket.off("cartUpdated");
      socket.off("presenceUpdate");
    };
  }, [activeOrderId]);

  /* ───────────────────────────────────────── */

  const updatePayer = (id, field, value) => {
    ignoreUpdatesUntil.current =
      Date.now() + 2500;

    setPayers((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== id) return p;

        const next = {
          ...p,
          [field]: value,
        };

        return next;
      });

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }

      syncTimerRef.current = setTimeout(() => {
        syncPayersToBackend(updated);
      }, 800);

      return updated;
    });
  };

  /* ───────────────────────────────────────── */

  const openCardGateway = (payer) => {
    setActiveCardPayer(payer);
    setShowCardGateway(true);
  };

  const handleCardPaymentSuccess = async (
    transactionRef
  ) => {
    if (!activeCardPayer) return;

    const updated = payers.map((p) =>
      p.id === activeCardPayer.id
        ? {
            ...p,
            whishConfirmed: true,
            transactionId: transactionRef,
            paid: true,
          }
        : p
    );

    setPayers(updated);

    try {
      await syncPayersToBackend(updated);
    } catch (err) {
      console.error(err);
    }

    setShowCardGateway(false);
    setActiveCardPayer(null);
  };

  /* ───────────────────────────────────────── */

  const handleConfirmPayment = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      await axios.put(
        `${BACKEND}/admin/orders/${activeOrderId}/status`,
        {
          status: "PaymentPending",
          payment_splits: payers,
          replace_splits: true,
        }
      );

      setStep("waitingForPayment");
    } catch {
      alert("Error confirming payment");
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────────────────────────────── */

  const renderMethodSelector = (
    payer,
    isMine
  ) => (
    <div className="method-btn-group">
      {[
        {
          id: "cash",
          label: "💵 Cash",
        },
        {
          id: "card",
          label: "💳 Card",
        },
      ].map((m) => (
        <button
          key={m.id}
          type="button"
          className={`method-btn ${
            payer.method === m.id ? "active" : ""
          }`}
          onClick={() =>
            isMine &&
            updatePayer(payer.id, "method", m.id)
          }
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  /* ───────────────────────────────────────── */

  const renderCashExtras = (
    payer,
    isMine
  ) => {
    return (
      <div className="cash-extras-wrapper">
        <div className="cash-amount-row">
          <input
            type="number"
            placeholder="0"
            className="glass-input-small cash-amount-input"
            value={payer.amount || ""}
            disabled={!isMine}
            onChange={(e) =>
              updatePayer(
                payer.id,
                "amount",
                e.target.value
              )
            }
          />

          <div className="cash-currency-toggle">
            {["USD", "LBP"].map((c) => (
              <button
                key={c}
                type="button"
                className={`cc-btn ${
                  payer.currency === c
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  isMine &&
                  updatePayer(
                    payer.id,
                    "currency",
                    c
                  )
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ───────────────────────────────────────── */
  /* CARD FLOW */
  /* ───────────────────────────────────────── */

  const renderTransferFlow = (
    payer,
    isMine
  ) => {
    return (
      <div
        style={{
          marginTop: "16px",
          background: "rgba(255,255,255,0.04)",
          border:
            "1px solid rgba(255,255,255,0.08)",
          borderRadius: "18px",
          padding: "18px",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <div
              style={{
                color: "#fff",
                fontWeight: "800",
                fontSize: "15px",
              }}
            >
              Credit / Debit Card
            </div>

            <div
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: "12px",
                marginTop: "2px",
              }}
            >
              Visa • Mastercard • AMEX
            </div>
          </div>

          <div
            style={{
              background:
                "rgba(255,194,14,0.12)",
              color: "#FFC20E",
              border:
                "1px solid rgba(255,194,14,0.25)",
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: "700",
            }}
          >
            SECURED
          </div>
        </div>

        {isMine && (
          <>
            <input
              type="number"
              placeholder="Enter amount"
              className="glass-input-main"
              style={{
                width: "100%",
                marginBottom: "14px",
              }}
              value={payer.amount || ""}
              onChange={(e) =>
                updatePayer(
                  payer.id,
                  "amount",
                  e.target.value
                )
              }
            />

            {!payer.paid ? (
              <button
                type="button"
                onClick={() =>
                  openCardGateway(payer)
                }
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "14px",
                  border: "none",
                  background:
                    "linear-gradient(135deg,#FFC20E 0%,#ff9f0a 100%)",
                  color: "#000",
                  fontWeight: "900",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  cursor: "pointer",
                }}
              >
                PAY NOW 💳
              </button>
            ) : (
              <div
                style={{
                  background:
                    "rgba(16,185,129,0.12)",
                  border:
                    "1px solid rgba(16,185,129,0.3)",
                  borderRadius: "14px",
                  padding: "14px",
                  textAlign: "center",
                  color: "#10b981",
                  fontWeight: "800",
                }}
              >
                ✓ PAYMENT COMPLETED
              </div>
            )}

            {payer.transactionId && (
              <div
                style={{
                  marginTop: "10px",
                  textAlign: "center",
                  color:
                    "rgba(255,255,255,0.45)",
                  fontSize: "11px",
                }}
              >
                Ref: {payer.transactionId}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  /* ───────────────────────────────────────── */

  const renderPayerCard = (payer) => {
    const isMine =
      payer.ownerId === myUserId.current;

    return (
      <div
        key={payer.id}
        className={`payer-card ${
          isMine ? "payer-mine" : "payer-others"
        }`}
      >
        <div
          className="payer-card-top"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "15px",
          }}
        >
          <input
            type="text"
            placeholder="Full Name"
            value={payer.name || ""}
            onChange={(e) =>
              updatePayer(
                payer.id,
                "name",
                e.target.value
              )
            }
            className="glass-input-main"
          />

          <input
            type="tel"
            placeholder="Phone Number"
            value={payer.phone || ""}
            onChange={(e) =>
              updatePayer(
                payer.id,
                "phone",
                e.target.value
              )
            }
            className="glass-input-main"
          />
        </div>

        {renderMethodSelector(payer, isMine)}

        {payer.method === "cash" &&
          renderCashExtras(payer, isMine)}

        {payer.method === "card" &&
          renderTransferFlow(payer, isMine)}
      </div>
    );
  };

  /* ───────────────────────────────────────── */

  if (
    step === "waiting" ||
    step === "waitingForPayment"
  ) {
    return (
      <div className="checkout-page">
        <div
          className="overlay"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            className="info-form-card glass-effect"
            style={{ padding: "50px" }}
          >
            <img
              src={logo}
              alt="Logo"
              width="160"
              style={{ marginBottom: "20px" }}
            />

            <h2>
              {step === "waiting"
                ? "KITCHEN IS COOKING 👨‍🍳"
                : "WAITING FOR ADMIN 💰"}
            </h2>

            <div className="loader-line"></div>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────── */
  /* PAYMENT */
  /* ───────────────────────────────────────── */

  if (step === "payment") {
    return (
      <div className="checkout-page">
        <div className="overlay">

          {/* CARD MODAL */}

          {showCardGateway &&
            activeCardPayer && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background:
                    "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(8px)",
                  zIndex: 99999,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "460px",
                    background: "#0f172a",
                    borderRadius: "28px",
                    padding: "26px",
                    border:
                      "1px solid rgba(255,255,255,0.08)",
                    boxShadow:
                      "0 20px 80px rgba(0,0,0,0.55)",
                  }}
                >
                  <PaymentGateway
                    amount={Number(
                      activeCardPayer.amount || 0
                    )}
                    orderId={activeOrderId}
                    onSuccess={
                      handleCardPaymentSuccess
                    }
                    onCancel={() => {
                      setShowCardGateway(false);
                      setActiveCardPayer(null);
                    }}
                  />
                </div>
              </div>
            )}

          {/* QR */}

          {showQR && (
            <div className="qr-popup-overlay">
              <div className="qr-popup-content slide-down">
                <QRCodeCanvas
                  value={qrValue}
                  size={200}
                />

                <button
                  onClick={() => setShowQR(false)}
                >
                  DONE
                </button>
              </div>
            </div>
          )}

          <div className="layout-wrapper">
            <div className="checkout-container">
              <div className="info-form-card glass-effect">

                <h2 className="checkout-title">
                  ✅ COMPLETE PAYMENT
                </h2>

                <p
                  style={{
                    color: "#aaa",
                    marginBottom: "15px",
                    fontSize: "14px",
                  }}
                >
                  Order #{activeOrderId} | Table #
                  {tableId}
                </p>

                <div className="checkout-section group-split-box">
                  {payers.map((payer) =>
                    renderPayerCard(payer)
                  )}

                  <div className="payer-actions-row">
                    <button
                      type="button"
                      className="add-payer-btn-glass qr-split-btn"
                      onClick={() =>
                        setShowQR(true)
                      }
                    >
                      Scan to split 📲
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleConfirmPayment}
                >
                  <div className="checkout-summary-mini-glass">

                    <div className="summary-row">
                      <span>Total Bill:</span>

                      <span>
                        ${finalTotal.toFixed(2)}
                      </span>
                    </div>

                    <div
                      className="summary-row"
                      style={{
                        color:
                          remainingBalance > 0.01
                            ? "#ff6b6b"
                            : "#95b508",
                      }}
                    >
                      <span>Remaining:</span>

                      <span>
                        $
                        {remainingBalance.toFixed(
                          2
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="place-order-btn-final"
                    disabled={loading}
                  >
                    {loading
                      ? "CONFIRMING..."
                      : "CONFIRM PAYMENT 💳"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────── */
  /* RECEIPT */
  /* ───────────────────────────────────────── */

  if (step === "receipt") {
    return (
      <div className="checkout-page">
        <div
          className="overlay"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: "120px",
            paddingBottom: "60px",
            minHeight: "100vh",
            overflowY: "auto",
          }}
        >
          <div
            className="receipt-paper"
            style={{
              maxWidth: "420px",
              width: "85%",
              margin: "0 auto",
            }}
          >
            <img
              src={logo}
              alt="Logo"
              className="receipt-logo-bw"
            />

            <div className="receipt-branch-info">
              <h1>Snack Attack</h1>

              <h3>Hamra - Bliss Street</h3>

              <p>Tel: 03 231 506</p>
            </div>

            <div className="receipt-divider"></div>

            <div className="receipt-summary">
              <div className="receipt-total-row">
                <span>TOTAL:</span>

                <span>
                  ${finalTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              width: "100%",
              maxWidth: "420px",
            }}
          >
            <h2
              style={{
                color: "#fff",
                fontSize: "32px",
                fontWeight: "900",
              }}
            >
              ✅ PAID! ENJOY!
            </h2>

            <button
              className="back-btn-new"
              onClick={() =>
                (window.location.href = "/")
              }
            >
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────── */
  /* REJECTED */
  /* ───────────────────────────────────────── */

  if (step === "rejected") {
    return (
      <div className="checkout-page">
        <div
          className="overlay"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            className="info-form-card glass-effect"
            style={{ padding: "50px" }}
          >
            <h2>❌ ORDER REJECTED</h2>

            <button
              onClick={() =>
                (window.location.href = "/")
              }
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Checkout;