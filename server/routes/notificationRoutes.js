const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
  archiveReadNotifications,
  clearAllNotifications,
} = require("../controllers/notificationController");

router.get("/", authMiddleware, getNotifications);
router.put("/read-all", authMiddleware, markAllNotificationsAsRead);
router.put("/archive-read", authMiddleware, archiveReadNotifications);
router.put("/:id/read", authMiddleware, markNotificationAsRead);
router.put("/:id/archive", authMiddleware, archiveNotification);
router.delete("/clear-all", authMiddleware, clearAllNotifications);

module.exports = router;
