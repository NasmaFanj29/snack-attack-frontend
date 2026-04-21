import React, { useState, useRef, useEffect } from "react";
import "../style/chatbot.css";
import {
  getTableConversation, addMessage, setTableStatus,
  subscribeToChats, addCustomOrder
} from "./chatbotStore";


// ── Image generation for custom orders ───────────────────────────
const generateMealImage = async (order) => {
  const desc = encodeURIComponent(
    `professional food photography, custom burger, ${order.bread} bun, ${order.protein}, ${order.cheese} cheese, ${order.veggies}, ${order.sauce} sauce, restaurant quality, bright lighting`
  );
  return `https://image.pollinations.ai/prompt/${desc}?width=280&height=280&nologo=true&seed=${Date.now()}`;
};

function Chatbot({ menuItems = [], addToCart }) {
  const tableId = String(localStorage.getItem("activeTable") || "1");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState("bot");
  const [hasNewAdminMsg, setHasNewAdminMsg] = useState(false);
  const conversationHistory = useRef([]);
  const prevMsgCount = useRef(0);
  const messagesEndRef = useRef(null);
  const chatStatusRef = useRef("bot");

  useEffect(() => { chatStatusRef.current = chatStatus; }, [chatStatus]);

  // ── Load saved conversation ────────────────────────────────────
  useEffect(() => {
    const conv = getTableConversation(tableId);
    if (conv.messages.length > 0) {
      setMessages(conv.messages);
      setChatStatus(conv.status || "bot");
      chatStatusRef.current = conv.status || "bot";
      conv.messages.forEach((msg) => {
        if (msg.sender === "user")
          conversationHistory.current.push({ role: "user", content: msg.text });
        else if (msg.sender === "bot")
          conversationHistory.current.push({ role: "assistant", content: msg.text });
      });
      prevMsgCount.current = conv.messages.length;
    } else {
      const welcome = {
        sender: "bot",
        text: "Hey! 👋🍔 Welcome to Snack Attack! Shu baddak today? Ana here — bde order, custom burger, or just want recommendations?",
      };
      setMessages([welcome]);
      addMessage(tableId, welcome);
    }
  }, [tableId]);

  // ── Listen for admin replies ───────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToChats((conversations) => {
      const conv = conversations[tableId];
      if (!conv) return;
      setMessages([...conv.messages]);
      setChatStatus(conv.status || "bot");
      chatStatusRef.current = conv.status || "bot";
      if (!isOpen && conv.messages.length > prevMsgCount.current) {
        const latest = conv.messages[conv.messages.length - 1];
        if (latest?.sender === "admin") setHasNewAdminMsg(true);
      }
      prevMsgCount.current = conv.messages.length;
    });
    return unsub;
  }, [tableId, isOpen]);

  useEffect(() => { if (isOpen) setHasNewAdminMsg(false); }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const escalateToAdmin = (reason) => {
    setTableStatus(tableId, "admin");
    setChatStatus("admin");
    chatStatusRef.current = "admin";
    const sysMsg = { sender: "system", text: `🔔 Staff requested — ${reason}` };
    addMessage(tableId, sysMsg);
    setMessages((prev) => [...prev, sysMsg]);
  };

  // ── Add item to cart by name ───────────────────────────────────
  const addItemToCartByName = (itemName) => {
  // Try to find in menuItems prop first
  if (menuItems && menuItems.length > 0) {
    const found = menuItems.find(
      (m) => m.name?.toLowerCase().includes(itemName.toLowerCase()) ||
             itemName.toLowerCase().includes(m.name?.toLowerCase())
    );
    if (found && addToCart) {
      addToCart({
        id: found.id,
        databaseId: found.id,
        name: found.name,
        price: Number(found.price),
        image: found.image,
        quantity: 1,
        selectedExtras: [],
      });
      console.log("✅ Added to cart:", found.name);
      return true;
    }
  }
  
  // If not found in menuItems, dispatch event for App.jsx to handle
  window.dispatchEvent(new CustomEvent("snackCartAddByName", { detail: { name: itemName } }));
  console.warn("⚠️ Item not found in menu, dispatched fallback event:", itemName);
  return true;
};

  // ── Send message ───────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");

    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    addMessage(tableId, userMsg);

    if (chatStatusRef.current === "admin") return;

    conversationHistory.current.push({ role: "user", content: text });
    setIsLoading(true);

    try {
      // ✅ FIX: Send conversationHistory.current directly (Backend handles the rest)
      const res = await fetch("https://snack-attack-backend.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory.current
        }),
      });

      const data = await res.json();
       if (!res.ok) {
         console.error("Backend Error:", data);
         throw new Error(data.error || "Server error");
      }
      let raw = data.reply;

      if (!raw) throw new Error("Empty response from backend");

      conversationHistory.current.push({ role: "assistant", content: raw });

      // ── Handle CUSTOM_ORDER ──────────────────────────────────
     // ── Handle CUSTOM_ORDER ──────────────────────────────────
      if (raw.includes("CUSTOM_ORDER:")) {
        const match = raw.match(/CUSTOM_ORDER:(\{[\s\S]*?\})/);
        if (match) {
          try {
            const orderData = JSON.parse(match[1]);
            addCustomOrder(tableId, orderData);
      
            const cleanText = raw.replace(/CUSTOM_ORDER:[\s\S]*/, "").trim();
            
            // 🛑 FIX: Only save if there's actual text left!
            if (cleanText) {
              const botMsg = { sender: "bot", text: cleanText };
              setMessages((prev) => [...prev, botMsg]);
              addMessage(tableId, botMsg);
            }
      
            // Generate preview image
            const loadingMsg = { sender: "bot", text: "🎨 Generating your burger preview..." };
            setMessages((prev) => [...prev, loadingMsg]);
            const imageUrl = await generateMealImage(orderData);
            const imageMsg = { sender: "bot", text: "Here's your custom creation! 🍔✨", image: imageUrl };
            setMessages((prev) => { const u = [...prev]; u[u.length - 1] = imageMsg; return u; });
            addMessage(tableId, imageMsg);
      
            // ✅ NOW ALSO ADD TO MAIN CART - this is critical!
            // Dispatch event so App.jsx knows to sync the custom order to cart
            window.dispatchEvent(new CustomEvent("snackCustomOrderAdded", { 
              detail: { order: orderData, tableId } 
            }));
      
            setIsLoading(false);
            return;
          } catch (e) { console.error("Custom order parse error", e); }
        }
        raw = raw.replace(/CUSTOM_ORDER:[\s\S]*/, "").trim();
      }

      // ── Handle CART_ADD ──────────────────────────────────────
      if (raw.includes("CART_ADD:")) {
        const itemName = raw.match(/CART_ADD:([^\n]+)/)?.[1]?.trim();
        if (itemName) {
          addItemToCartByName(itemName);
        }
        raw = raw.replace(/CART_ADD:[^\n]+/, "").trim();
      }

      if (chatStatusRef.current === "admin") { setIsLoading(false); return; }

      // ── Handle NEED_ADMIN ────────────────────────────────────
      if (raw.includes("NEED_ADMIN:")) {
        const reason = raw.match(/NEED_ADMIN:(\w+)/)?.[1] || "assistance";
        raw = raw.replace(/NEED_ADMIN:\w+/, "").trim();
        const map = {
          confused: "Customer needs clarification",
          offensive: "Inappropriate language",
          complaint: "Food/service complaint",
        };
       if (raw) {
        const botMsg = { sender: "bot", text: raw };
        setMessages((prev) => [...prev, botMsg]);
        addMessage(tableId, botMsg);
      }
        escalateToAdmin(map[reason] || reason);
        setIsLoading(false);
        return;
      }

      const botMsg = { sender: "bot", text: raw };
      setMessages((prev) => [...prev, botMsg]);
      addMessage(tableId, botMsg);

    } catch (err) {
      console.error("Gemini error:", err.message);
      const errMsg = {
        sender: "bot",
        text: "Sorry, sar fi mashekel z8eer! Try again 🍔",
      };
      setMessages((prev) => [...prev, errMsg]);
      addMessage(tableId, errMsg);
    }

    setIsLoading(false);
  };

  const isAdminActive = chatStatus === "admin";

  return (
    <>
      <button className="chat-bubble-btn" onClick={() => setIsOpen((o) => !o)}>
        {isOpen ? "✖" : "💬"}
        {(hasNewAdminMsg || (isAdminActive && !isOpen)) && (
          <span className="chat-bubble-dot" />
        )}
      </button>

      {isOpen && (
        <div className="chat-window glass-effect-chat">
          <div className={`chat-header ${isAdminActive ? "chat-header--admin" : ""}`}>
            <div className="chat-header-inner">
              <h3>{isAdminActive ? "👨‍💼 Staff Connected" : "🤖 Snack Assistant"}</h3>
              <span className="table-badge">Table {tableId}</span>
            </div>
          </div>

          <div className="chat-body">
            {messages.map((msg, i) => {
              if (msg.sender === "system")
                return (
                  <div key={i} className="system-message-row">
                    <span className="system-message">{msg.text}</span>
                  </div>
                );
              return (
                <div
                  key={i}
                  className={`chat-message-wrapper ${
                    msg.sender === "user" ? "user-wrapper" : "bot-wrapper"
                  }`}
                >
                  {msg.sender === "admin" && (
                    <span className="admin-label">👨‍💼 Staff</span>
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
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Custom meal"
                        className="chat-meal-image"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    )}
                  </div>
                </div>
              );
            })}

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

          <div className="chat-footer">
            <input
              className="chat-input"
              type="text"
              placeholder={
                isAdminActive ? "Staff will reply shortly…" : "Ask me anything…"
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
