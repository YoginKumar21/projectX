import socket from "../socket";
import toast from "react-hot-toast";
import { getNotificationPrefs } from "./notificationPreferences";
let isInitialized = false;

const notificationSound = new Audio("/notification.mp3");
notificationSound.volume = 0.5;

export const initNotificationListener = () => {
  if (isInitialized) return;
  isInitialized = true;
socket.off("notification:new");
socket.on("notification:new", (notification) => {
  const prefs = getNotificationPrefs();

  // 🔥 DND MODE
  if (prefs.dnd) return;

  window.dispatchEvent(new Event("syncpad-notifications-updated"));

  // 🔊 SOUND
  if (prefs.sound) {
    try {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(() => {});
    } catch {}
  }

  // 🔥 TOAST
  if (prefs.toast) {
    toast.success(notification?.message || "New notification", {
      duration: 4000,
    });
  }
});
};