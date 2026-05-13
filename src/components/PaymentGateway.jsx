import React, { useEffect, useState } from "react";
import { CardElement, useStripe, useElements, Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
const BACKEND = "https://snack-attack-backend.onrender.com";

function CheckoutForm({ amount, orderId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [intentError, setIntentError] = useState("");

  // ✅ Fix 1: only fetch if amount is valid, and re-fetch if amount changes
  useEffect(() => {
    if (!amount || Number(amount) <= 0) return;

    setClientSecret("");
    setIntentError("");

    axios
      .post(`${BACKEND}/create-payment-intent`, { amount: Number(amount), orderId })
      .then((res) => {
        if (res.data.clientSecret) {
          setClientSecret(res.data.clientSecret);
        } else {
          setIntentError("Could not initialize payment. Try again.");
        }
      })
      .catch((err) => {
        console.error(err);
        setIntentError("Payment setup failed. Check your connection.");
      });
  }, [amount, orderId]); // ✅ re-runs if amount/orderId changes

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Fix 2: guard against missing clientSecret
    if (!stripe || !elements) return;
    if (!clientSecret) {
      alert("Payment is not ready yet. Please wait a moment.");
      return;
    }

    setLoading(true);

    const cardElement = elements.getElement(CardElement);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (result.error) {
      alert(result.error.message);
      setLoading(false);
      return;
    }

    if (result.paymentIntent.status === "succeeded") {
      onSuccess(result.paymentIntent.id);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ color: "#fff", marginBottom: "20px" }}>
        Pay ${Number(amount).toFixed(2)}
      </h2>

      {/* ✅ Show error if intent creation failed */}
      {intentError && (
        <div style={{
          background: "rgba(220,38,38,0.15)",
          border: "1px solid rgba(220,38,38,0.3)",
          borderRadius: "10px",
          padding: "12px",
          color: "#f87171",
          fontSize: "13px",
          marginBottom: "14px",
          textAlign: "center",
        }}>
          {intentError}
        </div>
      )}

      {/* ✅ Show loading spinner while clientSecret is being fetched */}
      {!clientSecret && !intentError && (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", textAlign: "center", marginBottom: "14px" }}>
          Initializing payment...
        </div>
      )}

      <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", marginBottom: "20px" }}>
        <CardElement />
      </div>

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
        onClick={onCancel}
        style={{ width: "100%", marginTop: "10px", padding: "12px" }}
      >
        Cancel
      </button>
    </form>
  );
}

export default function PaymentGateway(props) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
}