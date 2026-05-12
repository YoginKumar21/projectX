const ChatMessage = require("../models/ChatMessage");
const Note = require("../models/Note");

const getChatMessages = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.owner.toString() === userId;
    const isSharedUser = (note.sharedWith || []).some(
      (id) => id.toString() === userId,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await ChatMessage.find({ note: noteId })
      .sort({ createdAt: 1 })
      .limit(100);

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get chat messages error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getChatMessages };
