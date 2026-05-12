const Note = require("../models/Note");

const uploadAttachment = async (req, res) => {
  try {
    const { noteId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.owner.toString() === req.user.id;
    const isSharedUser = note.sharedWith.some(
      (userId) => userId.toString() === req.user.id,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/files/${req.file.filename}`;

    const newAttachment = {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedAt: new Date(),
    };

    note.attachments.push(newAttachment);
    await note.save();

    res.status(200).json({
      message: "Attachment uploaded successfully",
      attachment: note.attachments[note.attachments.length - 1],
    });
  } catch (error) {
    console.error("Upload attachment error:", error.message);
    res.status(500).json({ message: "Attachment upload failed" });
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const { noteId, attachmentId } = req.params;

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.owner.toString() === req.user.id;
    const isSharedUser = note.sharedWith.some(
      (userId) => userId.toString() === req.user.id,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const attachment = note.attachments.id(attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    note.attachments = note.attachments.filter(
      (item) => item._id.toString() !== attachmentId,
    );

    await note.save();

    res.status(200).json({
      message: "Attachment removed successfully",
      attachments: note.attachments,
    });
  } catch (error) {
    console.error("Delete attachment error:", error.message);
    res.status(500).json({ message: "Failed to remove attachment" });
  }
};

module.exports = {
  uploadAttachment,
  deleteAttachment,
};
