import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true,
  transports: ["websocket", "polling"],
  auth: (cb) => {
    cb({
      token: localStorage.getItem("token")
    });
  }
});

export default socket;
