const Notification = require("../models/Notification");

const createNotification = async ({
  io = null,
  user,
  recipient,
  sender = null,
  note = null,
  type,
  message,
}) => {
  try {
    const targetUser = user || recipient;

    if (!targetUser || !type || !message) {
      return null;
    }

    const notification = await Notification.create({
      user: targetUser,
      sender,
      note,
      type,
      message,
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("note", "title");

    if (io) {
      io.to(`user:${targetUser.toString()}`).emit(
        "notification:new",
        populatedNotification,
      );
    }

    return populatedNotification;
  } catch (error) {
    console.error("Create notification error:", error.message);
    return null;
  }
};

module.exports = createNotification;
