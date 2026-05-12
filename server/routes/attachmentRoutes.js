const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/fileUploadMiddleware");
const {
  uploadAttachment,
  deleteAttachment,
} = require("../controllers/attachmentController");

router.post(
  "/:noteId",
  authMiddleware,
  upload.single("file"),
  uploadAttachment,
);
router.delete("/:noteId/:attachmentId", authMiddleware, deleteAttachment);

module.exports = router;
