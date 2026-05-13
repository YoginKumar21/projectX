const ChatMessage = require("../models/ChatMessage");
const Note = require("../models/Note");
const User = require("../models/User");
const createNotification = require("../utils/createNotification");
const jwt = require("jsonwebtoken");

const noteUsers = {};
const noteRoomCache = {};
const codeRooms = {};

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
  // Socket.io JWT authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        console.error("Socket Auth error: no token provided");
        socket.disconnect(true);
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id };
      next();
    } catch (error) {
      console.error("Socket Auth error: invalid signature or failed verification:", error.message);
      socket.disconnect(true);
      return next(new Error("Authentication error: Invalid signature"));
    }
  });

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
    // =========================
    // NOTE ROOM JOIN
    // =========================
    socket.on("join-note", async ({ noteId, userId, userName }) => {
      if (!noteId || !userId || !userName) return;

      let roomToJoin = noteId;
      try {
        const note = await Note.findById(noteId);
        if (note && note.syncGroupId) {
          roomToJoin = note.syncGroupId;
        }
      } catch (err) {
        console.error("Socket join-note find note error:", err.message);
      }

      socket.join(roomToJoin);

      noteRoomCache[noteId] = roomToJoin; // Cache the resolved noteId to roomToJoin
      socket.noteId = roomToJoin;
      socket.userId = userId;
      socket.userName = userName;

      if (!noteUsers[roomToJoin]) {
        noteUsers[roomToJoin] = {};
      }

      noteUsers[roomToJoin][socket.id] = {
        userId,
        userName,
        color: getUserColor(userId),
        x: 0,
        y: 0,
      };

      io.to(roomToJoin).emit("collaborators-update", {
        count: Object.keys(noteUsers[roomToJoin]).length,
      });

      io.to(roomToJoin).emit(
        "live-cursors",
        Object.entries(noteUsers[roomToJoin]).map(([socketId, user]) => ({
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
      const activeNoteId = socket.noteId || noteRoomCache[noteId] || noteId;
      if (!activeNoteId) return;
      socket.to(activeNoteId).emit("receive-changes", content);
    });

    socket.on("send-title-changes", ({ noteId, title }) => {
      const activeNoteId = socket.noteId || noteRoomCache[noteId] || noteId;
      if (!activeNoteId) return;
      socket.to(activeNoteId).emit("receive-title-changes", title);
    });

    socket.on("send-comments", ({ noteId, comments }) => {
      const activeNoteId = socket.noteId || noteRoomCache[noteId] || noteId;
      if (!activeNoteId) return;
      socket.to(activeNoteId).emit("receive-comments", comments);
    });

    // =========================
    // TYPING
    // =========================
    socket.on("typing", ({ noteId, userName }) => {
      const activeNoteId = socket.noteId || noteRoomCache[noteId] || noteId;
      if (!activeNoteId) return;
      socket.to(activeNoteId).emit("user-typing", { userName });
    });

    socket.on("stop-typing", ({ noteId }) => {
      const activeNoteId = socket.noteId || noteRoomCache[noteId] || noteId;
      if (!activeNoteId) return;
      socket.to(activeNoteId).emit("user-stop-typing");
    });

    // =========================
    // LIVE CURSOR
    // =========================
    socket.on("cursor-move", ({ noteId, x, y }) => {
      const activeNoteId = socket.noteId || noteRoomCache[noteId] || noteId;
      if (!activeNoteId) return;

      if (!noteUsers[activeNoteId]) {
        noteUsers[activeNoteId] = {};
      }

      if (!noteUsers[activeNoteId][socket.id]) {
        const uId = socket.userId || `guest-${socket.id}`;
        const uName = socket.userName || "Collaborator";
        noteUsers[activeNoteId][socket.id] = {
          userId: uId,
          userName: uName,
          color: getUserColor(uId),
          x: 0,
          y: 0,
        };
      }

      noteUsers[activeNoteId][socket.id].x = x;
      noteUsers[activeNoteId][socket.id].y = y;

      const user = noteUsers[activeNoteId][socket.id];

      socket.to(activeNoteId).emit("cursor-update", {
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
        const activeNoteId = socket.noteId || noteId;
        if (!activeNoteId || !userId || !text || !text.trim()) return;

        const note = await Note.findById(activeNoteId).select(
          "owner sharedWith title syncGroupId"
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
          note: activeNoteId,
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
                note: activeNoteId,
                type: "chat",
                message: `${user.name} sent a message in "${note.title}"`,
              }),
            ),
          );
        }

        io.to(activeNoteId).emit("receive-message", {
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

    // ==========================================
    // COLLABORATIVE CODE EDITOR (VS CODE STYLE)
    // ==========================================

    socket.on("join-room", async ({ roomId, userId, userName }) => {
      if (!roomId) return;

      // Restrict Code Workspaces to authorized owner and shared collaborators
      try {
        const workspace = await Note.findOne({ isCodeWorkspace: true, codeRoomId: roomId });
        if (workspace) {
          const ownerId = workspace.owner.toString();
          const isOwner = ownerId === userId;
          const isCollaborator = (workspace.sharedWith || []).some(id => id.toString() === userId);

          if (!isOwner && !isCollaborator) {
            console.warn(`[Access Denied] User ${userId} unauthorized to join IDE room ${roomId}`);
            socket.emit("access-denied", { message: "Access Denied: You are not authorized to join this collaborative workspace!" });
            return;
          }
        }
      } catch (err) {
        console.error("Workspace secure join authorization failed:", err.message);
      }

      socket.join(`room:${roomId}`);
      socket.codeRoomId = roomId;

      if (!codeRooms[roomId]) {
        let initialFiles = [
          { name: "index.js", lang: "javascript", content: `console.log("Hello, Real-time Collaborative Editor!");\n\nfunction add(a, b) {\n  return a + b;\n}\n\nconsole.log("2 + 3 =", add(2, 3));\n` },
          { name: "script.py", lang: "python", content: `def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Collaborators")\n` },
          { name: "index.html", lang: "html", content: `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body {\n      background: #0f172a;\n      color: #e2e8f0;\n      font-family: sans-serif;\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      justify-content: center;\n      height: 100vh;\n      margin: 0;\n    }\n    h1 {\n      color: #10b981;\n      text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);\n    }\n    p {\n      font-size: 1.1rem;\n      opacity: 0.8;\n    }\n    button {\n      background: #10b981;\n      color: white;\n      border: none;\n      padding: 10px 20px;\n      border-radius: 8px;\n      cursor: pointer;\n      font-weight: bold;\n      transition: 0.2s;\n    }\n    button:hover { background: #059669; }\n  </style>\n</head>\n<body>\n  <h1>Welcome to Collaborative SyncPad Code IDE</h1>\n  <p>Modify files on the left and see changes instantly!</p>\n  <button onclick="showAlert()">Interactive Button</button>\n  \n  <script>\n    function showAlert() {\n      alert("Interactivity works! Build your frontend application here.");\n    }\n  </script>\n</body>\n</html>\n` },
          { name: "main.c", lang: "c", content: `#include <stdio.h>\n\nint main() {\n    printf("Hello, real-time collaborative C editor!\\n");\n    return 0;\n}\n` }
        ];

        try {
          const savedWorkspace = await Note.findOne({ isCodeWorkspace: true, codeRoomId: roomId });
          if (savedWorkspace && savedWorkspace.content) {
            initialFiles = JSON.parse(savedWorkspace.content);
          }
        } catch (error) {
          console.error("Failed to restore workspace from DB:", error.message);
        }

        codeRooms[roomId] = {
          files: initialFiles,
          users: {},
          chat: []
        };
      }

      const color = getUserColor(userId || socket.id);
      codeRooms[roomId].users[socket.id] = {
        socketId: socket.id,
        userId: userId || socket.id,
        userName: userName || "Anonymous Developer",
        color,
        activeFile: "index.js",
        isTyping: false
      };

      // Notify user of room contents and details
      socket.emit("room-init", {
        files: codeRooms[roomId].files,
        users: Object.values(codeRooms[roomId].users),
        chat: codeRooms[roomId].chat,
        myId: socket.id
      });

      // Broadcast users list update
      io.to(`room:${roomId}`).emit("code-room-users", {
        users: Object.values(codeRooms[roomId].users)
      });

      // Insert system join message
      const sysMsg = {
        _id: "sys_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        sender: "system",
        senderName: "System",
        text: `${userName || "Developer"} joined the workspace.`,
        createdAt: new Date()
      };
      codeRooms[roomId].chat.push(sysMsg);
      io.to(`room:${roomId}`).emit("code-room-chat-message", sysMsg);
    });

    socket.on("code-sync", ({ roomId, fileName, code }) => {
      if (!roomId || !fileName) return;
      const room = codeRooms[roomId];
      if (room) {
        const file = room.files.find(f => f.name === fileName);
        if (file) {
          file.content = code;
        }
        socket.to(`room:${roomId}`).emit("code-sync-receive", { fileName, code });
      }
    });

    socket.on("file-select", ({ roomId, fileName }) => {
      if (!roomId || !fileName) return;
      if (codeRooms[roomId] && codeRooms[roomId].users[socket.id]) {
        codeRooms[roomId].users[socket.id].activeFile = fileName;
        io.to(`room:${roomId}`).emit("code-room-users", {
          users: Object.values(codeRooms[roomId].users)
        });
      }
    });

    socket.on("create-file", ({ roomId, fileName, lang, isFolder }) => {
      if (!roomId || !fileName) return;
      const room = codeRooms[roomId];
      if (room && !room.files.some(f => f.name === fileName)) {
        room.files.push({ name: fileName, lang: lang || "", content: "", isFolder: isFolder || false });
        io.to(`room:${roomId}`).emit("file-created", { files: room.files, fileName });
      }
    });

    socket.on("delete-file", ({ roomId, fileName }) => {
      if (!roomId || !fileName) return;
      const room = codeRooms[roomId];
      if (room) {
        room.files = room.files.filter(f => f.name !== fileName);
        io.to(`room:${roomId}`).emit("file-deleted", { files: room.files, fileName });
      }
    });

    socket.on("chat-message", ({ roomId, userId, userName, text }) => {
      if (!roomId || !text || !text.trim()) return;
      if (codeRooms[roomId]) {
        const msg = {
          _id: "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          sender: socket.id,
          userId,
          senderName: userName,
          text: text.trim(),
          createdAt: new Date()
        };
        codeRooms[roomId].chat.push(msg);
        io.to(`room:${roomId}`).emit("code-room-chat-message", msg);
      }
    });

    socket.on("typing", ({ roomId, isTyping }) => {
      if (!roomId) return;
      if (codeRooms[roomId] && codeRooms[roomId].users[socket.id]) {
        codeRooms[roomId].users[socket.id].isTyping = isTyping;
        socket.to(`room:${roomId}`).emit("user-typing-update", {
          socketId: socket.id,
          userName: codeRooms[roomId].users[socket.id].userName,
          isTyping
        });
      }
    });

    socket.on("cursor-move", ({ roomId, cursor }) => {
      if (!roomId) return;
      if (codeRooms[roomId] && codeRooms[roomId].users[socket.id]) {
        socket.to(`room:${roomId}`).emit("cursor-update-receive", {
          socketId: socket.id,
          userId: codeRooms[roomId].users[socket.id].userId,
          userName: codeRooms[roomId].users[socket.id].userName,
          color: codeRooms[roomId].users[socket.id].color,
          cursor
        });
      }
    });

    // =========================
    // DISCONNECT
    // =========================
    socket.on("disconnect", () => {
      const noteId = socket.noteId;
      const roomId = socket.codeRoomId;

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

      if (roomId && codeRooms[roomId]) {
        const userObj = codeRooms[roomId].users[socket.id];
        const userName = userObj ? userObj.userName : "Someone";
        
        delete codeRooms[roomId].users[socket.id];

        // Notify room members
        io.to(`room:${roomId}`).emit("code-room-users", {
          users: Object.values(codeRooms[roomId].users)
        });

        // Push a system left message
        const sysMsg = {
          _id: "sys_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          sender: "system",
          senderName: "System",
          text: `${userName} left the workspace.`,
          createdAt: new Date()
        };
        codeRooms[roomId].chat.push(sysMsg);
        io.to(`room:${roomId}`).emit("code-room-chat-message", sysMsg);

        // Clean up empty room
        if (Object.keys(codeRooms[roomId].users).length === 0) {
          delete codeRooms[roomId];
        }
      }

      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
