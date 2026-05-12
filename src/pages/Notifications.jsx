import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api/axios";
import AppShell from "../components/layout/AppShell.jsx";

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, archived
  const [searchTerm, setSearchTerm] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await API.get("/notifications");
      setNotifications(res.data || []);
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    let result = notifications;
    if (filter === "unread") result = result.filter(n => !n.isRead && !n.isArchived);
    if (filter === "archived") result = result.filter(n => n.isArchived);
    if (filter === "all") result = result.filter(n => !n.isArchived);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(n => n.message?.toLowerCase().includes(q));
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, filter, searchTerm]);

  const handleMarkAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      window.dispatchEvent(new Event("syncpad-notifications-updated"));
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All marked as read");
      window.dispatchEvent(new Event("syncpad-notifications-updated"));
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleArchive = async (id) => {
    try {
      await API.put(`/notifications/${id}/archive`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isArchived: true } : n));
      toast.success("Notification archived");
    } catch (error) {
      toast.error("Archive failed");
    }
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface tracking-tight">Notifications</h1>
            <p className="text-on-surface-variant font-body-lg">Stay updated with your workspace activity.</p>
          </div>
          <button 
            onClick={handleMarkAllAsRead}
            className="px-6 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">done_all</span>
            Mark all read
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 p-1 bg-surface-container-low/50 rounded-2xl w-fit border border-outline-variant/10">
          {["all", "unread", "archived"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === f ? "bg-primary text-on-primary shadow-md" : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map(n => (
              <div 
                key={n._id}
                className={`glass-card-premium p-6 rounded-3xl border flex gap-6 items-start transition-all ${
                  n.isRead ? "border-outline-variant/10 opacity-70" : "border-primary/20 shadow-lg shadow-primary/5"
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  n.type === "share" ? "bg-blue-100 text-blue-600" :
                  n.type === "chat" ? "bg-emerald-100 text-emerald-600" :
                  "bg-amber-100 text-amber-600"
                }`}>
                  <span className="material-symbols-outlined">
                    {n.type === "share" ? "person_add" : n.type === "chat" ? "chat" : "notifications"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={`font-body-md ${n.isRead ? "text-on-surface-variant" : "text-on-surface font-semibold"}`}>
                      {n.message}
                    </p>
                    {!n.isRead && <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></div>}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-outline">
                    <span>{new Date(n.createdAt).toLocaleTimeString()} • {new Date(n.createdAt).toLocaleDateString()}</span>
                    {!n.isArchived && (
                      <button onClick={() => handleArchive(n._id)} className="hover:text-primary transition-colors">Archive</button>
                    )}
                    {!n.isRead && (
                      <button onClick={() => handleMarkAsRead(n._id)} className="hover:text-primary transition-colors">Mark Read</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center glass-card-premium rounded-[2.5rem] border border-dashed border-outline-variant/30">
               <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">notifications_off</span>
               <h3 className="text-xl font-bold text-on-surface">All caught up!</h3>
               <p className="text-on-surface-variant">No notifications to show for this filter.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default Notifications;