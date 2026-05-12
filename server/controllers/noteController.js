const Note = require("../models/Note");
const User = require("../models/User");
const createNotification = require("../utils/createNotification");

const MAX_VERSIONS = 10;

const cleanTags = (tags) => {
  return Array.isArray(tags)
    ? [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))]
    : [];
};

const canAccessNote = (note, userId) => {
  const isOwner = note.owner.toString() === userId;
  const isSharedUser = (note.sharedWith || []).some(
    (sharedUserId) => sharedUserId.toString() === userId,
  );

  return { isOwner, isSharedUser };
};

const populateNoteById = async (noteId) => {
  return Note.findById(noteId)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");
};

// POST /api/notes
const createNote = async (req, res) => {
  try {
    const { title, content, tags, attachments, isPinned } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    const note = await Note.create({
      title,
      content: content || "",
      tags: cleanTags(tags),
      attachments: Array.isArray(attachments) ? attachments : [],
      owner: req.user.id,
      sharedWith: [],
      versions: [],
      isPinned: Boolean(isPinned),
      isArchived: false,
      isTrashed: false,
      trashedAt: null,
      archivedAt: null,
    });

    const populatedNote = await populateNoteById(note._id);
    res.status(201).json(populatedNote);
  } catch (error) {
    console.error("Create note error:", error.message);
    res.status(500).json({
      message: "Server error while creating note",
    });
  }
};

// GET /api/notes
const getNotes = async (req, res) => {
  try {
    const filter = req.query.filter || "active";

    const baseQuery = {
      $or: [{ owner: req.user.id }, { sharedWith: req.user.id }],
    };

    if (filter === "archived") {
      baseQuery.isArchived = true;
      baseQuery.isTrashed = false;
    } else if (filter === "trashed") {
      baseQuery.isTrashed = true;
    } else {
      baseQuery.isArchived = false;
      baseQuery.isTrashed = false;
    }

    const notes = await Note.find(baseQuery)
      .populate("owner", "name email")
      .populate("sharedWith", "name email")
      .sort({
        isPinned: -1,
        updatedAt: -1,
      });

    res.status(200).json(notes);
  } catch (error) {
    console.error("Get notes error:", error.message);
    res.status(500).json({
      message: "Server error while fetching notes",
    });
  }
};

// GET /api/notes/:id
const getSingleNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const ownerId = note.owner?._id
      ? note.owner._id.toString()
      : note.owner.toString();
    const isOwner = ownerId === req.user.id;
    const isSharedUser = (note.sharedWith || []).some(
      (user) => user._id.toString() === req.user.id,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error("Get single note error:", error.message);
    res.status(500).json({
      message: "Server error while fetching note",
    });
  }
};

// PUT /api/notes/:id
const updateNote = async (req, res) => {
  try {
    const { title, content, tags, attachments, isPinned } = req.body;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const { isOwner, isSharedUser } = canAccessNote(note, req.user.id);

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (note.isTrashed) {
      return res.status(400).json({
        message: "Cannot edit a note in trash. Restore it first.",
      });
    }

    const newTitle = title ?? note.title;
    const newContent = content ?? note.content;
    const newTags = Array.isArray(tags) ? cleanTags(tags) : note.tags || [];
    const newAttachments = Array.isArray(attachments)
      ? attachments
      : note.attachments || [];

    const titleChanged = note.title !== newTitle;
    const contentChanged = note.content !== newContent;
    const tagsChanged =
      JSON.stringify(note.tags || []) !== JSON.stringify(newTags);
    const attachmentsChanged =
      JSON.stringify(note.attachments || []) !== JSON.stringify(newAttachments);

    if (titleChanged || contentChanged || tagsChanged) {
      note.versions.push({
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        editedAt: new Date(),
      });

      if (note.versions.length > MAX_VERSIONS) {
        note.versions = note.versions.slice(-MAX_VERSIONS);
      }
    }

    note.title = newTitle;
    note.content = newContent;
    note.tags = newTags;
    note.attachments = newAttachments;

    if (typeof isPinned === "boolean" && isOwner) {
      note.isPinned = isPinned;
    }

    await note.save();

    if (
      (titleChanged || contentChanged || tagsChanged || attachmentsChanged) &&
      note.sharedWith?.length > 0
    ) {
      const io = req.app.get("io");
      const recipients = new Set();

      if (note.owner.toString() !== req.user.id) {
        recipients.add(note.owner.toString());
      }

      note.sharedWith.forEach((userId) => {
        if (userId.toString() !== req.user.id) {
          recipients.add(userId.toString());
        }
      });

      await Promise.all(
        [...recipients].map((recipientId) =>
          createNotification({
            io,
            recipient: recipientId,
            sender: req.user.id,
            senderName: req.user.name,
            note: note._id,
            type: "update",
            message: `${req.user.name} updated the note "${note.title}"`,
          }),
        ),
      );
    }

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    res.json(updatedNote);
  } catch (error) {
    console.error("Update note error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notes/:id/pin
const togglePinNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can pin or unpin this note",
      });
    }

    if (note.isTrashed) {
      return res.status(400).json({
        message: "Cannot pin a note in trash",
      });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    res.status(200).json(updatedNote);
  } catch (error) {
    console.error("Toggle pin error:", error.message);
    res.status(500).json({
      message: "Server error while updating pin status",
    });
  }
};

// PUT /api/notes/:id/archive
const toggleArchiveNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can archive or unarchive this note",
      });
    }

    if (note.isTrashed) {
      return res.status(400).json({
        message: "Cannot archive a note in trash",
      });
    }

    note.isArchived = !note.isArchived;
    note.archivedAt = note.isArchived ? new Date() : null;

    await note.save();

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    res.status(200).json({
      message: note.isArchived
        ? "Note archived successfully"
        : "Note restored from archive successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Toggle archive error:", error.message);
    res.status(500).json({
      message: "Server error while updating archive status",
    });
  }
};

// PUT /api/notes/:id/restore
const restoreNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can restore this note",
      });
    }

    note.isTrashed = false;
    note.trashedAt = null;

    await note.save();

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    res.status(200).json({
      message: "Note restored successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Restore note error:", error.message);
    res.status(500).json({
      message: "Server error while restoring note",
    });
  }
};

// DELETE /api/notes/:id
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    if (!note.owner) {
      return res.status(500).json({
        message: "Note owner missing",
      });
    }

    const ownerId = note.owner.toString();

    if (ownerId !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can delete this note",
      });
    }

    note.isTrashed = true;
    note.trashedAt = new Date();
    note.isArchived = false;
    note.archivedAt = null;
    note.isPinned = false;

    await note.save();

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    return res.status(200).json({
      message: "Note moved to trash successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Delete note error:", error);
    return res.status(500).json({
      message: "Server error while deleting note",
      error: error.message,
    });
  }
};

// DELETE /api/notes/:id/permanent
const permanentlyDeleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    if (note.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can permanently delete this note",
      });
    }

    await Note.findByIdAndDelete(req.params.id);

    req.app.get("io").emit("note-deleted", {
      _id: req.params.id,
    });

    return res.status(200).json({
      message: "Note permanently deleted",
    });
  } catch (error) {
    console.error("Permanent delete note error:", error.message);
    return res.status(500).json({
      message: "Server error while permanently deleting note",
    });
  }
};

// POST /api/notes/:noteId/share
const shareNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only owner can share this note" });
    }

    const userToShare = await User.findOne({ email });

    if (!userToShare) {
      return res
        .status(404)
        .json({ message: "User with this email not found" });
    }

    if (userToShare._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You already own this note" });
    }

    const alreadyShared = (note.sharedWith || []).some(
      (userId) => userId.toString() === userToShare._id.toString(),
    );

    if (alreadyShared) {
      return res
        .status(400)
        .json({ message: "Note already shared with this user" });
    }

    note.sharedWith.push(userToShare._id);
    await note.save();

    const io = req.app.get("io");

    await createNotification({
      io,
      recipient: userToShare._id,
      sender: req.user.id,
      senderName: req.user.name,
      note: note._id,
      type: "share",
      message: `${req.user.name} shared the note "${note.title}" with you`,
    });

    const updatedNote = await populateNoteById(noteId);

    res.status(200).json({
      message: "Note shared successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Share note error:", error.message);
    res.status(500).json({ message: "Server error while sharing note" });
  }
};

// GET /api/notes/:id/versions
const getNoteVersions = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .select("versions owner sharedWith")
      .populate("sharedWith", "name email");

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.owner.toString() === req.user.id;
    const isSharedUser = (note.sharedWith || []).some(
      (user) => user._id.toString() === req.user.id,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(note.versions.slice().reverse());
  } catch (error) {
    console.error("Get versions error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notes/:noteId/restore/:versionId
const restoreVersion = async (req, res) => {
  try {
    const note = await Note.findById(req.params.noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const { isOwner, isSharedUser } = canAccessNote(note, req.user.id);

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const version = note.versions.id(req.params.versionId);

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    const restoredTags = version.tags || [];

    const titleChanged = note.title !== version.title;
    const contentChanged = note.content !== version.content;
    const tagsChanged =
      JSON.stringify(note.tags || []) !== JSON.stringify(restoredTags);

    if (titleChanged || contentChanged || tagsChanged) {
      note.versions.push({
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        editedAt: new Date(),
      });

      if (note.versions.length > MAX_VERSIONS) {
        note.versions = note.versions.slice(-MAX_VERSIONS);
      }
    }

    note.title = version.title;
    note.content = version.content;
    note.tags = restoredTags;

    await note.save();

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    res.json(updatedNote);
  } catch (error) {
    console.error("Restore version error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
// POST /api/notes/:id/save-ai-version
const saveAIVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "AI content is required" });
    }

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const { isOwner, isSharedUser } = canAccessNote(note, req.user.id);

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Save current state as version
    note.versions.push({
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      editedAt: new Date(),
    });

    // Replace with AI content
    note.title = title || note.title;
    note.content = content;

    if (note.versions.length > MAX_VERSIONS) {
      note.versions = note.versions.slice(-MAX_VERSIONS);
    }

    await note.save();

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    res.status(200).json({
      message: "AI version saved successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Save AI Version Error:", error.message);
    res.status(500).json({ message: "Failed to save AI version" });
  }
};
module.exports = {
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
};
