const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");
const summarizerRoutes = require("./routes/summarizerRoutes");

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // server-to-server / curl / postman
  if (allowedOrigins.includes(origin)) return true;
  return /^https?:\/\/localhost:\d+$/.test(origin);
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/summarizer", summarizerRoutes);
app.get("/", (req, res) => {
  res.send("SyncPad API running...");
});

module.exports = app;
