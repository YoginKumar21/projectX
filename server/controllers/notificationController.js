const Notification = require("../models/Notification");

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id,
    })
      .populate("sender", "name email")
      .populate("note", "title")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notifications/:id/read
const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notifications/read-all
const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true } },
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notifications/:id/archive
const archiveNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isArchived = true;
    await notification.save();

    res.json({ message: "Notification archived" });
  } catch (error) {
    console.error("Archive notification error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notifications/archive-read
const archiveReadNotifications = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user.id,
        isRead: true,
        isArchived: false,
      },
      {
        $set: { isArchived: true },
      },
    );

    res.json({ message: "Read notifications archived" });
  } catch (error) {
    console.error("Archive read notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/notifications/clear-all
const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
    });

    res.json({ message: "All notifications cleared" });
  } catch (error) {
    console.error("Clear all notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
  archiveReadNotifications,
  clearAllNotifications,
};
