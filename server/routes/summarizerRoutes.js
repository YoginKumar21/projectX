const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { analyzeMeeting } = require("../controllers/summarizerController");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads", "meeting-files");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".webm",
  ".mp4",
  ".pdf",
  ".docx",
  ".txt",
]);

const allowedMimeTypes = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `meeting-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowed =
    allowedExtensions.has(extension) ||
    allowedMimeTypes.has((file.mimetype || "").toLowerCase());

  if (isAllowed) {
    return cb(null, true);
  }

  return cb(
    new Error("Only MP3, WAV, M4A, WEBM, PDF, DOCX, and TXT files are allowed.")
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.post(
  "/analyze",
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "docs", maxCount: 5 },
  ]),
  analyzeMeeting
);

module.exports = router;
