const express = require("express");
const router = express.Router();

const { getChatMessages } = require("../controllers/chatController");
const protect = require("../middleware/authMiddleware");

// GET chat messages for a note
router.get("/:noteId", protect, getChatMessages);

module.exports = router;
