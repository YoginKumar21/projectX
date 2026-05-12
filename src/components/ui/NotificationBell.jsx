import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  MessageCircle,
  Share2,
  PencilLine,
  AlertCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../../api/axios";

function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [newIds, setNewIds] = useState([]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const fetchNotifications = async (initialLoad = false) => {
    try {
      if (initialLoad) setLoading(true);

      const res = await API.get("/notifications");
      const incoming = Array.isArray(res.data) ? res.data : [];

      setNotifications((prev) => {
        const prevIds = new Set(prev.map((item) => item._id));
        const freshIds = incoming
          .filter((item) => !prevIds.has(item._id) && !item.isRead)
          .map((item) => item._id);

        if (!initialLoad && freshIds.length > 0) {
          setNewIds((old) => [...new Set([...old, ...freshIds])]);

          setTimeout(() => {
            setNewIds((old) => old.filter((id) => !freshIds.includes(id)));
          }, 5000);
        }

        return incoming;
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      if (initialLoad) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  useEffect(() => {
    const handleUpdate = async () => {
      try {
        const res = await API.get("/notifications");
        const incoming = Array.isArray(res.data) ? res.data : [];

        setNotifications((prev) => {
          const prevIds = new Set(prev.map((item) => item._id));
          const newOnes = incoming.filter(
            (item) => !prevIds.has(item._id) && !item.isRead,
          );

          if (newOnes.length > 0) {
            const ids = newOnes.map((item) => item._id);

            setNewIds((old) => [...new Set([...old, ...ids])]);

            setTimeout(() => {
              setNewIds((old) => old.filter((id) => !ids.includes(id)));
            }, 4000);
          }

          return incoming;
        });
      } catch (error) {
        console.error("Failed to update notifications:", error);
      }
    };

    window.addEventListener("syncpad-notifications-updated", handleUpdate);

    return () => {
      window.removeEventListener(
        "syncpad-notifications-updated",
        handleUpdate,
      );
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;

    const mins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days === 1) return "Yesterday";

    return date.toLocaleDateString();
  };

  const getTypeIcon = (type) => {
    if (type === "share") return <Share2 size={14} />;
    if (type === "chat") return <MessageCircle size={14} />;
    return <PencilLine size={14} />;
  };

  const getTypeBadgeClass = (type) => {
    if (type === "share") {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    }
    if (type === "chat") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    }
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  };

  const groupNotifications = (items) => {
    const groups = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    const now = new Date();

    items.forEach((item) => {
      const created = new Date(item.createdAt);

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const createdDay = new Date(
        created.getFullYear(),
        created.getMonth(),
        created.getDate(),
      );

      if (createdDay.getTime() === today.getTime()) {
        groups.Today.push(item);
      } else if (createdDay.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(item);
      } else {
        groups.Earlier.push(item);
      }
    });

    return groups;
  };

  const markSingleAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isRead: true } : item,
        ),
      );

      window.dispatchEvent(new Event("syncpad-notifications-updated"));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleOpenNotification = async (notification) => {
    if (!notification.isRead) {
      await markSingleAsRead(notification._id);
    }

    if (notification.note?._id) {
      navigate(`/dashboard?edit=${notification.note._id}`);
    } else {
      navigate("/notifications");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await API.put("/notifications/read-all");

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true })),
      );

      window.dispatchEvent(new Event("syncpad-notifications-updated"));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const grouped = groupNotifications(notifications);

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ y: -2, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <motion.div
          animate={
            unreadCount > 0
              ? { rotate: [0, -10, 10, -6, 6, 0] }
              : {}
          }
          transition={{ duration: 0.6 }}
        >
          <Bell size={18} />
        </motion.div>

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1 -top-1 rounded-full bg-indigo-600 px-2 py-[2px] text-[10px] text-white ring-2 ring-white dark:ring-[#020817]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </span>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300"
                >
                  {markingAll ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  Mark all
                </button>
              )}
            </div>

            <div className="max-h-[420px] space-y-4 overflow-y-auto p-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-slate-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                    <Bell size={20} />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    NO NEW NOTIFICATIONS
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                    You&apos;re all caught up.
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([label, items]) => {
                  if (!items.length) return null;

                  return (
                    <div key={label}>
                      <p className="mb-2 text-xs text-slate-400">{label}</p>

                      <div className="space-y-2">
                        {items.map((notification) => {
                          const isNew = newIds.includes(notification._id);
                          const isHighPriority =
                            notification.priority === "high";

                          return (
                            <motion.div
                              key={notification._id}
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() =>
                                handleOpenNotification(notification)
                              }
                              className={`relative cursor-pointer overflow-hidden rounded-xl p-3 transition ${
                                notification.isRead
                                  ? "bg-white dark:bg-slate-900"
                                  : "bg-indigo-50 dark:bg-indigo-900/20"
                              } ${
                                isHighPriority
                                  ? "ring-2 ring-rose-200 dark:ring-rose-900/40"
                                  : ""
                              }`}
                            >
                              {isNew && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="pointer-events-none absolute inset-0 rounded-xl bg-indigo-200/20"
                                />
                              )}

                              <div className="relative min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${getTypeBadgeClass(notification.type)}`}
                                  >
                                    {getTypeIcon(notification.type)}
                                    {notification.type}
                                  </span>

                                  {isHighPriority && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                                      <AlertCircle size={12} />
                                      important
                                    </span>
                                  )}
                                </div>

                                <div className="flex justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-slate-800 dark:text-slate-100">
                                      {notification.message}
                                    </p>

                                    {notification.note?.title && (
                                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                        Note: {notification.note.title}
                                      </p>
                                    )}

                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                      {formatTime(notification.createdAt)}
                                    </p>
                                  </div>

                                  <ExternalLink
                                    size={14}
                                    className="mt-0.5 shrink-0 text-slate-400"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 p-3 dark:border-slate-800">
              <button
                onClick={() => navigate("/notifications")}
                className="w-full rounded-2xl bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
              >
                View all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;