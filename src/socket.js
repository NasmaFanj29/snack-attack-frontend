import { io } from "socket.io-client";

const URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://snack-attack-backend.onrender.com";

const socket = io(URL, {
  transports: ["websocket"],
});

export default socket;