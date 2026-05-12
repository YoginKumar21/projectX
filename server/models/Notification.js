const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    senderName: {
      type: String,
      default: "",
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
    },
    type: {
      type: String,
      enum: ["share", "update", "chat"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["high", "normal"],
      default: "normal",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
