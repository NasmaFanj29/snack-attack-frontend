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

// ── Auto-response rules (no API call needed) ─────────────────────
// Chatbot.js - Update these arrays and variables

const AUTO_RULES = [
  {
    match: /\b(sa3at|hours|mta|meta|awkat|wa2t|open|close|closes|w2t| wa2et|working hours|bta7do|btft7o|btefta7o|btsakro)\b/i,
    reply: "Mnefta7 kel yom mn l 11:00 AM lal 11:00 PM. Fik tcharrefna aw totlob ayya wa2et fiyoun!",
  },
  {
    match: /^(hi|hello|hey|marhaba|ahla|salam|3ammeh|3amo|kifak|kif|sup)\b/i,
    reply: "Ahla w sahla bi Snack Attack! Kif fina nse3dak l yom?",
  },
  {
    match: /\b(shukran|thank|thanks|merci|3anjad|cool|perfect|great|ysalmo| ok | okay)\b/i,
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

// Inside your useEffect for loading the saved conversation:
const welcome = {
  sender: "bot",
  text: "Ahla w sahla bi Snack Attack! Ana hon la se3dak totlob, t2allef custom burger, aw jewbak 3a ayya sou2al. Shu 3abelak l yom?",
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
        text: "Welcome to Snack Attack! I am here to help you order, build a custom burger, or answer any questions. What can I do for you today?",
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
    const sysMsg = { sender: "system", text: `Staff has been notified and will be with you shortly — ${reason}` };
    addMessage(tableId, sysMsg);
    setMessages((prev) => [...prev, sysMsg]);
  };

  // ── Add item to cart by name ───────────────────────────────────
  const addItemToCartByName = (itemName) => {
    if (menuItems && menuItems.length > 0) {
      const found = menuItems.find(
        (m) =>
          m.name?.toLowerCase().includes(itemName.toLowerCase()) ||
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
        return true;
      }
    }
    window.dispatchEvent(new CustomEvent("snackCartAddByName", { detail: { name: itemName } }));
    return true;
  };

  // ── Add custom order to cart ───────────────────────────────────
  const addCustomOrderToCart = (orderData) => {
    const customItem = {
      id: `custom_${Date.now()}`,
      databaseId: null,
      name: `Custom Burger (${orderData.bread} bun, ${orderData.protein})`,
      price: orderData.price || 12.99,
      image: null,
      quantity: 1,
      selectedExtras: [
        orderData.cheese && `Cheese: ${orderData.cheese}`,
        orderData.veggies && `Veggies: ${orderData.veggies}`,
        orderData.sauce && `Sauce: ${orderData.sauce}`,
        orderData.notes && `Note: ${orderData.notes}`,
      ].filter(Boolean),
      isCustom: true,
      customOrderData: orderData,
    };

    if (addToCart) {
      addToCart(customItem);
    }

    window.dispatchEvent(new CustomEvent("snackCustomOrderAdded", {
      detail: { order: orderData, cartItem: customItem, tableId },
    }));
  };

  // ── Check auto-rules before calling API ───────────────────────
  const checkAutoRules = (text) => {
    for (const rule of AUTO_RULES) {
      if (rule.match.test(text.trim())) return rule.reply;
    }
    return null;
  };

  // ── Send message ───────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");

    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    addMessage(tableId, userMsg);

    // If admin is active, just save the message and wait
    if (chatStatusRef.current === "admin") return;

    // ── Auto-response check (no API needed) ──────────────────────
    const autoReply = checkAutoRules(text);
    if (autoReply) {
      conversationHistory.current.push({ role: "user", content: text });
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory.current,
          menuItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      let raw = data.reply;
      if (!raw) throw new Error("Empty response from backend");

      conversationHistory.current.push({ role: "assistant", content: raw });

      // ── Handle CUSTOM_ORDER ──────────────────────────────────
      if (raw.includes("CUSTOM_ORDER:")) {
        const match = raw.match(/CUSTOM_ORDER:(\{[\s\S]*?\})/);
        if (match) {
          try {
            const orderData = JSON.parse(match[1]);

            // Save to store
            addCustomOrder(tableId, orderData);

            // Add to cart immediately
            addCustomOrderToCart(orderData);

            const cleanText = raw.replace(/CUSTOM_ORDER:[\s\S]*/, "").trim();
            if (cleanText) {
              const botMsg = { sender: "bot", text: cleanText };
              setMessages((prev) => [...prev, botMsg]);
              addMessage(tableId, botMsg);
            }

            // Generate preview image
            const loadingMsg = { sender: "bot", text: "Generating your burger preview, please wait..." };
            setMessages((prev) => [...prev, loadingMsg]);

            const imageUrl = await generateMealImage(orderData);
            const imageMsg = {
              sender: "bot",
              text: "Here is your custom creation! It has been added to your cart.",
              image: imageUrl,
            };
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = imageMsg;
              return updated;
            });
            addMessage(tableId, imageMsg);

            setIsLoading(false);
            return;
          } catch (e) {
            console.error("Custom order parse error", e);
          }
        }
        raw = raw.replace(/CUSTOM_ORDER:[\s\S]*/, "").trim();
      }

      // ── Handle CART_ADD ──────────────────────────────────────
      if (raw.includes("CART_ADD:")) {
        const itemName = raw.match(/CART_ADD:([^\n]+)/)?.[1]?.trim();
        if (itemName) addItemToCartByName(itemName);
        raw = raw.replace(/CART_ADD:[^\n]+/, "").trim();
      }

      if (chatStatusRef.current === "admin") { setIsLoading(false); return; }

      // ── Handle NEED_ADMIN ────────────────────────────────────
      if (raw.includes("NEED_ADMIN:")) {
        const reason = raw.match(/NEED_ADMIN:(\w+)/)?.[1] || "assistance";
        raw = raw.replace(/NEED_ADMIN:\w+/, "").trim();
        const map = {
          confused: "Customer needs clarification",
          offensive: "Inappropriate language detected",
          complaint: "Food or service complaint",
          request: "Customer requested staff assistance",
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
              <h3>{isAdminActive ? "Staff Connected" : "Snack Assistant"}</h3>
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
                isAdminActive ? "A staff member will reply shortly..." : "Ask me anything..."
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
