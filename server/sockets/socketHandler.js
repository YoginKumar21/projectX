const ChatMessage = require("../models/ChatMessage");
const Note = require("../models/Note");
const User = require("../models/User");
const createNotification = require("../utils/createNotification");

const noteUsers = {};

const cursorColors = [
  "#ff4d4f",
  "#52c41a",
  "#1890ff",
  "#faad14",
  "#722ed1",
  "#13c2c2",
  "#eb2f96",
  "#fa8c16",
];

function getUserColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return cursorColors[Math.abs(hash) % cursorColors.length];
}

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // =========================
    // REGISTER USER ROOM
    // =========================
    socket.on("register-user", (userId) => {
      if (!userId) return;

      socket.join(`user:${userId}`);
      socket.registeredUserId = userId;

      console.log(`User ${userId} joined room user:${userId}`);
    });

    // =========================
    // NOTE ROOM JOIN
    // =========================
    socket.on("join-note", ({ noteId, userId, userName }) => {
      if (!noteId || !userId || !userName) return;

      socket.join(noteId);

      socket.noteId = noteId;
      socket.userId = userId;
      socket.userName = userName;

      if (!noteUsers[noteId]) {
        noteUsers[noteId] = {};
      }

      noteUsers[noteId][socket.id] = {
        userId,
        userName,
        color: getUserColor(userId),
        x: 0,
        y: 0,
      };

      io.to(noteId).emit("collaborators-update", {
        count: Object.keys(noteUsers[noteId]).length,
      });

      io.to(noteId).emit(
        "live-cursors",
        Object.entries(noteUsers[noteId]).map(([socketId, user]) => ({
          socketId,
          userId: user.userId,
          userName: user.userName,
          color: user.color,
          x: user.x,
          y: user.y,
        })),
      );
    });

    // =========================
    // CONTENT CHANGES
    // =========================
    socket.on("send-changes", ({ noteId, content }) => {
      if (!noteId) return;
      socket.to(noteId).emit("receive-changes", content);
    });

    socket.on("send-title-changes", ({ noteId, title }) => {
      if (!noteId) return;
      socket.to(noteId).emit("receive-title-changes", title);
    });

    // =========================
    // TYPING
    // =========================
    socket.on("typing", ({ noteId, userName }) => {
      if (!noteId) return;
      socket.to(noteId).emit("user-typing", { userName });
    });

    socket.on("stop-typing", ({ noteId }) => {
      if (!noteId) return;
      socket.to(noteId).emit("user-stop-typing");
    });

    // =========================
    // LIVE CURSOR
    // =========================
    socket.on("cursor-move", ({ noteId, x, y }) => {
      if (!noteId || !noteUsers[noteId] || !noteUsers[noteId][socket.id]) {
        return;
      }

      noteUsers[noteId][socket.id].x = x;
      noteUsers[noteId][socket.id].y = y;

      const user = noteUsers[noteId][socket.id];

      socket.to(noteId).emit("cursor-update", {
        socketId: socket.id,
        userId: user.userId,
        userName: user.userName,
        color: user.color,
        x,
        y,
      });
    });

    // =========================
    // CHAT MESSAGE
    // =========================
    socket.on("send-message", async ({ noteId, userId, text }) => {
      try {
        if (!noteId || !userId || !text || !text.trim()) return;

        const note = await Note.findById(noteId).select(
          "owner sharedWith title",
        );
        if (!note) return;

        const isOwner = note.owner.toString() === userId;
        const isSharedUser = (note.sharedWith || []).some(
          (id) => id.toString() === userId,
        );

        if (!isOwner && !isSharedUser) return;

        const user = await User.findById(userId);
        if (!user) return;

        const newMessage = await ChatMessage.create({
          note: noteId,
          sender: userId,
          senderName: user.name,
          text: text.trim(),
        });

        const recipientIds = new Set();

        if (note.owner.toString() !== userId) {
          recipientIds.add(note.owner.toString());
        }

        (note.sharedWith || []).forEach((sharedUserId) => {
          if (sharedUserId.toString() !== userId) {
            recipientIds.add(sharedUserId.toString());
          }
        });

        if (recipientIds.size > 0) {
          await Promise.all(
            [...recipientIds].map((recipientId) =>
              createNotification({
                io,
                recipient: recipientId,
                sender: userId,
                senderName: user.name,
                note: noteId,
                type: "chat",
                message: `${user.name} sent a message in "${note.title}"`,
              }),
            ),
          );
        }

        io.to(noteId).emit("receive-message", {
          _id: newMessage._id,
          note: newMessage.note,
          sender: newMessage.sender,
          senderName: newMessage.senderName,
          text: newMessage.text,
          createdAt: newMessage.createdAt,
        });
      } catch (error) {
        console.error("Send message socket error:", error.message);
      }
    });

    // =========================
    // DISCONNECT
    // =========================
    socket.on("disconnect", () => {
      const noteId = socket.noteId;

      if (noteId && noteUsers[noteId]) {
        delete noteUsers[noteId][socket.id];

        io.to(noteId).emit("remove-cursor", { socketId: socket.id });

        io.to(noteId).emit("collaborators-update", {
          count: Object.keys(noteUsers[noteId]).length,
        });

        io.to(noteId).emit(
          "live-cursors",
          Object.entries(noteUsers[noteId]).map(([socketId, user]) => ({
            socketId,
            userId: user.userId,
            userName: user.userName,
            color: user.color,
            x: user.x,
            y: user.y,
          })),
        );

        if (Object.keys(noteUsers[noteId]).length === 0) {
          delete noteUsers[noteId];
        }
      }

      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
