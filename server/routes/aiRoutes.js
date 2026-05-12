const express = require("express");
const router = express.Router();

const { handleAIAction, handleAIChat } = require("../controllers/aiController");

router.post("/action", handleAIAction);
router.post("/chat", handleAIChat);

module.exports = router;
