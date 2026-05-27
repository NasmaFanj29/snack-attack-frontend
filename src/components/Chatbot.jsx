import React, { useState, useRef, useEffect } from "react";
import "../style/chatbot.css";
import {
  getTableConversation, addMessage, setTableStatus,
  subscribeToChats, addCustomOrder
} from "./chatbotStore";
import chatService from '../services/chatService';

/* ================================================================
   AUTO-RESPONSE RULES
   Quick keyword matches handled locally — no API call needed.
   ================================================================ */
const AUTO_RULES = [
  // ── General ──
  { match: /\b(sa3at|hours|mta|meta|awkat|wa2t|open|close|closes|w2t|wa2et|working hours|bta7do|bteft7o|btefta7o|btsakro)\b/i,
    reply: "Mnefta7 kel yom mn l 11:00 AM lal 11:00 PM. Fik tcharrefna aw totlob ayya wa2et fiyoun!" },
  { match: /^(hi|hello|hey|marhaba|ahla|salam|3ammeh|3amo|kifak|kif|sup)$/i,
    reply: "Hi, Welcome to Snack Attack! How can we help you today?" },
  { match: /\b(help|support|assist|mushkileh|mushkila)\b/i,
    reply: "Sure! You can ask me about our menu, place an order, or if you need anything else!" },
  { match: /\b(shukran|merci|ysalmo|thank you)\b/i,
    reply: "Tekram 3aynak! 5abberni eza baddak shi tene." },
  { match: /\b(bye|goodbye|yalla bye|tc|take care|ciao)\b/i,
    reply: "Yalla bye! Nshalla mneshoufak 2ariban bi Snack Attack." },
  { match: /wifi|wi-fi|password|internet/i,
    reply: "fi kabse 3l yameen fo2 b2alba password el Wi-Fi" },
  { match: /\b(toilet|bathroom|restroom|wc|7ammam)\b/i,
    reply: "L 7ammam maojoud b ekher l mat3am, 3a yamin l counter." },
  { match: /\b(recommend|what do you recommend|shu btensa7)\b/i,
    reply: "Bensa7ak tjarreb l Classic Burger, l Grilled Chicken Sandwich, aw l Chicken Strips — ktir taybeen!" },
  { match: /^(menu|shu 3andkon|what do you have|show menu|shu fi)$/i,
    reply: "3anna: Burgers, Sandwiches, Salads, Appetizers, Dips, w Beverages! Shu baddak?" },

  // ── Burgers — Categories ──
  { match: /\b(beef burger|beef burgers|shu 3andkon beef|what beef)\b/i,
    reply: "Beef burgers: Classic $7, Cheese $7.50, Mushroom Swiss $9, BBQ $7, Double Beef $9, w Mozzarella Beef $9!" },
  { match: /\b(chicken burger|chicken burgers|shu 3andkon chicken burger)\b/i,
    reply: "Chicken burgers: Grilled $7, Spicy $7, Club $7, Classic $6.50, BBQ $7, w Honey Mustard $7!" },

  // ── Burgers — Individual ──
  { match: /\b(classic burger)\b/i,
    reply: "Classic Burger $7 — Grilled Beef Patty, Melted Cheddar, Lettuce, Tomato, Dill Pickles, Classic Sauce, Toasted Brioche Bun!" },
  { match: /\b(cheese burger|cheeseburger)\b/i,
    reply: "Cheese Burger $7.50 — Juicy Beef Patty, Double Melted Cheddar, Lettuce, Tomato, Fresh Onions, Classic Sauce!" },
  { match: /\b(mushroom swiss|mushroom swiss burger)\b/i,
    reply: "Mushroom Swiss Burger $9 — Beef Patty, Swiss Cheese, Sautéed Mushrooms, Caramelized Onions, Creamy Mushroom Sauce!" },
  { match: /\b(bbq burger)\b/i,
    reply: "BBQ Burger $7 — Beef Patty, Cheddar, Crispy Beef Bacon, Fried Onion Rings, Smoky BBQ Sauce!" },
  { match: /\b(double beef|double beef burger)\b/i,
    reply: "Double Beef Burger $9 — Two Juicy Beef Patties, Double Cheddar, Lettuce, Tomato, Dill Pickles, Classic Sauce!" },
  { match: /\b(mozzarella beef|mozzarella beef burger)\b/i,
    reply: "Mozzarella Beef Burger $9 — Beef Patty, Fried Mozzarella Patty, Melted Cheese, Lettuce, Tomato, Classic Sauce!" },
  { match: /\b(grilled chicken burger)\b/i,
    reply: "Grilled Chicken Burger $7 — Grilled Chicken Breast, Swiss Cheese, Lettuce, Tomato, Dill Pickles, Garlic Mayo Sauce!" },
  { match: /\b(spicy chicken burger)\b/i,
    reply: "Spicy Chicken Burger $7 — Crispy Fried Chicken, Pepper Jack Cheese, Jalapeños, Lettuce, Spicy Mayo, Sriracha Sauce!" },
  { match: /\b(chicken club burger)\b/i,
    reply: "Chicken Club Burger $7 — Grilled Chicken Breast, Cheddar, Lettuce, Tomato, Dill Pickles, Garlic Mayo Sauce!" },
  { match: /\b(classic chicken burger)\b/i,
    reply: "Classic Chicken Burger $6.50 — Grilled Chicken Breast, Swiss Cheese, Lettuce, Tomato, Dill Pickles, Garlic Mayo Sauce!" },
  { match: /\b(bbq chicken burger)\b/i,
    reply: "BBQ Chicken Burger $7 — Grilled Chicken Breast, Cheddar, Lettuce, Fried Onion Rings, Smoky BBQ Sauce!" },
  { match: /\b(honey mustard chicken|honey mustard chicken burger)\b/i,
    reply: "Honey Mustard Chicken Burger $7 — Grilled Chicken Breast, Swiss Cheese, Lettuce, Tomato, Sweet & Tangy Honey Mustard Sauce!" },

  // ── Sandwiches — Category ──
  { match: /\b(sandwiches|shu 3andkon sandwiches|what sandwiches)\b/i,
    reply: "Sandwiches: Club $8, Grilled Chicken $9, Chicken Avocado $9, Tuna $9, BBQ Chicken $9, w Philly Chicken $9!" },
  { match: /\b(sandwich|sandwiche|sandwij|bde sandwich|bade sandwich)\b/i,
    reply: "Shu naw3 l khebez baddak — brioche bun, white bun, aw submarine bread?" },

  // ── Sandwiches — Individual ──
  { match: /\b(club sandwich)\b/i,
    reply: "Club Sandwich $8 — Submarine Roll, Grilled Chicken, Melted Cheese, Lettuce, Tomato, Dill Pickles, Garlic Mayo!" },
  { match: /\b(grilled chicken sandwich)\b/i,
    reply: "Grilled Chicken Sandwich $9 — Submarine Roll, Grilled Chicken, Swiss Cheese, Lettuce, Tomato, Dill Pickles, Garlic Mayo!" },
  { match: /\b(chicken avocado sandwich)\b/i,
    reply: "Chicken Avocado Sandwich $9 — Submarine Roll, Grilled Chicken, Fresh Avocado, Mozzarella, Lettuce, Tomato, Cilantro Lime Mayo!" },
  { match: /\b(tuna sandwich)\b/i,
    reply: "Tuna Sandwich $9 — Submarine Roll, Flaked Tuna, Corn, Shredded Carrots, Lettuce, Dill Pickles, Lemon Mayo!" },
  { match: /\b(bbq chicken sandwich)\b/i,
    reply: "BBQ Chicken Sandwich $9 — Submarine Roll, Grilled Chicken, Gouda Cheese, Lettuce, Fried Onion Rings, Smoky BBQ Sauce!" },
  { match: /\b(philly chicken|philly chicken sandwich)\b/i,
    reply: "Philly Chicken Sandwich $9 — Submarine Roll, Sautéed Chicken, Mushrooms, Bell Peppers, Onions, Provolone Cheese, Mayo!" },

  // ── Salads — Category ──
  { match: /\b(salads|shu 3andkon salad|what salads)\b/i,
    reply: "Salads: Caesar $7.50, Greek $7, Quinoa $7.50, Chicken Pasta $7, Tuna $7.30, w All Green $6!" },

  // ── Salads — Individual ──
  { match: /\b(caesar salad)\b/i,
    reply: "Caesar Salad $7.50 — Fresh Romaine, Shaved Parmesan, Herb Croutons, Creamy Caesar Dressing!" },
  { match: /\b(greek salad)\b/i,
    reply: "Greek Salad $7 — Romaine, Tomatoes, Cucumber, Kalamata Olives, Red Onions, Feta Cheese, Lemon Herb Dressing!" },
  { match: /\b(quinoa salad)\b/i,
    reply: "Quinoa Salad $7.50 — Organic Quinoa, Parsley, Tomatoes, Cucumber, Roasted Bell Peppers, Lemon Olive Oil Dressing!" },
  { match: /\b(chicken pasta salad)\b/i,
    reply: "Chicken Pasta Salad $7 — Fusilli Pasta, Grilled Chicken, Cherry Tomatoes, Corn, Bell Peppers, Creamy Herb Dressing!" },
  { match: /\b(tuna salad)\b/i,
    reply: "Tuna Salad $7.30 — Flaked Tuna, Romaine, Corn, Carrots, Cherry Tomatoes, Black Olives, Lemon Dijon Dressing!" },
  { match: /\b(all green salad)\b/i,
    reply: "All Green Salad $6 — Rocca, Romaine, Cucumber, Green Bell Peppers, Avocado, Edamame, Green Goddess Dressing!" },

  // ── Appetizers — Category ──
  { match: /\b(appetizers|starters|shu 3andkon appetizer|what appetizers)\b/i,
    reply: "Appetizers: French Fries $2, Curly Fries $3.50, Wedges $3.50, Chicken Strips $4.50, Wings $4.50, w Mozzarella Sticks $4!" },

  // ── Appetizers — Individual ──
  { match: /\b(french fries|fries)\b/i,
    reply: "French Fries $2 — Crispy Golden Fries, served with your choice of dipping sauce!" },
  { match: /\b(curly fries)\b/i,
    reply: "Curly Fries $3.50 — Seasoned Spiral-Cut Potatoes, fried to a golden crisp with dipping sauce!" },
  { match: /\b(wedges)\b/i,
    reply: "Wedges $3.50 — Thick-Cut Potato Wedges, herb-seasoned, oven-baked then fried, served with Sour Cream or Garlic Dip!" },
  { match: /\b(chicken strips)\b/i,
    reply: "Chicken Strips $4.50 — 4 crispy breaded chicken strips, served with Honey Mustard or BBQ sauce!" },
  { match: /\b(wings)\b/i,
    reply: "Wings $4.50 — 6 juicy wings tossed in Buffalo, Smoky BBQ, or Lemon Garlic sauce!" },
  { match: /\b(mozzarella sticks|mozzarella stick)\b/i,
    reply: "Mozzarella Sticks $4 — 4 golden breaded mozzarella sticks, served with Marinara sauce!" },

  // ── Dips ──
  { match: /\b(dips|shu 3andkon dips|what dips)\b/i,
    reply: "Dips: Mayo $0.50, Honey Mustard $0.70, Ranch $0.70, Pesto $0.70, Cheddar $0.70, Cocktail $0.70, Garlic Mayo $0.70, w Mayo Avocado $0.70!" },
  { match: /\b(mayo dip)\b/i,
    reply: "Mayo Dip $0.50 — Classic creamy mayo dip!" },
  { match: /\b(honey mustard dip)\b/i,
    reply: "Honey Mustard Dip $0.70 — Sweet and tangy honey mustard sauce!" },
  { match: /\b(ranch dip)\b/i,
    reply: "Ranch Dip $0.70 — Cool and creamy ranch dressing!" },
  { match: /\b(pesto dip)\b/i,
    reply: "Pesto Dip $0.70 — Fresh basil pesto sauce!" },
  { match: /\b(cheddar dip)\b/i,
    reply: "Cheddar Dip $0.70 — Warm melted cheddar cheese dip!" },
  { match: /\b(cocktail dip)\b/i,
    reply: "Cocktail Dip $0.70 — Tangy cocktail sauce!" },
  { match: /\b(garlic mayo dip)\b/i,
    reply: "Garlic Mayo Dip $0.70 — Creamy garlic mayo sauce!" },
  { match: /\b(mayo avocado dip)\b/i,
    reply: "Mayo Avocado Dip $0.70 — Creamy avocado mayo sauce!" },

  // ── Beverages ──
  { match: /\b(beverages|drinks|shu 3andkon drink|what drinks|shu 3andkon mashrob)\b/i,
    reply: "Beverages: Pepsi $0.80, Pepsi Diet $0.80, Pepsi Zero $0.80, 7Up $0.80, 7Up Diet $0.80, Mirinda $0.80, Sparkling Water $1.50, Iced Tea $2, Balkis $3, w Small Water $0.40!" },
  { match: /\b(pepsi diet)\b/i,
    reply: "Pepsi Diet $0.80 — Diet Pepsi, sugar free!" },
  { match: /\b(pepsi zero)\b/i,
    reply: "Pepsi Zero $0.80 — Zero sugar, zero calories!" },
  { match: /\b(7up diet)\b/i,
    reply: "7Up Diet $0.80 — Diet 7Up, sugar free!" },
  { match: /\b(sparkling water)\b/i,
    reply: "Sparkling Water $1.50 — Refreshing carbonated water!" },
  { match: /\b(balkis)\b/i,
    reply: "Balkis $3 — Lebanese natural juice!" },
  { match: /\b(iced tea)\b/i,
    reply: "Iced Tea $2 — Refreshing cold iced tea!" },
  { match: /\b(small water|water)\b/i,
    reply: "Small Water $0.40 — Chilled bottled water!" },

 
];
const checkMenuDescription = (text, menuItems) => {
  if (!menuItems || menuItems.length === 0) return null;
  const found = menuItems.find(item =>
    text.toLowerCase().includes(item.name.toLowerCase())
  );
  if (found && found.description) {
    return `${found.name} $${Number(found.price).toFixed(2)} — ${found.description}`;
  }
  return null;
};
/* Welcome message shown on first visit */
const welcome = {
  sender: "bot",
  text: "Welcome to Snack Attack! I’m ready to help you build your perfect burger, browse the menu, or assist with any questions. How can I help you today?",
};

/* ================================================================
   CHATBOT COMPONENT
   ================================================================ */
function Chatbot({ menuItems = [], extras = [], addToCart }) {
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
        // ✅ احفظ الـ history
        try {
          localStorage.setItem(`chatHistory_${tableId}`, JSON.stringify(conversationHistory.current.slice(-20)));
        } catch(e) {}

        prevMsgCount.current = conv.messages.length;
      });
        // ✅ أضف هون
      const savedHistory = localStorage.getItem(`chatHistory_${tableId}`);
      if (savedHistory) {
        try { conversationHistory.current = JSON.parse(savedHistory); } catch(e) {}
      }
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
  const ingredientsKey = `${orderData.bread}-${orderData.protein}-${orderData.cheese}-${orderData.veggies}-${orderData.sauce}`.replace(/\s+/g, '');
  const customId = `custom_${ingredientsKey}`;

  // ✅ احسب السعر من الـ extras
  const findExtraPrice = (name) => {
    if (!name) return 0;
    const found = extras.find(e => 
      e.name?.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(e.name?.toLowerCase())
    );
    return Number(found?.price) || 0;
  };

  const basePrice = 5.00; // سعر البيس burger
  const cheesePrice = findExtraPrice(orderData.cheese);
  const saucePrice  = findExtraPrice(orderData.sauce);
  const veggiesPrice = findExtraPrice(orderData.veggies);
  const totalPrice  = basePrice + cheesePrice + saucePrice + veggiesPrice;

  const customItem = {
    id: customId,
    databaseId: null,
    name: `Custom Burger (${orderData.protein})`,
    price: orderData.price || totalPrice,
    image: null,
    quantity: 1,
    selectedExtras: [
      orderData.bread   && `Bread: ${orderData.bread}`,
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
  window.dispatchEvent(new CustomEvent("snackCartAddByName", { detail: customItem }));
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

    const autoReply = checkAutoRules(text);
if (autoReply) {
  conversationHistory.current.push({ role: "user", content: text });
  conversationHistory.current.push({ role: "assistant", content: autoReply });
  const botMsg = { sender: "bot", text: autoReply };
  setMessages((prev) => [...prev, botMsg]);
  addMessage(tableId, botMsg);
  return;
}

// ✅ Menu item description check
const menuDesc = checkMenuDescription(text, menuItems);
if (menuDesc) {
  conversationHistory.current.push({ role: "user", content: text });
  conversationHistory.current.push({ role: "assistant", content: menuDesc });
  const botMsg = { sender: "bot", text: menuDesc };
  setMessages((prev) => [...prev, botMsg]);
  addMessage(tableId, botMsg);
  return;
}

conversationHistory.current.push({ role: "user", content: text });
setIsLoading(true);

    try {
     const userMessageCount = conversationHistory.current.filter(m => m.role === "user").length;
    const resp = await chatService.sendChat(conversationHistory.current, menuItems, userMessageCount, extras);
      if (!resp || !resp.success) throw new Error(resp?.error || 'Empty response from backend');
     let raw = resp.reply || resp.data?.reply;
      if (!raw) throw new Error('Empty response from backend');

     try {
  localStorage.setItem(`chatHistory_${tableId}`, JSON.stringify(conversationHistory.current.slice(-20)));
} catch(e) {}

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
     /* ── Handle CART_ADD action ─────────────────────────────── */
if (raw.includes("CART_ADD:")) {
  const itemName = raw.match(/CART_ADD:([^\n]+)/)?.[1]?.trim();
  if (itemName) {
    if (itemName.toLowerCase().includes("custom")) {
      const lastCustom = conversationHistory.current
        .filter(m => m.role === "assistant")
        .reverse()
        .find(m => m.content?.includes("beef") || m.content?.includes("chicken") || 
                   m.content?.includes("Beef") || m.content?.includes("Chicken"));
      addCustomOrderToCart({
        bread: "brioche",
        protein: lastCustom?.content?.toLowerCase().includes("chicken") ? "Chicken" : "Beef",
        cheese: "",
        veggies: "",
        sauce: "",
        price: 12.99,
      });
    } else {
      addItemToCartByName(itemName);
    }
  }
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
  
  const isTimeout = err.message?.includes('timeout');
  const isQuota = err.message?.includes('busy') || err.response?.status === 429;
  
  const errMsg = {
    sender: "bot",
    text: isTimeout 
      ? "Sorry, took too long to respond. Please try again!"
      : isQuota
      ? "I'm a bit busy right now, try again in a moment!"
      : "Something went wrong. Ask a staff member for help!",
  };
  setMessages(prev => [...prev, errMsg]);
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