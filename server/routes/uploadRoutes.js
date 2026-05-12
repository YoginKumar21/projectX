const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const { uploadImage } = require("../controllers/uploadController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/image", authMiddleware, upload.single("image"), uploadImage);

module.exports = router;
