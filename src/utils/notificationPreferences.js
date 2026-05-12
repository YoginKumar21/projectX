const DEFAULT_PREFS = {
  sound: true,
  toast: true,
  dnd: false,
};

export const getNotificationPrefs = () => {
  const stored = localStorage.getItem("notificationPrefs");
  return stored ? JSON.parse(stored) : DEFAULT_PREFS;
};

export const setNotificationPrefs = (prefs) => {
  localStorage.setItem("notificationPrefs", JSON.stringify(prefs));
};
