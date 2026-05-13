import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: false, // Prevent immediate connection with null token
});

// Automatically trigger registration of private user room when connected
socket.on("connect", () => {
  const userId = localStorage.getItem("userId");
  if (userId) {
    socket.emit("register-user", userId);
  }
});

// Utility to connect or reconnect with fresh credentials
export const reconnectSocket = () => {
  const token = localStorage.getItem("token");
  if (token) {
    socket.auth = { token };
    socket.disconnect(); // Cleanly shut down any existing connection handshake
    socket.connect();    // Establish a fresh connection with the active token
  } else {
    socket.disconnect();
  }
};

// Auto-connect immediately if a token exists on module load
const existingToken = localStorage.getItem("token");
if (existingToken) {
  socket.auth = { token: existingToken };
  socket.connect();
}

export default socket;
