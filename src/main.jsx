import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";
import { initNotificationListener } from "./utils/notificationListener";

initNotificationListener();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: "14px",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1px solid #334155",
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);