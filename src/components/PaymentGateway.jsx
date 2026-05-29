import React, { useEffect, useState } from "react";
import { CardElement, useStripe, useElements, Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import paymentService from "../services/paymentService";

// Guard: loadStripe(undefined) returns null and silently breaks every payment.
// If the key isn't set the Elements wrapper receives null and shows a clear
// "Stripe not configured" message instead of failing silently.
const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
  : null;

function CheckoutForm({ amount, orderId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [intentError, setIntentError] = useState("");
  // FIX (Issue 11): replaces both alert() calls — card errors and "not ready"
  // guard both now render inline so they're styled, non-blocking, and work on
  // mobile WebViews where alert() can be suppressed entirely.
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    if (!orderId || !amount || Number(amount) <= 0) return;
    const payload = { orderId, timestamp: Date.now() };

    setClientSecret("");
    setIntentError("");
    setCardError("");

    paymentService
      .createPaymentIntent(payload)
      .then((res) => {
        if (res?.data?.success && res?.data?.clientSecret) setClientSecret(res.data.clientSecret);
        else setIntentError(res?.data?.error || "Could not initialize payment. Try again.");
      })
      .catch((err) => {
        console.error("API ERROR:", err);
        // Hide backend error details from customers
        let msg = err?.response?.data?.error || err.message || 'Payment setup failed';
        if (msg.includes('test')) {
          msg = 'Payment service temporarily unavailable. Please try again.';
        }
        setIntentError(msg);
      });
        }, [amount, orderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    // FIX (Issue 11): was alert("Payment is not ready yet...")
    if (!clientSecret) {
      setCardError("Payment is not ready yet. Please wait a moment.");
      return;
    }

    setLoading(true);
    setCardError("");

    const cardElement = elements.getElement(CardElement);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    // FIX (Issue 11): was alert(result.error.message)
    if (result.error) {
  // FIX (Issue 11b): Hide Stripe test mode messages from customers
  let errorMsg = result.error.message || 'Payment failed';
  
  // Replace technical/test mode messages with customer-friendly ones
  if (errorMsg.includes('test mode')) {
    errorMsg = 'Card declined. Please try another card.';
  } else if (errorMsg.includes('non test card')) {
    errorMsg = 'Card type not accepted. Please try another card.';
  } else if (errorMsg.includes('declined')) {
    errorMsg = 'Card was declined. Please check your details.';
  } else if (errorMsg.includes('invalid') || errorMsg.includes('incomplete')) {
    errorMsg = 'Invalid card information. Please check and try again.';
  }
  
  setCardError(errorMsg);
  setLoading(false);
  return;
}

    if (result.paymentIntent.status === "succeeded") {
      onSuccess(result.paymentIntent.id);
    }

    setLoading(false);
  };

  // Shared error banner style used for both intentError and cardError
  const errorBannerStyle = {
    background: "rgba(220,38,38,0.15)",
    border: "1px solid rgba(220,38,38,0.3)",
    borderRadius: "10px",
    padding: "12px",
    color: "#f87171",
    fontSize: "13px",
    marginBottom: "14px",
    textAlign: "center",
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ color: "#fff", marginBottom: "20px" }}>
        Pay ${Number(amount).toFixed(2)}
      </h2>

      {intentError && <div style={errorBannerStyle}>{intentError}</div>}

      {!clientSecret && !intentError && (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", textAlign: "center", marginBottom: "14px" }}>
          Initializing payment...
        </div>
      )}

      <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", marginBottom: "20px" }}>
        <CardElement />
      </div>

      {/* FIX (Issue 11): card / submit errors render here instead of alert() */}
      {cardError && <div style={errorBannerStyle}>{cardError}</div>}

      <button
        type="submit"
        disabled={!stripe || loading || !clientSecret}
        style={{
          width: "100%",
          padding: "14px",
          border: "none",
          borderRadius: "12px",
          background: !clientSecret ? "#555" : "#FFC20E",
          fontWeight: "800",
          cursor: !clientSecret ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {loading ? "PROCESSING..." : !clientSecret ? "LOADING..." : "PAY NOW"}
      </button>

      <button
        type="button"
        onClick={() => { onCancel(); }}
        style={{ width: "100%", marginTop: "10px", padding: "12px" }}
      >
        Cancel
      </button>
    </form>
  );
}

export default function PaymentGateway(props) {
  if (!stripePromise) {
    return (
      <div style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "10px", padding: "16px", color: "#f87171", textAlign: "center" }}>
        ⚠️ Stripe is not configured. Add REACT_APP_STRIPE_PUBLISHABLE_KEY to your environment variables.
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
}