import React, { useState, useRef, useEffect } from "react";
import "../style/chatbot.css";
import {
  getTableConversation, addMessage, setTableStatus,
  subscribeToChats, addCustomOrder
} from "./chatbotStore";
import chatService from '../services/chatService';

/* ================================================================
   FLOW STATES
   ================================================================ */
const FLOW = {
  IDLE: 'idle',
  ASK_TYPE: 'ask_type',
  CONFIRM_ITEM: 'confirm_item',
  CUSTOMIZE_ITEM: 'customize_item',
  CUSTOM_PROTEIN: 'custom_protein',
  CUSTOM_CHEESE: 'custom_cheese',
  CUSTOM_SAUCE: 'custom_sauce',
  CUSTOM_VEGGIES: 'custom_veggies',
  CUSTOM_CONFIRM: 'custom_confirm',
};

/* ================================================================
   CUSTOM BURGER PRICING
   • Base = $5 (agreed)
   • Each extra adds its price from extra_options
   • ALL sauces = $2 (table stores them at $0, we override)
   • Veggies = multi-select
   ================================================================ */
const BASE_PRICE  = 5.00;
const SAUCE_PRICE = 2.00;

const SAUCE_RE   = /sauce|mayo|mustard|ranch|bbq|buffalo|cocktail|cuban|garlic/i;
const CHEESE_RE  = /cheese|cheddar|mozzarella|parmesan|swiss|gouda|provolone|feta/i;
const PROTEIN_RE = /patty|beef|chicken|turkey|breast/i;
const VEGGIE_RE  = /tomato|onion|pickle|jalapeno|mushroom|avocado|iceberg|lettuce|rocca|arugula|corn|cucumber|pomegranate|olive/i;

/* Group extra_options by name (table has no type column) */
const classifyExtras = (extras = []) => {
  const groups = { cheese: [], sauce: [], veggies: [], protein: [], other: [] };

  extras.forEach((e) => {
    const n = (e.name || "").trim();
    if (!n) return;

    const isSauce = SAUCE_RE.test(n);
    const price   = isSauce ? SAUCE_PRICE : (Number(e.price) || 0);
    const label   = price > 0 ? `${n} (+$${price.toFixed(2)})` : n;

    if (isSauce)                 groups.sauce.push(label);
    else if (CHEESE_RE.test(n))  groups.cheese.push(label);
    else if (PROTEIN_RE.test(n)) groups.protein.push(label);
    else if (VEGGIE_RE.test(n))  groups.veggies.push(label);
    else                         groups.other.push(label);
  });

  return groups;
};

/* Price a single extra by name (sauces forced to $2) */
const priceForExtra = (extras, name) => {
  const clean = (name || "").trim();
  if (!clean) return 0;
  if (/\b(none|blesh|bala|no)\b/i.test(clean)) return 0;
  if (SAUCE_RE.test(clean)) return SAUCE_PRICE;
  const found = (extras || []).find(
    (e) => (e.name || "").trim().toLowerCase() === clean.toLowerCase()
  );
  return Number(found?.price) || 0;
};

/* Match free-text against real extra names (multi-select veggies) */
const matchVeggies = (extras, text) => {
  const tokens = (text || "")
    .split(/[,،]|\band\b|\bw\b|\+/i)
    .map((t) => t.trim())
    .filter(Boolean);

  const matched = [];
  let total = 0;

  tokens.forEach((tok) => {
    const hit = (extras || []).find(
      (e) =>
        (e.name || "").toLowerCase().includes(tok.toLowerCase()) ||
        tok.toLowerCase().includes((e.name || "").toLowerCase())
    );
    if (hit && !matched.includes(hit.name.trim())) {
      matched.push(hit.name.trim());
      total += Number(hit.price) || 0;
    } else if (!hit && tok) {
      matched.push(tok);
    }
  });

  return { names: matched, total };
};

/* ================================================================
   AUTO-RESPONSE RULES
   Quick keyword matches handled locally — no API call needed.
   Rules with .en/.fr reply in the matching language.
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
  // Only catch a STANDALONE generic recommend request (no category context).
  // Context-dependent ones ("shu atyab sandwich", "best one") fall through to
  // Gemini, which can see the conversation and answer in context.
  { match: /^(what do you recommend|recommendations?|shu btensa7|btensa7|shu bt2ello|any recommendations|recommend me something|shu lazem jarreb)\??$/i,
    en: "I'd recommend the Classic Burger, the Grilled Chicken Sandwich, or the Chicken Strips — they're really tasty! Want me to add one?",
    fr: "Bensa7ak tjarreb l Classic Burger, l Grilled Chicken Sandwich, aw l Chicken Strips — ktir taybeen! Baddak zeed wa7ad?" },

  // ── Menu → categories first ──
  { match: /\b(menu|shu 3andkon|what do you have|show menu|shu fi|shu fi bel menu|categories|3anna shu)\b/i,
    en: "We have these categories: Burgers, Sandwiches, Salads, Appetizers, Dips, and Beverages. Which one would you like to see?",
    fr: "3anna hal categories: Burgers, Sandwiches, Salads, Appetizers, Dips, w Beverages. Ayya wa7de baddak tshouf?" },

  // ── Burgers (single word → all items) ──
  { match: /^(burgers?|burger menu|3andkon burger)$/i,
    en: "Beef Burgers: Classic $7, Cheese $7.50, Mushroom Swiss $9, BBQ $7, Double Beef $9, Mozzarella Beef $9. Chicken Burgers: Grilled $7, Spicy $7, Club $7, Classic $6.50, BBQ $7, Honey Mustard $7. Which one?",
    fr: "Beef burgers: Classic $7, Cheese $7.50, Mushroom Swiss $9, BBQ $7, Double Beef $9, Mozzarella Beef $9. Chicken: Grilled $7, Spicy $7, Club $7, Classic $6.50, BBQ $7, Honey Mustard $7. Shu baddak?" },
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
  text: "Welcome to Snack Attack! I'm ready to help you build your perfect burger, browse the menu, or assist with any questions. How can I help you today?",
};

/* Detect which menu category a message is about (for context-aware replies) */
const detectCategory = (text) => {
  const t = text.toLowerCase();
  if (/\b(sandwich|sandwiches|sandwij)\b/.test(t))            return "Sandwiches";
  if (/\b(salad|salads)\b/.test(t))                          return "Salads";
  if (/\b(appetizer|appetizers|starter|fries|wings|strips|nuggets)\b/.test(t)) return "Appetizers";
  if (/\b(dip|dips|sauce on the side)\b/.test(t))            return "Dips";
  if (/\b(drink|drinks|beverage|beverages|pepsi|7up|water|juice|mashrob)\b/.test(t)) return "Beverages";
  if (/\b(burger|burgers)\b/.test(t))                        return "Burgers";
  return null;
};

/* Best-pick recommendation per category (franco + english) */
const CATEGORY_PICKS = {
  Burgers:    { en: "the Classic Burger or the Mushroom Swiss", fr: "l Classic Burger aw l Mushroom Swiss" },
  Sandwiches: { en: "the Grilled Chicken Sandwich or the Chicken Avocado", fr: "l Grilled Chicken Sandwich aw l Chicken Avocado" },
  Salads:     { en: "the Caesar Salad or the Quinoa Salad", fr: "l Caesar Salad aw l Quinoa Salad" },
  Appetizers: { en: "the Chicken Strips or the Mozzarella Sticks", fr: "l Chicken Strips aw l Mozzarella Sticks" },
  Dips:       { en: "the Garlic Mayo or the Cheddar dip", fr: "l Garlic Mayo aw l Cheddar dip" },
  Beverages:  { en: "an Iced Tea or a Pepsi", fr: "Iced Tea aw Pepsi" },
};

const recommendFor = (category, franco) => {
  const pick = CATEGORY_PICKS[category];
  if (!pick) {
    return franco
      ? "Bensa7ak tjarreb l Classic Burger, l Grilled Chicken Sandwich, aw l Chicken Strips — ktir taybeen!"
      : "I'd recommend the Classic Burger, the Grilled Chicken Sandwich, or the Chicken Strips — they're really tasty!";
  }
  return franco
    ? `Mn l ${category}, bensa7ak ${pick.fr} — ktir taybeen!`
    : `From the ${category}, I'd recommend ${pick.en} — they're really tasty!`;
};

/* ================================================================
   CHATBOT COMPONENT
   ================================================================ */
function Chatbot({ menuItems = [], extras = [], addToCart, removeFromCart, cart = [], setCart }) {
  const tableId = String(localStorage.getItem("activeTable") || "1");

  const [isOpen,         setIsOpen]         = useState(false);
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [isLoading,      setIsLoading]      = useState(false);
  const [chatStatus,     setChatStatus]     = useState("bot");
  const [hasNewAdminMsg, setHasNewAdminMsg] = useState(false);

  const [flowState, setFlowState] = useState(FLOW.IDLE);
  const customBurgerRef = useRef({});
  const pendingItemRef  = useRef(null);
  const lastCategoryRef = useRef(null);
  const lastCartItemRef = useRef(null); // signature of the last item added (for edits)
  const buildItemRef     = useRef(null); // item being customized before it's added

  const conversationHistory = useRef([]);
  const prevMsgCount        = useRef(0);
  const messagesEndRef      = useRef(null);
  const chatStatusRef       = useRef("bot");
  const inputRef            = useRef(null);



  useEffect(() => { chatStatusRef.current = chatStatus; }, [chatStatus]);

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
        try {
          localStorage.setItem(`chatHistory_${tableId}`, JSON.stringify(conversationHistory.current.slice(-20)));
        } catch(e) {}
        prevMsgCount.current = conv.messages.length;
      });

      const savedHistory = localStorage.getItem(`chatHistory_${tableId}`);
      if (savedHistory) {
        try { conversationHistory.current = JSON.parse(savedHistory); } catch(e) {}
      }
    } else {
      setMessages([welcome]);
      addMessage(tableId, welcome);
    }
  }, [tableId]);

  useEffect(() => {
    const unsub = subscribeToChats((conversations) => {
      const conv = conversations[tableId];
      if (!conv) return;

      setMessages([...conv.messages]);
      const newStatus = conv.status || "bot";
      setChatStatus(newStatus);
      chatStatusRef.current = newStatus;

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

    const sysMsg = {
      sender: "system",
      text: `Staff has been notified and will be with you shortly — ${reason}`,
    };
    addMessage(tableId, sysMsg);
    setMessages((prev) => [...prev, sysMsg]);
  };

  const addItemToCartByName = (itemName) => {
    if (menuItems && menuItems.length > 0) {
      const found = menuItems.find(
        (m) =>
          m.name?.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(m.name?.toLowerCase())
      );
      if (found && addToCart) {
        addToCart({
          id: found.id, databaseId: found.id, name: found.name,
          price: Number(found.price), image: found.image,
          quantity: 1, selectedExtras: [],
        });
        return true;
      }
    }
    window.dispatchEvent(new CustomEvent("snackCartAddByName", { detail: { name: itemName } }));
    return true;
  };

  /* Generic words that describe a CATEGORY, not a specific item.
     On their own these must never match a menu item. */
  const GENERIC_WORDS = new Set([
    "burger", "burgers", "sandwich", "sandwiches", "salad", "salads",
    "drink", "drinks", "beverage", "beverages", "appetizer", "appetizers",
    "dip", "dips", "fries", "meal", "food", "akel", "something", "shi",
    "a", "the", "some", "want", "bde", "baddi", "order", "i",
  ]);

  /* Find a menu item by name.
     Returns the MOST SPECIFIC match — item with most distinctive-word hits wins,
     so "pepsi diet" → Pepsi Diet (2 hits) beats Pepsi (1 hit). */
  const findMenuItem = (text) => {
    if (!menuItems || menuItems.length === 0) return null;
    const t = " " + text.toLowerCase().trim() + " ";

    // Helper: count how many distinctive (non-generic) words of item name appear in t
    const scoreItem = (m) => {
      const words = (m.name || "").toLowerCase().split(/\s+/).filter(Boolean);
      const dist  = words.filter(w => !GENERIC_WORDS.has(w));
      if (!dist.length) return 0;
      const hits  = dist.filter(w => t.includes(" " + w) || t.includes(w + " ")).length;
      // Must match ALL distinctive words
      return hits === dist.length ? hits : 0;
    };

    // 1) Exact full-name match (all words in order) — pick longest.
    //    But also check if a higher-scoring item exists (handles "zero pepsi" vs "Pepsi Zero").
    const exactMatches = menuItems.filter(m => {
      const name = (m.name || "").toLowerCase().trim();
      return name && t.includes(" " + name + " ");
    });

    // 2) Distinctive-word match (any order) — pick most specific
    let best2 = null, bestScore2 = 0;
    menuItems.forEach(m => {
      const s = scoreItem(m);
      if (s > bestScore2) { bestScore2 = s; best2 = m; }
    });

    // If we have exact matches, return the one with highest score (or longest if tied).
    // This lets "zero pepsi" (score 2 for Pepsi Zero) beat "Pepsi" (score 1 exact match).
    if (exactMatches.length) {
      const best2Score = best2 ? scoreItem(best2) : 0;
      const exactBest = exactMatches.reduce((b, m) =>
        (m.name || "").length > (b.name || "").length ? m : b
      );
      const exactScore = scoreItem(exactBest);
      // If another item scores strictly higher, prefer it
      if (best2 && best2Score > exactScore && !exactMatches.includes(best2)) return best2;
      return exactBest;
    }

    if (best2) return best2;

    // 3) Fuzzy/prefix (handles typos like "mshroom" ≈ "mushroom")
    const userTokens = text.toLowerCase().trim().split(/\s+/)
      .filter(tok => !GENERIC_WORDS.has(tok));
    if (!userTokens.length) return null;

    let fuzzyBest = null, fuzzyScore = 0;
    menuItems.forEach(m => {
      const nameWords = (m.name || "").toLowerCase().split(/\s+/).filter(Boolean);
      const dist = nameWords.filter(w => !GENERIC_WORDS.has(w));
      if (!dist.length) return;
      const allMatch = userTokens.every(tok =>
        dist.some(w => w.startsWith(tok) || tok.startsWith(w))
      );
      if (allMatch && dist.length > fuzzyScore) { fuzzyScore = dist.length; fuzzyBest = m; }
    });
    return fuzzyBest || null;
  };

  /* Insert a found menu item into the cart + return a short summary. */
  const addItemNow = (item, qty, franco) => {
    if (addToCart) {
      // Pass quantity directly — calling addToCart N times causes React to
      // batch the state updates and only apply the last one.
      addToCart({
        id: item.id, databaseId: item.id, name: item.name,
        price: Number(item.price), image: item.image,
        quantity: qty, selectedExtras: [],
      });
    } else {
      window.dispatchEvent(new CustomEvent("snackCartAddByName", { detail: { name: item.name } }));
    }

    // Remember this as the item the customer can edit ("remove onions", etc.)
    lastCartItemRef.current = { name: item.name, menuItem: item };

    const price = Number(item.price).toFixed(2);
    const qtyTxt = qty > 1 ? `${qty}x ` : "";

    return franco
      ? `✅ ${qtyTxt}${item.name} ($${price}) nzaad 3al cart! Baddak shi tene?`
      : `✅ ${qtyTxt}${item.name} ($${price}) added to your cart! Anything else?`;
  };

  /* Add the item currently being customized (buildItemRef) to the cart ONCE,
     with all its modifications. Then reset the flow. */
  const commitBuildItem = (franco) => {
    const b = buildItemRef.current;
    if (!b) return;
    const item = b.menuItem;
    const hasMods = b.removedExtras.length > 0 || b.selectedExtras.length > 0 || b.specialNote;

    if (addToCart) {
      for (let i = 0; i < b.qty; i++) {
        addToCart({
          id: item.id, databaseId: item.id, name: item.name,
          price: Number(item.price), image: item.image,
          quantity: 1,
          selectedExtras: b.selectedExtras,
          removedExtras:  b.removedExtras,
          specialNote:    b.specialNote,
        });
      }
    }

    // allow further edits via "remove/add" afterwards too
    lastCartItemRef.current = { name: item.name, menuItem: item };

    const price = Number(item.price).toFixed(2);
    const qtyTxt = b.qty > 1 ? `${b.qty}x ` : "";
    const bits = [];
    if (b.removedExtras.length) bits.push((franco ? "bala " : "no ") + b.removedExtras.map(e => e.name).join(", "));
    if (b.selectedExtras.length) bits.push((franco ? "ma3 " : "with ") + b.selectedExtras.map(e => e.name).join(", "));
    if (b.specialNote) bits.push(`📝 ${b.specialNote}`);
    const modTxt = bits.length ? ` (${bits.join("; ")})` : "";

    buildItemRef.current = null;
    setFlowState(FLOW.IDLE);

    sendBotMsg(franco
      ? `✅ ${qtyTxt}${item.name} ($${price})${modTxt} nzaad 3al cart! Baddak shi tene?`
      : `✅ ${qtyTxt}${item.name} ($${price})${modTxt} added to your cart! Anything else?`);
  };

  /* "I want X": find item, add it, return summary. Null if nothing matched. */
  const tryAddMenuItem = (text, franco) => {
    const item = findMenuItem(text);
    if (!item) return null;
    const qtyMatch = text.match(/\b(\d+)\b/);
    const qty = qtyMatch ? Math.min(Math.max(parseInt(qtyMatch[1], 10), 1), 20) : 1;

    const price = Number(item.price).toFixed(2);
    const desc = item.description ? ` — ${item.description}` : "";
    const qtyTxt = qty > 1 ? `${qty}x ` : "";
    const head = franco ? `Tamem! ${qtyTxt}${item.name} ($${price})${desc}` : `Got it! ${qtyTxt}${item.name} ($${price})${desc}`;
    const tail = addItemNow(item, qty, franco);
    return `${head}\n\n${tail}`;
  };

  /* Trusts orderData.price (already computed in the flow). No double-counting. */
  const addCustomOrderToCart = (orderData) => {
    const ingredientsKey = `${orderData.bread}-${orderData.protein}-${orderData.cheese}-${orderData.veggies}-${orderData.sauce}`.replace(/\s+/g, '');
    const customId = `custom_${ingredientsKey}`;

    const totalPrice = Number(orderData.price) || BASE_PRICE;

    const customItem = {
      id: customId,
      databaseId: null,
      name: `Custom Burger (${orderData.protein})`,
      price: totalPrice,
      image: null,
      quantity: 1,
      selectedExtras: [
        orderData.bread && `Bread: ${orderData.bread}`,
        orderData.protein && `Protein: ${orderData.protein}`,
        orderData.cheese && `Cheese: ${orderData.cheese}`,
        orderData.veggies && `Veggies: ${orderData.veggies}`,
        orderData.sauce && `Sauce: ${orderData.sauce}`,
        orderData.notes && `Note: ${orderData.notes}`,
      ].filter(Boolean),
      isCustom: true,
      customOrderData: orderData,
    };

    if (addToCart) addToCart(customItem);
    window.dispatchEvent(new CustomEvent("snackCartAddByName", { detail: customItem }));
  };

  /* ================================================================
     EDIT THE LAST CART ITEM (remove ingredient / add extra / note)
     Works on the most recent item the customer added via chat.
     ================================================================ */
  const editLastItem = (action, text, franco) => {
    const last = lastCartItemRef.current;
    if (!last || !setCart) {
      return franco
        ? "Ma fi akle 7adetha zedta la 3addel 3laya. Zeed wa7ad awwal!"
        : "There's no recent item to edit. Add one first!";
    }

    // Find the matching cart line (latest one with this name).
    let editedSummary = null;

    setCart((prev) => {
      const cur = Array.isArray(prev) ? prev : [];
      // last index match by name
      let idx = -1;
      for (let i = cur.length - 1; i >= 0; i--) {
        if (cur[i].name === last.name) { idx = i; break; }
      }
      if (idx === -1) return cur;

      const line = { ...cur[idx] };
      line.selectedExtras = Array.isArray(line.selectedExtras) ? [...line.selectedExtras] : [];
      line.removedExtras  = Array.isArray(line.removedExtras)  ? [...line.removedExtras]  : [];

      if (action === "remove") {
        // match against the menu extras list by name token
        const hit = (extras || []).find((e) =>
          text.toLowerCase().includes((e.name || "").toLowerCase())
        );
        const removeName = hit ? hit.name : text.replace(/.*\b(sheel|shil|remove|no|bala|bdoun|min 8air|without)\b/i, "").trim();
        if (removeName && !line.removedExtras.some((r) => r.name === removeName)) {
          line.removedExtras.push(hit || { id: `rm_${removeName}`, name: removeName, price: 0 });
        }
        editedSummary = removeName;
      }

      if (action === "add") {
        const hit = (extras || []).find((e) =>
          text.toLowerCase().includes((e.name || "").toLowerCase())
        );
        if (hit && !line.selectedExtras.some((s) => s.id === hit.id)) {
          line.selectedExtras.push(hit);
          editedSummary = `${hit.name} (+$${Number(hit.price).toFixed(2)})`;
        } else {
          editedSummary = hit ? hit.name : null;
        }
      }

      if (action === "note") {
        line.specialNote = text.trim();
        editedSummary = text.trim();
      }

      const next = [...cur];
      next[idx] = line;
      return next;
    });

    // Build the confirmation message
    if (action === "remove") {
      return franco
        ? `✅ Shilt l ${editedSummary} mn l ${last.name}. Baddak shi tene?`
        : `✅ Removed ${editedSummary} from your ${last.name}. Anything else?`;
    }
    if (action === "add") {
      return editedSummary
        ? (franco
            ? `✅ Zedt ${editedSummary} 3al ${last.name}. Baddak shi tene?`
            : `✅ Added ${editedSummary} to your ${last.name}. Anything else?`)
        : (franco
            ? `Ma la2et hal extra. Jarreb esem tene aw shouf l extras.`
            : `I couldn't find that extra. Try another name or check the extras.`);
    }
    // note
    return franco
      ? `✅ Sajjalt l mulaha7a 3al ${last.name}: "${editedSummary}". Baddak shi tene?`
      : `✅ Added your note to the ${last.name}: "${editedSummary}". Anything else?`;
  };

  /* Detect an edit intent on the last item. Returns the reply or null. */
  const tryEditLastItem = (text, franco) => {
    const t = text.toLowerCase();

    // note
    if (/^note[: ]/i.test(text.trim()) || /\b(note|mula7aza|well done|cut in half)\b/i.test(t)) {
      const noteText = text.replace(/^.*\b(note|mula7aza)\b[: ]*/i, "").trim() || text.trim();
      return editLastItem("note", noteText, franco);
    }

    // ADD wins: if add/more/extra/zeed present → add-extra intent.
    if (/\b(add|zeed|ziid|extra|kamen|more)\b/i.test(t)) {
      return editLastItem("add", text, franco);
    }

    // REMOVE: first check if it's a CART ITEM being removed (not an ingredient).
    // "remove pepsi diet", "sheel 2 fries" = remove item from cart entirely.
    if (/\b(sheel|shil|remove|bala|bdoun|min 8air|without)\b/i.test(t)) {
      const cartItem = findMenuItem(text);
      if (cartItem) {
        const qtyMatch = text.match(/\b(\d+)\b/);
        const qty = qtyMatch ? Math.min(parseInt(qtyMatch[1], 10), 20) : 1;
        for (let i = 0; i < qty; i++) removeFromCart(cartItem.name);
        if (lastCartItemRef.current?.name === cartItem.name) lastCartItemRef.current = null;
        return franco
          ? `✅ Shilt ${qty > 1 ? qty + "x " : ""}${cartItem.name} mn l cart. Baddak shi tene?`
          : `✅ Removed ${qty > 1 ? qty + "x " : ""}${cartItem.name} from your cart. Anything else?`;
      }
      // No menu item found → treat as ingredient remove from last item
      return editLastItem("remove", text, franco);
    }

    // "no X" — check if X is a cart item or ingredient
    if (/\bno\b/i.test(t)) {
      const afterNo = t.replace(/^.*\bno\b\s*/i, "").trim();
      if (afterNo.length > 1 && !/\b(i|i'm|more|want|please|thanks)\b/i.test(afterNo)) {
        const cartItem = findMenuItem(afterNo);
        if (cartItem) {
          removeFromCart(cartItem.name);
          return franco
            ? `✅ Shilt ${cartItem.name} mn l cart. Baddak shi tene?`
            : `✅ Removed ${cartItem.name} from your cart. Anything else?`;
        }
        return editLastItem("remove", text, franco);
      }
    }

    return null;
  };

  const isFranco = (text) =>
    /\b(bde|shu|3andi|kifak|yalla|mni7|hek|wallah|3anna|kmn|tyb|eza|la2|akid|msh|ahla|tfaddal|7abib|ktir|marhaba|salam|3ammeh|3amo|sa3at|awkat|wa2t|7ammam|shukran|ysalmo|baddi|baddak|blesh)\b/i.test(text);

  const checkAutoRules = (text) => {
    const franco = isFranco(text);
    for (const rule of AUTO_RULES) {
      if (rule.match.test(text.trim())) {
        if (rule.en && rule.fr) return franco ? rule.fr : rule.en;
        return rule.reply;
      }
    }
    return null;
  };

  const sendBotMsg = (text) => {
    const botMsg = { sender: "bot", text };
    setMessages(prev => [...prev, botMsg]);
    addMessage(tableId, botMsg);
    // keep the AI conversation context in sync with local flow replies
    conversationHistory.current.push({ role: "assistant", content: text });
  };

  /* ================================================================
     CUSTOM BURGER FLOW
     ================================================================ */
  const handleOrderFlow = (text) => {
    const lower  = text.toLowerCase();
    const franco = isFranco(text);

    // ---- Start ----
    if (flowState === FLOW.IDLE) {
      const wantsOrder = /\b(bde|baddi|i want|want|order|3tene|a3tene|3tini|3teene)\b/i.test(lower);

      // Explicit custom/customize intent anywhere in the message -> ASK_TYPE or
      // directly start custom flow. Catches "yes i want to custom burger", "custom meal", etc.
      if (/\b(custom|customize|3mol|a3mol|build|ebne|2ebne|tibne)\b/i.test(lower)) {
        const groups = classifyExtras(extras);
        customBurgerRef.current = { _groups: groups };
        setFlowState(FLOW.CUSTOM_PROTEIN);
        sendBotMsg(franco ? " Beef wala Chicken?" : "Beef or Chicken?");
        return true;
      }

      if (wantsOrder) {
        // 0) Multi-item order: "1 pepsi zero, 5 pepsi diet, 2 iced tea"
        //    Split on commas/w/and, try to find item+qty in each segment.
        //    Only triggers if we find 2+ valid items.
        const segments = text
          .replace(/^(bde|baddi|i want|want|order|3tene|a3tene|3tini|3teene)\s*/i, "")
          .split(/[,،]\s*|\s+(?:and|w|wa|kmn|kaman)\s+/i)
          .map(s => s.trim()).filter(Boolean);

        if (segments.length >= 2) {
          const parsed = segments.map(seg => {
            const qm = seg.match(/^(\d+)\s+(.+)$/) || seg.match(/^(.+)\s+(\d+)$/);
            let qty = 1, name = seg;
            if (qm) {
              if (/^\d+$/.test(qm[1])) { qty = Math.min(parseInt(qm[1],10),20); name = qm[2]; }
              else { qty = Math.min(parseInt(qm[2],10),20); name = qm[1]; }
            }
            return { qty, name, item: findMenuItem(name) };
          }).filter(p => p.item);

          if (parsed.length >= 2) {
            const lines = [];
            parsed.forEach(({ item, qty }) => {
              addToCart({ id: item.id, databaseId: item.id, name: item.name,
                price: Number(item.price), image: item.image, quantity: qty, selectedExtras: [] });
              lastCartItemRef.current = { name: item.name, menuItem: item };
              lines.push(`${qty > 1 ? qty + "x " : ""}${item.name} ($${Number(item.price).toFixed(2)})`);
            });
            sendBotMsg(franco
              ? `✅ Zedna:\n${lines.map(l => "• " + l).join("\n")}\n\nBaddak shi tene?`
              : `✅ Added:\n${lines.map(l => "• " + l).join("\n")}\n\nAnything else?`);
            return true;
          }
        }

        // 1) Generic "I want a burger / meal" with no specific item -> ask menu vs custom.
        //    (Check this FIRST so "bde burger" never matches a random burger item.)
        //    Allow an optional greeting before it ("hi bde burger").
        if (/^(hi|hello|hey|marhaba|ahla|salam|yalla|3ammeh|ok)?\s*(bde|baddi|i want|want|order|3tene|a3tene|3tini|3teene)\s*(a\s+)?(burger|meal|akel|food|something|shi)?\??$/i.test(text.trim())) {
          setFlowState(FLOW.ASK_TYPE);
          sendBotMsg(franco
            ? "Baddak men menu wala custom meal?"
            : "Would you like something from the menu or a custom meal?");
          return true;
        }

        // 2) Named a SPECIFIC menu item -> ask: customize it or add as-is?
        const item = findMenuItem(text);
        if (item) {
          const qtyMatch = text.match(/\b(\d+)\b/);
          const qty = qtyMatch ? Math.min(Math.max(parseInt(qtyMatch[1], 10), 1), 20) : 1;
          buildItemRef.current = {
            menuItem: item, qty,
            selectedExtras: [], removedExtras: [], specialNote: null,
          };
          const price = Number(item.price).toFixed(2);
          const desc = item.description ? ` — ${item.description}` : "";
          setFlowState(FLOW.CUSTOMIZE_ITEM);
          sendBotMsg(franco
            ? `${item.name} ($${price})${desc}\n\nBaddak t3addel 3laya (sheel/zeed/note) wala zeeda 3al cart metel ma heyye?`
            : `${item.name} ($${price})${desc}\n\nWant to customize it (remove/add/note) or add it to the cart as is?`);
          return true;
        }
      }
      return false;
    }

    // ---- Customize-or-add a named item before it goes to cart ----
    if (flowState === FLOW.CUSTOMIZE_ITEM) {
      const b = buildItemRef.current;
      if (!b) { setFlowState(FLOW.IDLE); return false; }

      // Cancel / don't want it
      if (/^(no|la2|cancel|2lta3|ma baddi|ma bde)$/i.test(text.trim())) {
        buildItemRef.current = null;
        setFlowState(FLOW.IDLE);
        sendBotMsg(franco ? "Ma fi mushkele. Baddak shi tene?" : "No problem. Anything else?");
        return true;
      }

      // Bare number OR "add N" = quantity for this item → commit N copies
      const numMatch = text.trim().match(/^(\d+)$/)
        || text.trim().match(/^(?:add|zeed|zeedo)\s+(\d+)$/i);
      if (numMatch) {
        const qty = Math.min(Math.max(parseInt(numMatch[1], 10), 1), 20);
        b.qty = qty;
        commitBuildItem(franco);
        return true;
      }

      // "zeed" / "zeedo" alone = "add it to cart as-is"
      if (/^(zeed|zeedo|zeeda|add it|add)$/i.test(text.trim())) {
        commitBuildItem(franco);
        return true;
      }

      // User typed a DIFFERENT item name → they want to switch, not customize.
      // e.g. bot asked about "Pepsi", user says "pepsi diet" or "diet pepsi".
      const switchItem = findMenuItem(text);
      if (switchItem && switchItem.name !== b.menuItem.name
          && !/\b(sheel|shil|remove|bala|bdoun|without|add|zeed|extra|note)\b/i.test(lower)) {
        buildItemRef.current = {
          menuItem: switchItem, qty: b.qty,
          selectedExtras: [], removedExtras: [], specialNote: null,
        };
        const price = Number(switchItem.price).toFixed(2);
        const desc  = switchItem.description ? ` — ${switchItem.description}` : "";
        sendBotMsg(franco
          ? `${switchItem.name} ($${price})${desc}\n\nBaddak t3addel 3laya wala zeeda 3al cart metel ma heyye?`
          : `${switchItem.name} ($${price})${desc}\n\nWant to customize it or add it as is?`);
        return true;
      }

      // Asking what's in it -> show the description
      if (/\b(ingredient|ingredients|shu feya|shu fiya|what'?s in|sho fi|shu fi|feya shu|description)\b/i.test(lower)) {
        const desc = b.menuItem.description
          ? b.menuItem.description
          : (franco ? "Ma fi wasf mfassal la hal item." : "No detailed description for this item.");
        sendBotMsg(franco
          ? `${b.menuItem.name}: ${desc}\n\nBaddak t3addel 3laya wala zeeda metel ma heyye?`
          : `${b.menuItem.name}: ${desc}\n\nWant to customize it or add it as is?`);
        return true;
      }

      // Add as-is (plain yes, "zeeda", etc.) — no customize keywords present
      if (/\b(as is|zeeda|add it|zeed 3al cart|metel ma heyye|3al cart|kafa|khalas|yalla|akid|yes|na3am|eh|aywa|sure|ok)\b/i.test(lower)
          && !/\b(sheel|shil|remove|bala|bdoun|without|note|mula7aza|more|extra)\b/i.test(lower)) {
        commitBuildItem(franco);
        return true;
      }

      // ADD extra: explicit add keyword + a recognizable extra name
      if (/\b(add|zeed|ziid|extra|kamen|more)\b/i.test(lower)
          && !/\b(sheel|shil|remove|bala|bdoun|without)\b/i.test(lower)) {
        const hit = (extras || []).find((e) => lower.includes((e.name || "").toLowerCase()));
        if (hit && !b.selectedExtras.some((s) => s.id === hit.id)) {
          b.selectedExtras.push(hit);
          sendBotMsg(franco
            ? `Tamem, zedt ${hit.name} (+$${Number(hit.price).toFixed(2)}). Baddak shi tene? (aw 2el "zeeda")`
            : `Done, added ${hit.name} (+$${Number(hit.price).toFixed(2)}). Anything else? (or say "add it")`);
        } else if (!hit) {
          // Maybe they said "add" but named an item, not an extra → switch item
          const addedItem = findMenuItem(text);
          if (addedItem && addedItem.name !== b.menuItem.name) {
            buildItemRef.current = { menuItem: addedItem, qty: b.qty, selectedExtras: [], removedExtras: [], specialNote: null };
            const price = Number(addedItem.price).toFixed(2);
            sendBotMsg(franco
              ? `${addedItem.name} ($${price})\n\nBaddak t3addel 3laya wala zeeda 3al cart?`
              : `${addedItem.name} ($${price})\n\nWant to customize it or add it as is?`);
          } else {
            sendBotMsg(franco ? "Ma la2et hal extra. Jarreb esem tene." : "I couldn't find that extra. Try another name.");
          }
        } else {
          sendBotMsg(franco ? "Hal extra mawjoud mtra." : "That extra is already added.");
        }
        return true;
      }

      // REMOVE: explicit remove keyword, or "no X" where X is an ingredient (not "no I want...")
      const isRemove = /\b(sheel|shil|remove|bala|bdoun|min 8air|without)\b/i.test(lower)
        || (/\bno\b/i.test(lower) && (() => {
          const afterNo = lower.replace(/^.*\bno\b\s*/i, "").trim();
          return afterNo.length > 1 && !/\b(i|i'm|more|want|please|thanks|add)\b/i.test(afterNo);
        })());
      if (isRemove) {
        const hit = (extras || []).find((e) => lower.includes((e.name || "").toLowerCase()));
        const nm = hit ? hit.name : text.replace(/.*\b(sheel|shil|remove|no|bala|bdoun|min 8air|without)\b/i, "").trim();
        if (nm && !b.removedExtras.some((r) => r.name === nm)) b.removedExtras.push(hit || { id: `rm_${nm}`, name: nm, price: 0 });
        sendBotMsg(franco
          ? `Tamem, shilt l ${nm}. Baddak shi tene 3al ${b.menuItem.name}? (aw 2el "zeeda" ta yenzaad)`
          : `Done, removed ${nm}. Anything else on the ${b.menuItem.name}? (or say "add it" to finish)`);
        return true;
      }
      if (/^note[: ]/i.test(text.trim()) || /\b(note|mula7aza|well done|cut in half)\b/i.test(lower)) {
        const noteText = text.replace(/^.*\b(note|mula7aza)\b[: ]*/i, "").trim() || text.trim();
        b.specialNote = noteText;
        sendBotMsg(franco
          ? `Tamem, sajjalt: "${noteText}". Baddak shi tene? (aw 2el "zeeda")`
          : `Noted: "${noteText}". Anything else? (or say "add it")`);
        return true;
      }

      // Unclear -> nudge
      sendBotMsg(franco
        ? `Baddak t3addel (sheel/zeed/note) wala zeeda 3al cart?`
        : `Customize it (remove/add/note) or add it to the cart?`);
      return true;
    }

    // ---- Ask type ----
    if (flowState === FLOW.ASK_TYPE) {
      if (/\b(custom|build|ebne|2ebne|tibne|3mol|a3mol|customize)\b/i.test(lower)) {
        const groups = classifyExtras(extras);
        customBurgerRef.current = { _groups: groups };
        setFlowState(FLOW.CUSTOM_PROTEIN);
        sendBotMsg(franco ? " Beef wala Chicken?" : " Beef or Chicken?");
        return true;
      }
      if (/\b(menu|3ade|regular)\b/i.test(lower)) {
        setFlowState(FLOW.IDLE);
        sendBotMsg(franco
          ? "3anna hal categories: Burgers, Sandwiches, Salads, Appetizers, Dips, w Beverages. Ayya wa7de baddak tshouf?"
          : "We have these categories: Burgers, Sandwiches, Salads, Appetizers, Dips, and Beverages. Which one would you like to see?");
        return true;
      }
      sendBotMsg(franco ? "Men menu wala custom meal?" : "From the menu or a custom meal?");
      return true;
    }

    // ---- Confirm a named item (user typed an item name without "bade") ----
    if (flowState === FLOW.CONFIRM_ITEM) {
      const item = pendingItemRef.current;

      // Yes -> add as-is.
      // "add" alone = yes. BUT "add X" (add followed by an ingredient/word) =
      // the customer wants to add an extra, not confirm — handle below.
      const isPlainYes = /\b(yes|yalla|ok|akid|na3am|sure|zeedo|zeeda|eh|aywa|2akid)\b/i.test(lower)
        || (/\badd\b/i.test(lower) && !/\badd\s+\w/i.test(lower.trim()));
      if (isPlainYes
          && !/\b(sheel|shil|remove|bala|bdoun|without|note|more|extra)\b/i.test(lower)
          && !/\b(add|zeed|ziid|extra|kamen|more)\b/i.test(lower.replace(/\badd\b/i, ""))) {
        if (item) sendBotMsg(addItemNow(item, 1, franco));
        pendingItemRef.current = null;
        setFlowState(FLOW.IDLE);
        return true;
      }

      // A bare number = quantity for the pending item ("5" → add 5x Pepsi Diet)
      if (/^\d+$/.test(text.trim()) && item) {
        const qty = Math.min(Math.max(parseInt(text.trim(), 10), 1), 20);
        sendBotMsg(addItemNow(item, qty, franco));
        pendingItemRef.current = null;
        setFlowState(FLOW.IDLE);
        return true;
      }

      // They want to customize it (remove/add/note) instead of a plain yes.
      // ADD wins: if add/more/want present with "no", it's an add request.
      if (item && /\b(sheel|shil|remove|bala|bdoun|min 8air|without|add|zeed|ziid|extra|kamen|more|note|mula7aza|well done|cut in half)\b/i.test(lower)) {
        const b = {
          menuItem: item, qty: 1,
          selectedExtras: [], removedExtras: [], specialNote: null,
        };

        if (/^note[: ]/i.test(text.trim()) || /\b(note|mula7aza|well done|cut in half)\b/i.test(lower)) {
          const noteText = text.replace(/^.*\b(note|mula7aza)\b[: ]*/i, "").trim() || text.trim();
          b.specialNote = noteText;
          sendBotMsg(franco
            ? `Tamem, sajjalt: "${noteText}" 3al ${item.name}. Baddak shi tene? (aw 2el "zeeda")`
            : `Noted: "${noteText}" on the ${item.name}. Anything else? (or say "add it")`);
        } else if (/\b(add|zeed|ziid|extra|kamen|more)\b/i.test(lower)) {
          // ADD branch wins even if "no" is present
          const hit = (extras || []).find((e) => lower.includes((e.name || "").toLowerCase()));
          if (hit) {
            b.selectedExtras.push(hit);
            sendBotMsg(franco
              ? `Tamem, zedt ${hit.name} (+$${Number(hit.price).toFixed(2)}) 3al ${item.name}. Baddak shi tene? (aw 2el "zeeda")`
              : `Added ${hit.name} (+$${Number(hit.price).toFixed(2)}) to the ${item.name}. Anything else? (or say "add it")`);
          } else {
            sendBotMsg(franco ? "Ma la2et hal extra. Jarreb esem tene." : "I couldn't find that extra. Try another name.");
          }
        } else {
          // remove
          const hit = (extras || []).find((e) => lower.includes((e.name || "").toLowerCase()));
          const nm = hit ? hit.name : text.replace(/.*\b(sheel|shil|remove|no|bala|bdoun|min 8air|without|ma bde|ma bade)\b/i, "").trim();
          if (nm) b.removedExtras.push(hit || { id: `rm_${nm}`, name: nm, price: 0 });
          sendBotMsg(franco
            ? `Tamem, shilt l ${nm} mn l ${item.name}. Baddak shi tene? (aw 2el "zeeda")`
            : `Removed ${nm} from the ${item.name}. Anything else? (or say "add it")`);
        }

        buildItemRef.current = b;
        pendingItemRef.current = null;
        setFlowState(FLOW.CUSTOMIZE_ITEM);
        return true;
      }

      // No -> cancel (but NOT if followed by "I want / add / more")
      if (/\b(no|la2|cancel|2lta3)\b/i.test(lower)
          && !/\b(add|zeed|more|want|bde|extra)\b/i.test(lower)) {
        sendBotMsg(franco ? "Tamem, ma zeedta. Baddak shi tene?" : "Okay, not added. Anything else?");
        pendingItemRef.current = null;
        setFlowState(FLOW.IDLE);
        return true;
      }

      // Unclear — maybe they named a different item; let other handlers try
      pendingItemRef.current = null;
      setFlowState(FLOW.IDLE);
      return false;
    }

    // ---- Step 1: Protein ----
    if (flowState === FLOW.CUSTOM_PROTEIN) {
      const groups     = customBurgerRef.current._groups || classifyExtras(extras);
      const cheeseList = groups.cheese.length ? groups.cheese.join(", ") : "Cheddar, Mozzarella, Swiss";

      const askCheese = () => {
        setFlowState(FLOW.CUSTOM_CHEESE);
        sendBotMsg(franco
          ? ` Shu naw3 l jebne? (${cheeseList}, aw blesh)`
          : ` Which cheese? (${cheeseList}, or none)`);
      };

      if (/\b(beef|la7em|3jel)\b/i.test(lower)) {
        customBurgerRef.current.protein = "Beef";
        askCheese();
        return true;
      }
      if (/\b(chicken|djeje|djej)\b/i.test(lower)) {
        customBurgerRef.current.protein = "Chicken";
        askCheese();
        return true;
      }
      sendBotMsg(franco ? "Beef wala Chicken?" : "Beef or Chicken?");
      return true;
    }

    // ---- Step 2: Cheese ----
    if (flowState === FLOW.CUSTOM_CHEESE) {
      const groups    = customBurgerRef.current._groups || classifyExtras(extras);
      const sauceList = groups.sauce.length ? groups.sauce.join(", ") : "BBQ (+$2), Garlic Mayo (+$2), Honey Mustard (+$2)";

      customBurgerRef.current.cheese =
        /\b(none|blesh|bala|no|ma bde|ma bade)\b/i.test(lower) ? "None" : text.trim();

      setFlowState(FLOW.CUSTOM_SAUCE);
      sendBotMsg(franco
        ? `Shu naw3 l sauce? Kel sauce $2. (${sauceList})`
        : `Which sauce? Each sauce is $2. (${sauceList})`);
      return true;
    }

    // ---- Step 3: Sauce ----
    if (flowState === FLOW.CUSTOM_SAUCE) {
      customBurgerRef.current.sauce =
        /\b(none|blesh|bala|no|ma bde|ma bade)\b/i.test(lower) ? "None" : text.trim();

      const groups     = customBurgerRef.current._groups || classifyExtras(extras);
      const veggieList = groups.veggies.length ? groups.veggies.join(", ") : "Lettuce, Tomato, Onions, Pickles";

      setFlowState(FLOW.CUSTOM_VEGGIES);
      sendBotMsg(franco
        ? ` Shu khodra baddak? Fik t5tar aktar min wa7ad. (${veggieList})`
        : ` Which veggies? You can pick more than one. (${veggieList})`);
      return true;
    }

    // ---- Step 4: Veggies (multi-select) ----
    if (flowState === FLOW.CUSTOM_VEGGIES) {
      let veggieNames = "None";
      let veggieTotal = 0;

      if (!/\b(none|blesh|bala|no|ma bde|ma bade)\b/i.test(lower)) {
        const { names, total } = matchVeggies(extras, text);
        veggieNames = names.length ? names.join(", ") : text.trim();
        veggieTotal = total;
      }

      customBurgerRef.current.veggies      = veggieNames;
      customBurgerRef.current.veggiesTotal = veggieTotal;

      // compute full price
      const c = customBurgerRef.current;
      const cheesePrice = priceForExtra(extras, c.cheese);
      const saucePrice  = priceForExtra(extras, c.sauce);
      const total = BASE_PRICE + cheesePrice + saucePrice + veggieTotal;
      c.price = Number(total.toFixed(2));

      setFlowState(FLOW.CUSTOM_CONFIRM);
      sendBotMsg(franco
        ? `Tamem! Custom Burger:\n• ${c.protein}\n• Cheese: ${c.cheese}\n• Sauce: ${c.sauce}\n• Veggies: ${c.veggies}\n\nl se3er: $${c.price.toFixed(2)}\n\nNzeedo 3al cart? (yes/no)`
        : `All set! Custom Burger:\n• ${c.protein}\n• Cheese: ${c.cheese}\n• Sauce: ${c.sauce}\n• Veggies: ${c.veggies}\n\nTotal: $${c.price.toFixed(2)}\n\nAdd to cart? (yes/no)`);
      return true;
    }

    // ---- Step 5: Confirm ----
    if (flowState === FLOW.CUSTOM_CONFIRM) {
      if (/\b(yes|yalla|ok|akid|na3am|sure|add|zeedo|eh|aywa)\b/i.test(lower)) {
        const c = customBurgerRef.current;
        addCustomOrderToCart({
          protein: c.protein,
          cheese:  c.cheese,
          sauce:   c.sauce,
          veggies: c.veggies,
          bread:   "brioche",
          price:   c.price,
        });
        setFlowState(FLOW.IDLE);
        customBurgerRef.current = {};

        // Check if they also ordered other items in the same message.
        // Strip the yes/confirm word and try to parse the rest as multi-item.
        // e.g. "yes 5 pepsi w 3 zero pepsi" or "yes please with 2 pepsi diet"
        const stripped = text
          .replace(/^(yes|yalla|ok|akid|na3am|sure|add|zeedo|eh|aywa|please|with|w)\b\s*/i, "")
          .replace(/\b(with|please)\b\s*/i, "")
          .trim();

        if (stripped) {
          const segments = stripped
            .split(/[,،]\s*|\s+(?:and|w|wa|kmn|kaman)\s+/i)
            .map(s => s.trim()).filter(Boolean);

          const parsed = segments.map(seg => {
            const qm = seg.match(/^(\d+)\s+(.+)$/) || seg.match(/^(.+)\s+(\d+)$/);
            let qty = 1, name = seg;
            if (qm) {
              if (/^\d+$/.test(qm[1])) { qty = Math.min(parseInt(qm[1],10),20); name = qm[2]; }
              else { qty = Math.min(parseInt(qm[2],10),20); name = qm[1]; }
            }
            return { qty, name, item: findMenuItem(name) };
          }).filter(p => p.item);

          if (parsed.length >= 1) {
            const lines = [];
            parsed.forEach(({ item, qty }) => {
              addToCart({ id: item.id, databaseId: item.id, name: item.name,
                price: Number(item.price), image: item.image, quantity: qty, selectedExtras: [] });
              lastCartItemRef.current = { name: item.name, menuItem: item };
              lines.push(`${qty > 1 ? qty + "x " : ""}${item.name}`);
            });
            sendBotMsg(franco
              ? `✅ L Custom Burger nzaad 3al cart! W zedt: ${lines.join(", ")}. Baddak shi tene?`
              : `✅ Custom Burger added! Also added: ${lines.join(", ")}. Anything else?`);
            return true;
          }
        }

        sendBotMsg(franco
          ? "✅ L Custom Burger nzaad 3al cart! Baddak shi tene?"
          : "✅ Custom Burger added to your cart! Anything else?");
        return true;
      }
      if (/\b(no|la2|cancel|2lta3)\b/i.test(lower)) {
        sendBotMsg(franco ? "Ma fi mushkele. Baddak shi tene?" : "No problem. Anything else?");
        setFlowState(FLOW.IDLE);
        customBurgerRef.current = {};
        return true;
      }
      sendBotMsg(franco ? "Yes wala no?" : "Yes or no?");
      return true;
    }

    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    setInput("");
    inputRef.current?.focus();

    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    addMessage(tableId, userMsg);

    if (chatStatusRef.current === "admin") return;

    // Record the user's turn ONCE here. All bot replies are recorded by
    // sendBotMsg (or explicitly for the Gemini path), so context stays in
    // sync no matter which branch handles the message.
    conversationHistory.current.push({ role: "user", content: text });

    // Remember the last category the customer talked about (for context).
    const mentionedCat = detectCategory(text);
    if (mentionedCat) lastCategoryRef.current = mentionedCat;

    // Custom burger flow FIRST
    if (handleOrderFlow(text)) return;

    // Edit the last added item? ("remove onions", "add cheese", "note: ...")
    // Only when there IS a recent item, so unrelated "no"/"add" don't trigger.
    if (lastCartItemRef.current) {
      const franco = isFranco(text);
      const editReply = tryEditLastItem(text, franco);
      if (editReply) {
        sendBotMsg(editReply);
        return;
      }
    }

    // Cart total / show cart — answer locally (Gemini doesn't see the cart).
    const franco = isFranco(text);
    const lower  = text.toLowerCase();
    if (/\b(total|addesh|2addesh|kaddesh|kam sar|how much|shu l total|shu sar|price now|l total|3adesh|addash)\b/i.test(lower)) {
      const cartArr = Array.isArray(cart) ? cart : [];
      if (cartArr.length === 0) {
        sendBotMsg(franco ? "L cart fadye hala2." : "Your cart is empty right now.");
      } else {
        const getLinePrice = item => {
          const ex = Array.isArray(item.selectedExtras)
            ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0) : 0;
          return (Number(item.price) || 0) + ex;
        };
        const subtotal = cartArr.reduce((a, i) => a + getLinePrice(i) * i.quantity, 0);
        const vat      = subtotal * 0.11;
        const total    = subtotal + vat;
        sendBotMsg(franco
          ? `L subtotal hala2 $${subtotal.toFixed(2)} + VAT $${vat.toFixed(2)} = $${total.toFixed(2)} total. Baddak shi tene?`
          : `Subtotal is $${subtotal.toFixed(2)} + VAT $${vat.toFixed(2)} = $${total.toFixed(2)} total. Anything else?`);
      }
      return;
    }

    if (/\b(shu 3ande|shu 3andi|show cart|show order|shu bel cart|shu b cart|my order|l cart|hal2 3ande|addesh 3ande|sar 3ande|shu items|what.*cart|cart.*items|summary|list.*order|order.*list|shu fi cart|shu fi bel cart|my items|show my order|3ande shu|shu tabba3ti|shu tabba3ne)\b/i.test(lower)) {
      const cartArr = Array.isArray(cart) ? cart : [];
      if (cartArr.length === 0) {
        sendBotMsg(franco ? "L cart fadye hala2." : "Your cart is empty right now.");
      } else {
        const getLinePrice = item => {
          const ex = Array.isArray(item.selectedExtras)
            ? item.selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0) : 0;
          return (Number(item.price) || 0) + ex;
        };
        const lines = cartArr.map(i => {
          const qty = i.quantity > 1 ? `${i.quantity}x ` : "";
          const price = `$${(getLinePrice(i) * i.quantity).toFixed(2)}`;
          return `• ${qty}${i.name} ${price}`;
        });
        const subtotal = cartArr.reduce((a, i) => a + getLinePrice(i) * i.quantity, 0);
        sendBotMsg(franco
          ? `Hala2 3andak:\n${lines.join("\n")}\n\nSubtotal: $${subtotal.toFixed(2)}. Baddak shi tene?`
          : `Your current order:\n${lines.join("\n")}\n\nSubtotal: $${subtotal.toFixed(2)}. Anything else?`);
      }
      return;
    }

    const autoReply = checkAutoRules(text);
    if (autoReply) {
      // If this auto-rule described a SPECIFIC menu item (not category/hours),
      // append a "want to add it?" nudge and enter CONFIRM_ITEM so the customer
      // can immediately say "yes", "bde yaha", "sheel tomato", etc.
      const mentionedItem = findMenuItem(text);
      if (mentionedItem) {
        const nudge = franco
          ? `\n\nBaddak zeedo 3al cart wala t3addel 3laya?`
          : `\n\nWant to add it to your cart or customize it?`;
        sendBotMsg(autoReply + nudge);
        pendingItemRef.current = mentionedItem;
        setFlowState(FLOW.CONFIRM_ITEM);
      } else {
        sendBotMsg(autoReply);
      }
      return;
    }

    // Named an item without "bade"? Describe it and ask if they want it added.
    const namedItem = findMenuItem(text);
    if (namedItem) {
      const franco = isFranco(text);
      const price = Number(namedItem.price).toFixed(2);
      const desc = namedItem.description ? ` — ${namedItem.description}` : "";
      const ask = franco
        ? `${namedItem.name} $${price}${desc}\n\nBaddak zeedo 3al cart? (eh/la2)`
        : `${namedItem.name} $${price}${desc}\n\nWould you like to add it to your cart? (yes/no)`;
      pendingItemRef.current = namedItem;
      setFlowState(FLOW.CONFIRM_ITEM);
      sendBotMsg(ask);
      return;
    }

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

      if (raw.includes("CUSTOM_ORDER:")) {
        const match = raw.match(/CUSTOM_ORDER:(\{[\s\S]*?\})/);
        if (match) {
          try {
            const orderData = JSON.parse(match[1]);
            addCustomOrder(tableId, orderData);
            addCustomOrderToCart(orderData);
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
        raw = raw.replace(/CUSTOM_ORDER:[\s\S]*/, "").trim();
      }

      if (raw.includes("CART_ADD:")) {
        // Handle ALL CART_ADD lines (Gemini may write multiple for quantity)
        const cartLines = raw.match(/CART_ADD:[^\n]+/g) || [];
        cartLines.forEach((line) => {
          const itemName = line.replace("CART_ADD:", "").trim();
          if (!itemName) return;
          if (itemName.toLowerCase().includes("custom")) {
            const lastCustom = conversationHistory.current
              .filter(m => m.role === "assistant")
              .reverse()
              .find(m => m.content?.includes("beef") || m.content?.includes("chicken") ||
                         m.content?.includes("Beef") || m.content?.includes("Chicken"));
            addCustomOrderToCart({
              bread: "brioche",
              protein: lastCustom?.content?.toLowerCase().includes("chicken") ? "Chicken" : "Beef",
              cheese: "", veggies: "", sauce: "", price: BASE_PRICE,
            });
          } else {
            addItemToCartByName(itemName);
          }
        });
        // Remove ALL CART_ADD lines from the displayed message
        raw = raw.replace(/CART_ADD:[^\n]+\n?/g, "").trim();
      }

      if (chatStatusRef.current === "admin") { setIsLoading(false); return; }

      if (raw.includes("NEED_ADMIN:")) {
        const reason = raw.match(/NEED_ADMIN:(\w+)/)?.[1] || "assistance";
        raw = raw.replace(/NEED_ADMIN:\w+/, "").trim();
        const reasonMap = {
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
        escalateToAdmin(reasonMap[reason] || reason);
        setIsLoading(false);
        return;
      }

      if (raw) {
        const botMsg = { sender: "bot", text: raw };
        setMessages((prev) => [...prev, botMsg]);
        addMessage(tableId, botMsg);
        conversationHistory.current.push({ role: "assistant", content: raw });
      }

    } catch (err) {
      console.error("Chat error:", err.message);

      const lowerText = text.toLowerCase();
      const franco = isFranco(text);

      const matchedItem = findMenuItem(text);

      let fallbackText;
      if (matchedItem) {
        fallbackText = `${matchedItem.name} $${Number(matchedItem.price).toFixed(2)}${matchedItem.description ? ' — ' + matchedItem.description : ''}`;
      } else if (lowerText.match(/\b(recommend|atyab|ahla|a7la|tastiest|best|popular|favorite|favourite|btensa7)\b/i)) {
        const cat = detectCategory(text) || lastCategoryRef.current;
        fallbackText = recommendFor(cat, franco);
      } else if (lowerText.match(/\b(price|kam|how much|2adde|2addesh|kaddesh)\b/i)) {
        fallbackText = franco
          ? "Shu baddak ta3reflo l se3r? 2elne l esem!"
          : "Which item would you like the price for?";
      } else if (lowerText.match(/\b(order|bde|i want|want|baddi)\b/i)) {
        fallbackText = franco
          ? "Akid! 2elne shu baddak men l menu, aw ektob 'bde burger' ta na3mellak custom."
          : "Sure! Tell me what you'd like from the menu, or type 'I want burger' for a custom one.";
      } else if (lowerText.match(/\b(burger|sandwich|salad|drink|fries|appetizer|dip)\b/i)) {
        fallbackText = franco
          ? "3anna burgers, sandwiches, salads, appetizers, dips w drinks. Shu baddak tshouf?"
          : "We have burgers, sandwiches, salads, appetizers, dips and drinks. What would you like to see?";
      } else {
        fallbackText = franco
          ? "Bensa7ak tjarreb l Classic Burger aw l Grilled Chicken Sandwich! Aw es2alne 3l menu, prices, aw l hours."
          : "I'd suggest the Classic Burger or the Grilled Chicken Sandwich! Or ask me about the menu, prices, or hours.";
      }

      const errMsg = { sender: "bot", text: fallbackText };
      setMessages(prev => [...prev, errMsg]);
      addMessage(tableId, errMsg);
    }

    setIsLoading(false);
  };

  const isAdminActive = chatStatus === "admin";

  return (
    <>
      {!isOpen && (
  <button className="chat-bubble-btn" onClick={() => setIsOpen(true)}>
    💬
    {(hasNewAdminMsg || isAdminActive) && (
      <span className="chat-bubble-dot" />
    )}
  </button>
)}

      {isOpen && (
        <div className="chat-window glass-effect-chat">
          <div className={`chat-header ${isAdminActive ? "chat-header--admin" : ""}`}>
           <div className="chat-header-inner">
            <h3>{isAdminActive ? "Staff Connected" : "Snack Assistant"}</h3>
            <div className="chat-header-right">
              <span className="table-badge">Table {tableId}</span>
              <button className="chat-close-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">✕</button>
            </div>
          </div>
          </div>

          <div className="chat-body">
            {messages.map((msg, i) => {
              if (msg.sender === "system") {
                return (
                  <div key={i} className="system-message-row">
                    <span className="system-message">{msg.text}</span>
                  </div>
                );
              }
              return (
                <div key={i} className={`chat-message-wrapper ${msg.sender === "user" ? "user-wrapper" : "bot-wrapper"}`}>
                  {msg.sender === "admin" && <span className="admin-label">Staff</span>}
                  <div className={`chat-message ${
                    msg.sender === "user" ? "user-message" :
                    msg.sender === "admin" ? "admin-message" : "bot-message"
                  }`}>
                    {msg.text}
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
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder={isAdminActive ? "A staff member will reply shortly..." : "Ask me anything..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button className="chat-send-btn" onClick={handleSend} disabled={isLoading}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;