import React, { useState, useRef, useEffect } from "react";
import "../style/chatbot.css";
import {
  getTableConversation, addMessage, setTableStatus,
  subscribeToChats, addCustomOrder
} from "./chatbotStore";

/* ================================================================
   AUTO-RESPONSE RULES
   Quick keyword matches handled locally — no API call needed.
   ================================================================ */
const AUTO_RULES = [
  {
    match: /\b(sa3at|hours|mta|meta|awkat|wa2t|open|close|closes|w2t|wa2et|working hours|bta7do|bteft7o|btefta7o|btsakro)\b/i,
    reply: "Mnefta7 kel yom mn l 11:00 AM lal 11:00 PM. Fik tcharrefna aw totlob ayya wa2et fiyoun!",
  },
  {
    match: /^(hi|hello|hey|marhaba|ahla|salam|3ammeh|3amo|kifak|kif|sup)\b/i,
    reply: "Ahla w sahla bi Snack Attack! Kif fina nse3dak l yom?",
  },
  {
    match: /\b(shukran|thank|thanks|merci|3anjad|cool|perfect|great|ysalmo|ok|okay)\b/i,
    reply: "Tekram 3aynak! 5abberni eza baddak shi tene.",
  },
  {
    match: /\b(bye|goodbye|yalla bye|tc|take care|ciao)\b/i,
    reply: "Yalla bye! Nshalla mneshoufak 2ariban bi Snack Attack.",
  },
  {
    match: /wifi|wi-fi|password|internet|net\b/i,
    reply: "fi kabse 3l yameen fo2 b2alba password el Wi-Fi",
  },
  {
    match: /\b(toilet|bathroom|restroom|wc|7ammam)\b/i,
    reply: "L 7ammam maojoud b ekher l mat3am, 3a yamin l counter.",
  },
  {
    match: /\b(sandwich|sandwiche|sandwij|sub sandwich|3ayez sandwich|bde sandwich|bade sandwich)\b/i,
    reply: "Ehh akid! Shu naw3 l khebez baddak — brioche bun, white bun, aw submarine bread?",
  },
];

/* Welcome message shown on first visit */
const welcome = {
  sender: "bot",
  text: "Welcome to Snack Attack! I’m ready to help you build your perfect burger, browse the menu, or assist with any questions. How can I help you today?",
};

/* ================================================================
   CHATBOT COMPONENT
   ================================================================ */
function Chatbot({ menuItems = [], addToCart }) {
  const tableId = String(localStorage.getItem("activeTable") || "1");

  const [isOpen,         setIsOpen]         = useState(false);
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [isLoading,      setIsLoading]      = useState(false);
  const [chatStatus,     setChatStatus]     = useState("bot");
  const [hasNewAdminMsg, setHasNewAdminMsg] = useState(false);

  const conversationHistory = useRef([]);
  const prevMsgCount        = useRef(0);
  const messagesEndRef      = useRef(null);
  const chatStatusRef       = useRef("bot"); // ref mirrors state for use inside async callbacks

  // Keep ref in sync with state
  useEffect(() => { chatStatusRef.current = chatStatus; }, [chatStatus]);

  /* ── Load saved conversation on mount ─────────────────────── */
  useEffect(() => {
    const conv = getTableConversation(tableId);

    if (conv.messages.length > 0) {
      setMessages(conv.messages);
      setChatStatus(conv.status || "bot");
      chatStatusRef.current = conv.status || "bot";

      // Rebuild conversation history for the AI
      conv.messages.forEach((msg) => {
        if (msg.sender === "user")
          conversationHistory.current.push({ role: "user",      content: msg.text });
        else if (msg.sender === "bot")
          conversationHistory.current.push({ role: "assistant", content: msg.text });
      });

      prevMsgCount.current = conv.messages.length;
    } else {
      setMessages([welcome]);
      addMessage(tableId, welcome);
    }
  }, [tableId]);

  /* ── Subscribe to real-time admin replies ─────────────────── */
  useEffect(() => {
    const unsub = subscribeToChats((conversations) => {
      const conv = conversations[tableId];
      if (!conv) return;

      setMessages([...conv.messages]);

      const newStatus = conv.status || "bot";
      setChatStatus(newStatus);
      chatStatusRef.current = newStatus;

      // Show notification dot when chat is closed and a new admin message arrives
      if (!isOpen && conv.messages.length > prevMsgCount.current) {
        const latest = conv.messages[conv.messages.length - 1];
        if (latest?.sender === "admin") setHasNewAdminMsg(true);
      }

      prevMsgCount.current = conv.messages.length;
    });

    return unsub;
  }, [tableId, isOpen]);

  // Clear notification dot when user opens the chat
  useEffect(() => { if (isOpen) setHasNewAdminMsg(false); }, [isOpen]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* ── Escalate conversation to a staff member ──────────────── */
  const escalateToAdmin = (reason) => {
    setTableStatus(tableId, "admin");
    setChatStatus("admin");
    chatStatusRef.current = "admin";

    const sysMsg = {
      sender: "system",
      text: `Staff has been notified and will be with you shortly — ${reason}`,
    };
    addMessage(tableId, sysMsg);
    setMessages((prev) => [...prev, sysMsg]);
  };

  /* ── Add a regular menu item to cart by name ──────────────── */
  const addItemToCartByName = (itemName) => {
    if (menuItems && menuItems.length > 0) {
      const found = menuItems.find(
        (m) =>
          m.name?.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(m.name?.toLowerCase())
      );
      if (found && addToCart) {
        addToCart({
          id:             found.id,
          databaseId:     found.id,
          name:           found.name,
          price:          Number(found.price),
          image:          found.image,
          quantity:       1,
          selectedExtras: [],
        });
        return true;
      }
    }

    // Fallback: broadcast a custom event for the cart to handle
    window.dispatchEvent(new CustomEvent("snackCartAddByName", { detail: { name: itemName } }));
    return true;
  };

 /* ── Build a custom burger cart item and add it ───────────── */
  const addCustomOrderToCart = (orderData) => {
    // Generate ID based on ingredients instead of time
    const ingredientsKey = `${orderData.bread}-${orderData.protein}-${orderData.cheese}-${orderData.veggies}-${orderData.sauce}`.replace(/\s+/g, '');
    const customId = `custom_${ingredientsKey}`;

    const customItem = {
      id: customId, // Now it's unique to the ingredients
      databaseId: null,
      name: `Custom Burger (${orderData.bread} bun, ${orderData.protein})`,
      price: orderData.price || 12.99,
      image: null,
      quantity: 1,
      selectedExtras: [
        orderData.bread && `Bread: ${orderData.bread}`,
        orderData.protein && `Protein: ${orderData.protein}`,
        orderData.cheese  && `Cheese: ${orderData.cheese}`,
        orderData.veggies && `Veggies: ${orderData.veggies}`,
        orderData.sauce   && `Sauce: ${orderData.sauce}`,
        orderData.notes   && `Note: ${orderData.notes}`,
      ].filter(Boolean),
      isCustom: true,
      customOrderData: orderData,
    };

    if (addToCart) addToCart(customItem);
    // ... rest of event dispatch
  };
  /* ── Check auto-rules before hitting the API ──────────────── */
  const checkAutoRules = (text) => {
    for (const rule of AUTO_RULES) {
      if (rule.match.test(text.trim())) return rule.reply;
    }
    return null;
  };

  /* ── Main send handler ────────────────────────────────────── */
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    setInput("");

    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    addMessage(tableId, userMsg);

    // When a staff member is active, just save the message — no AI reply
    if (chatStatusRef.current === "admin") return;

    // Try local auto-rules first (instant, no API cost)
    const autoReply = checkAutoRules(text);
    if (autoReply) {
      conversationHistory.current.push({ role: "user",      content: text });
      conversationHistory.current.push({ role: "assistant", content: autoReply });

      const botMsg = { sender: "bot", text: autoReply };
      setMessages((prev) => [...prev, botMsg]);
      addMessage(tableId, botMsg);
      return;
    }

    conversationHistory.current.push({ role: "user", content: text });
    setIsLoading(true);

    try {
      const res = await fetch("https://snack-attack-backend.onrender.com/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages:  conversationHistory.current,
          menuItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      let raw = data.reply;
      if (!raw) throw new Error("Empty response from backend");

      conversationHistory.current.push({ role: "assistant", content: raw });

      /* ── Handle CUSTOM_ORDER action ─────────────────────────── */
      if (raw.includes("CUSTOM_ORDER:")) {
        const match = raw.match(/CUSTOM_ORDER:(\{[\s\S]*?\})/);
        if (match) {
          try {
            const orderData = JSON.parse(match[1]);

            // Persist to store and add to cart
            addCustomOrder(tableId, orderData);
            addCustomOrderToCart(orderData);

            // Display the AI's confirmation text (summary box is part of it)
            const confirmText = raw.replace(/CUSTOM_ORDER:[\s\S]*/, "").trim();
            if (confirmText) {
              const confirmMsg = { sender: "bot", text: confirmText };
              setMessages((prev) => [...prev, confirmMsg]);
              addMessage(tableId, confirmMsg);
            }

            setIsLoading(false);
            return;
          } catch (e) {
            console.error("Failed to parse CUSTOM_ORDER JSON:", e);
          }
        }
        // Strip malformed action tag and fall through
        raw = raw.replace(/CUSTOM_ORDER:[\s\S]*/, "").trim();
      }

      /* ── Handle CART_ADD action ─────────────────────────────── */
      if (raw.includes("CART_ADD:")) {
        const itemName = raw.match(/CART_ADD:([^\n]+)/)?.[1]?.trim();
        if (itemName) addItemToCartByName(itemName);
        raw = raw.replace(/CART_ADD:[^\n]+/, "").trim();
      }

      // If admin took over while we were waiting, discard the AI reply
      if (chatStatusRef.current === "admin") { setIsLoading(false); return; }

      /* ── Handle NEED_ADMIN action ───────────────────────────── */
      if (raw.includes("NEED_ADMIN:")) {
        const reason = raw.match(/NEED_ADMIN:(\w+)/)?.[1] || "assistance";
        raw = raw.replace(/NEED_ADMIN:\w+/, "").trim();

        const reasonMap = {
          confused:  "Customer needs clarification",
          offensive: "Inappropriate language detected",
          complaint: "Food or service complaint",
          request:   "Customer requested staff assistance",
        };

        // Show the AI's message first, then escalate
        if (raw) {
          const botMsg = { sender: "bot", text: raw };
          setMessages((prev) => [...prev, botMsg]);
          addMessage(tableId, botMsg);
        }

        escalateToAdmin(reasonMap[reason] || reason);
        setIsLoading(false);
        return;
      }

      // Normal reply
      if (raw) {
        const botMsg = { sender: "bot", text: raw };
        setMessages((prev) => [...prev, botMsg]);
        addMessage(tableId, botMsg);
      }

    } catch (err) {
      console.error("Chat error:", err.message);
      const errMsg = {
        sender: "bot",
        text: "Something went wrong on our end. Please try again or ask a staff member for assistance.",
      };
      setMessages((prev) => [...prev, errMsg]);
      addMessage(tableId, errMsg);
    }

    setIsLoading(false);
  };

  const isAdminActive = chatStatus === "admin";
  // Note: .bot-message uses white-space: pre-wrap in CSS so the ┌─┐ summary box renders correctly

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <>
      {/* Floating chat button */}
      <button className="chat-bubble-btn" onClick={() => setIsOpen((o) => !o)}>
        {isOpen ? "✖" : "💬"}
        {(hasNewAdminMsg || (isAdminActive && !isOpen)) && (
          <span className="chat-bubble-dot" />
        )}
      </button>

      {isOpen && (
        <div className="chat-window glass-effect-chat">

          {/* Header */}
          <div className={`chat-header ${isAdminActive ? "chat-header--admin" : ""}`}>
            <div className="chat-header-inner">
              <h3>{isAdminActive ? "Staff Connected" : "Snack Assistant"}</h3>
              <span className="table-badge">Table {tableId}</span>
            </div>
          </div>

          {/* Message list */}
          <div className="chat-body">
            {messages.map((msg, i) => {
              // System notification (e.g. staff escalation)
              if (msg.sender === "system") {
                return (
                  <div key={i} className="system-message-row">
                    <span className="system-message">{msg.text}</span>
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className={`chat-message-wrapper ${
                    msg.sender === "user" ? "user-wrapper" : "bot-wrapper"
                  }`}
                >
                  {msg.sender === "admin" && (
                    <span className="admin-label">Staff</span>
                  )}
                  <div
                    className={`chat-message ${
                      msg.sender === "user"
                        ? "user-message"
                        : msg.sender === "admin"
                        ? "admin-message"
                        : "bot-message"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div className="chat-message-wrapper bot-wrapper">
                <div className="chat-message bot-message">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="chat-footer">
            <input
              className="chat-input"
              type="text"
              placeholder={
                isAdminActive
                  ? "A staff member will reply shortly..."
                  : "Ask me anything..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={isLoading}
            >
              ➤
            </button>
          </div>

        </div>
      )}
    </>
  );
}

export default Chatbot;