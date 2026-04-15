import React, { useState, useRef, useEffect } from "react";
import "../style/chatbot.css"; // Make sure to create this file!

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: "bot", text: "Hi there! 🍔 I'm your Snack Attack assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when a new message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        // Add user message
        const userMsg = { sender: "user", text: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        // TODO: Here we will send the message to your Node.js Backend later!
        // For now, let's just simulate the bot thinking and replying
        setTimeout(() => {
            setMessages((prev) => [...prev, { sender: "bot", text: "I'm still learning! Soon I'll connect to the AI brain. 🧠" }]);
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSend();
    };

    return (
        <>
            {/* The Floating Bubble Button */}
            <button className="chat-bubble-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? "✖" : "💬"}
            </button>

            {/* The Chat Window */}
            {isOpen && (
                <div className="chat-window glass-effect-chat">
                    <div className="chat-header">
                        <h3>🤖 Snack Assistant</h3>
                    </div>
                    
                    <div className="chat-body">
                        {messages.map((msg, index) => (
                            <div key={index} className={`chat-message-wrapper ${msg.sender === "user" ? "user-wrapper" : "bot-wrapper"}`}>
                                <div className={`chat-message ${msg.sender === "user" ? "user-message" : "bot-message"}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-footer">
                        <input
                            type="text"
                            placeholder="Ask me anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="chat-input"
                        />
                        <button className="chat-send-btn" onClick={handleSend}>➤</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default Chatbot;