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

const syncSharedWithList = async (syncGroupId) => {
  if (!syncGroupId) return;

  // Find all notes in this sync group
  const notes = await Note.find({ syncGroupId });
  const owners = notes.map((n) => n.owner.toString());

  for (const n of notes) {
    // sharedWith for note n is all owners in the group except note n's owner
    const others = owners.filter((o) => o !== n.owner.toString());
    n.sharedWith = others;
    await n.save();
  }
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

    const syncGroupId = note.syncGroupId;

    if (syncGroupId) {
      const siblings = await Note.find({ syncGroupId });

      for (const sibling of siblings) {
        const sibTitleChanged = sibling.title !== newTitle;
        const sibContentChanged = sibling.content !== newContent;
        const sibTagsChanged = JSON.stringify(sibling.tags || []) !== JSON.stringify(newTags);

        if (sibTitleChanged || sibContentChanged || sibTagsChanged) {
          sibling.versions.push({
            title: sibling.title,
            content: sibling.content,
            tags: sibling.tags || [],
            editedAt: new Date(),
          });

          if (sibling.versions.length > MAX_VERSIONS) {
            sibling.versions = sibling.versions.slice(-MAX_VERSIONS);
          }
        }

        sibling.title = newTitle;
        sibling.content = newContent;
        sibling.tags = newTags;
        sibling.attachments = newAttachments;

        if (sibling._id.toString() === note._id.toString() && typeof isPinned === "boolean" && isOwner) {
          sibling.isPinned = isPinned;
        }

        await sibling.save();
      }
    } else {
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
    }

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

    if (note.syncGroupId) {
      const siblings = await Note.find({ syncGroupId: note.syncGroupId, _id: { $ne: note._id } });
      for (const sibling of siblings) {
        const updatedSibling = await populateNoteById(sibling._id);
        req.app.get("io").emit("note-updated", updatedSibling);
      }
    }

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

    const syncGroupId = note.syncGroupId;

    await Note.findByIdAndDelete(req.params.id);

    if (syncGroupId) {
      // Synchronize the other copies to remove this deleted user from their sharedWith list
      await syncSharedWithList(syncGroupId);
    }

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

    // Set syncGroupId on original note if it doesn't have one
    if (!note.syncGroupId) {
      note.syncGroupId = note._id.toString();
      await note.save();
    }

    const syncGroupId = note.syncGroupId;

    // Check if the note is already shared with this user (i.e. if userToShare already has a note in this sync group)
    const existingSharedCopy = await Note.findOne({
      syncGroupId,
      owner: userToShare._id,
    });

    if (existingSharedCopy) {
      return res
        .status(400)
        .json({ message: "Note already shared with this user" });
    }

    // Create a new synced copy for the collaborator
    await Note.create({
      title: note.title,
      content: note.content,
      owner: userToShare._id,
      syncGroupId,
      tags: note.tags || [],
      attachments: note.attachments || [],
      versions: note.versions || [],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
    });

    // Synchronize sharedWith lists for all copies in the group
    await syncSharedWithList(syncGroupId);

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

    const syncGroupId = note.syncGroupId;

    if (syncGroupId) {
      const siblings = await Note.find({ syncGroupId });

      for (const sibling of siblings) {
        const sibTitleChanged = sibling.title !== version.title;
        const sibContentChanged = sibling.content !== version.content;
        const sibTagsChanged = JSON.stringify(sibling.tags || []) !== JSON.stringify(restoredTags);

        if (sibTitleChanged || sibContentChanged || sibTagsChanged) {
          sibling.versions.push({
            title: sibling.title,
            content: sibling.content,
            tags: sibling.tags || [],
            editedAt: new Date(),
          });

          if (sibling.versions.length > MAX_VERSIONS) {
            sibling.versions = sibling.versions.slice(-MAX_VERSIONS);
          }
        }

        sibling.title = version.title;
        sibling.content = version.content;
        sibling.tags = restoredTags;

        await sibling.save();
      }
    } else {
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
    }

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    if (note.syncGroupId) {
      const siblings = await Note.find({ syncGroupId: note.syncGroupId, _id: { $ne: note._id } });
      for (const sibling of siblings) {
        const updatedSibling = await populateNoteById(sibling._id);
        req.app.get("io").emit("note-updated", updatedSibling);
      }
    }

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

    const syncGroupId = note.syncGroupId;

    if (syncGroupId) {
      const siblings = await Note.find({ syncGroupId });

      for (const sibling of siblings) {
        // Save current state as version
        sibling.versions.push({
          title: sibling.title,
          content: sibling.content,
          tags: sibling.tags || [],
          editedAt: new Date(),
        });

        if (sibling.versions.length > MAX_VERSIONS) {
          sibling.versions = sibling.versions.slice(-MAX_VERSIONS);
        }

        // Replace with AI content
        sibling.title = title || sibling.title;
        sibling.content = content;

        await sibling.save();
      }
    } else {
      // Save current state as version
      note.versions.push({
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        editedAt: new Date(),
      });

      if (note.versions.length > MAX_VERSIONS) {
        note.versions = note.versions.slice(-MAX_VERSIONS);
      }

      // Replace with AI content
      note.title = title || note.title;
      note.content = content;

      await note.save();
    }

    const updatedNote = await populateNoteById(note._id);

    req.app.get("io").emit("note-updated", updatedNote);

    if (note.syncGroupId) {
      const siblings = await Note.find({ syncGroupId: note.syncGroupId, _id: { $ne: note._id } });
      for (const sibling of siblings) {
        const updatedSibling = await populateNoteById(sibling._id);
        req.app.get("io").emit("note-updated", updatedSibling);
      }
    }

    res.status(200).json({
      message: "AI version saved successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Save AI Version Error:", error.message);
    res.status(500).json({ message: "Failed to save AI version" });
  }
};

// POST /api/notes/save-workspace
const saveWorkspace = async (req, res) => {
  try {
    const { roomId, title, files } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }
    if (!Array.isArray(files)) {
      return res.status(400).json({ message: "Files array is required" });
    }

    const defaultTitle = title || `Code Workspace: ${roomId}`;

    let note = await Note.findOne({ isCodeWorkspace: true, codeRoomId: roomId });

    if (note) {
      note.title = defaultTitle;
      note.content = JSON.stringify(files);
      await note.save();
    } else {
      note = await Note.create({
        title: defaultTitle,
        content: JSON.stringify(files),
        owner: req.user.id,
        isCodeWorkspace: true,
        codeRoomId: roomId,
        tags: ["Code", "Workspace"],
      });
    }

    const populatedNote = await Note.findById(note._id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    res.status(200).json(populatedNote);
  } catch (error) {
    console.error("Save Workspace Error:", error.message);
    res.status(500).json({ message: "Failed to save code workspace", error: error.message });
  }
};

// POST /api/notes/run-code
const runCode = async (req, res) => {
  try {
    const { language, version, files } = req.body;

    if (!language) {
      return res.status(400).json({ message: "Language is required" });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "Files are required and must be an array" });
    }

    const axios = require("axios");
    const pistonUrl = process.env.PISTON_URL || "https://emkc.org/api/v2/piston/execute";

    const response = await axios.post(pistonUrl, {
      language,
      version: version || "*",
      files
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Piston execution error on backend:", error.message);
    return res.status(500).json({ 
      message: "Code execution failed", 
      error: error.response?.data || error.message 
    });
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
  saveWorkspace,
  runCode,
};
