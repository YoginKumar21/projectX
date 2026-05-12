const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createNote,
  getNotes,
  getSingleNote,
  updateNote,
  togglePinNote,
  deleteNote,
  permanentlyDeleteNote,
  toggleArchiveNote,
  restoreNote,
  shareNote,
  getNoteVersions,
  restoreVersion,
  saveAIVersion,
} = require("../controllers/noteController");

// Create + Get all notes
router.route("/").post(protect, createNote).get(protect, getNotes);

// Single note
router.get("/:id", protect, getSingleNote);

// Update + soft delete
router.route("/:id").put(protect, updateNote).delete(protect, deleteNote);

// Permanent delete
router.delete("/:id/permanent", protect, permanentlyDeleteNote);

// Pin / Unpin
router.put("/:id/pin", protect, togglePinNote);

// Archive / Unarchive
router.put("/:id/archive", protect, toggleArchiveNote);

// Restore from trash
router.put("/:id/restore", protect, restoreNote);

// Share note
router.post("/:noteId/share", protect, shareNote);

// Version history
router.get("/:id/versions", protect, getNoteVersions);
router.put("/:noteId/restore/:versionId", protect, restoreVersion);

// Save AI result as version
router.post("/:id/save-ai-version", protect, saveAIVersion);

module.exports = router;
