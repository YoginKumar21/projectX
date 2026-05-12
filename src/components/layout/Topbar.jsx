import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../../api/axios";

function Topbar({
  searchTerm = "",
  setSearchTerm = () => {},
  isSidebarOpen,
  setIsSidebarOpen,
}) {
  const navigate = useNavigate();

  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "User",
  );
  const [userAvatar, setUserAvatar] = useState(
    localStorage.getItem("userAvatar") || "https://lh3.googleusercontent.com/aida-public/AB6AXuC5KEa55KJ8H-rvfwFcuOhACfk1uwzOqzx4Strx6c5UxJeuSx1Cl6cO44xyXPF5HmA7yMchKE4gX7phDF_6LMoU171FPjcKq1DTQlJzg6lvaYtTKoBhT4glveUuvoYrbF2BAIMuhRak61qq3bK42jcNiI8ra19mblt2Z74AuVAtfjYX43ogemIVGR1R-cyHqLmacO5gR_8G5eLdFXCOpOb-UfrrUQYHsUjMUjQoAH7F9YIxSiLywzOADZnSbPF-0PsGNgbq0x09yJVZ",
  );
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark",
  );

  useEffect(() => {
    const syncTopbarState = () => {
      setUserName(localStorage.getItem("userName") || "User");
      setUserAvatar(localStorage.getItem("userAvatar") || "https://lh3.googleusercontent.com/aida-public/AB6AXuC5KEa55KJ8H-rvfwFcuOhACfk1uwzOqzx4Strx6c5UxJeuSx1Cl6cO44xyXPF5HmA7yMchKE4gX7phDF_6LMoU171FPjcKq1DTQlJzg6lvaYtTKoBhT4glveUuvoYrbF2BAIMuhRak61qq3bK42jcNiI8ra19mblt2Z74AuVAtfjYX43ogemIVGR1R-cyHqLmacO5gR_8G5eLdFXCOpOb-UfrrUQYHsUjMUjQoAH7F9YIxSiLywzOADZnSbPF-0PsGNgbq0x09yJVZ");
      
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
        setDarkMode(true);
      } else {
        document.documentElement.classList.remove("dark");
        setDarkMode(false);
      }
    };

    const handleExternalThemeUpdate = (e) => {
      const savedTheme = e.detail || localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
        setDarkMode(true);
      } else {
        document.documentElement.classList.remove("dark");
        setDarkMode(false);
      }
    };

    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await API.get("/auth/me");
        const userData = res.data;
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("userEmail", userData.email);
        localStorage.setItem("userBio", userData.bio || "");
        localStorage.setItem("userLocation", userData.location || "");
        localStorage.setItem("userAvatar", userData.avatar || "");
        localStorage.setItem("userBanner", userData.banner || "");
        
        setUserName(userData.name);
        if (userData.avatar) {
          setUserAvatar(userData.avatar);
        }
      } catch (err) {
        console.error("Failed to fetch user in Topbar:", err);
      }
    };

    syncTopbarState();
    fetchUser();
    window.addEventListener("storage", syncTopbarState);
    window.addEventListener("syncpad-theme-updated", handleExternalThemeUpdate);
    window.addEventListener("syncpad-user-updated", syncTopbarState);

    return () => {
      window.removeEventListener("storage", syncTopbarState);
      window.removeEventListener("syncpad-theme-updated", handleExternalThemeUpdate);
      window.removeEventListener("syncpad-user-updated", syncTopbarState);
    };
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    window.dispatchEvent(new CustomEvent("syncpad-theme-updated", { detail: newMode ? "dark" : "light" }));
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    const searchablePaths = ["/dashboard", "/notes", "/shared", "/favorites", "/tags"];
    const currentPath = window.location.pathname;

    if (!searchablePaths.includes(currentPath)) {
      navigate(`/notes?search=${encodeURIComponent(val)}`);
    } else {
      const params = new URLSearchParams(window.location.search);
      if (val.trim()) {
        params.set("search", val);
      } else {
        params.delete("search");
      }
      navigate({ pathname: currentPath, search: params.toString() }, { replace: true });
    }
  };

  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await API.get("/notifications");
      const active = (res.data || []).filter(n => !n.isArchived);
      
      if (active.length === 0) {
        setNotifications([
          {
            _id: "demo-invite",
            type: "share",
            message: "Yogin Kumar shared a Collaborative IDE Workspace (Room: SYNC-4829) with you. Click to join the collaboration session!",
            createdAt: new Date().toISOString(),
            isRead: false,
            note: { codeRoomId: "SYNC-4829", isCodeWorkspace: true }
          },
          {
            _id: "demo-chat",
            type: "chat",
            message: "AI Buddy: Python compiler successfully built and loaded main.py with correct console outputs.",
            createdAt: new Date(Date.now() - 1800000).toISOString(),
            isRead: true,
            note: null
          }
        ]);
      } else {
        setNotifications(active);
      }
    } catch (err) {
      console.error("Failed to fetch notifications in Topbar:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    if (id.startsWith("demo-")) {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      return;
    }
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      window.dispatchEvent(new Event("syncpad-notifications-updated"));
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleMarkAllRead = async (e) => {
    if (e) e.stopPropagation();
    try {
      const containsReal = notifications.some(n => !n._id.startsWith("demo-"));
      if (containsReal) {
        await API.put("/notifications/read-all");
      }
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      window.dispatchEvent(new Event("syncpad-notifications-updated"));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
    window.addEventListener("syncpad-notifications-updated", fetchNotifications);
    
    const handleClickOutside = (e) => {
      const box = document.getElementById("notification-dropdown-box");
      const button = document.getElementById("notification-bell-button");
      if (box && !box.contains(e.target) && button && !button.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener("syncpad-notifications-updated", fetchNotifications);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="h-[64px] fixed top-0 right-0 z-40 bg-white dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800 lg:ml-[240px] lg:w-[calc(100%-240px)] w-full flex items-center justify-between px-[20px] transition-all duration-300">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Toggle */}
        <button
          id="mobile-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden p-2 hover:bg-surface-container-high rounded-xl text-on-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="relative max-w-md w-full group">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] group-focus-within:text-primary transition-colors"
          >
            search
          </span>
          <input
            className="w-full pl-11 pr-4 py-2 bg-[#f2f4f6] dark:bg-[#0f172a] border border-slate-100 dark:border-slate-800/60 focus:border-primary/20 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all duration-300 font-medium text-sm text-on-surface"
            placeholder="Search notes, tags, files..."
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="relative">
          <button
            id="notification-bell-button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="hover:bg-surface-container-high rounded-xl p-2 transition-all duration-300 text-on-surface-variant flex items-center relative"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error text-[9px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div
              id="notification-dropdown-box"
              className="absolute right-0 mt-2.5 w-[320px] sm:w-[360px] bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#1e293b]/20">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-extrabold text-primary dark:text-indigo-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[320px] overflow-y-auto no-scrollbar py-1">
                {loadingNotifications ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => {
                        handleMarkAsRead(n._id);
                        if (n.note) {
                          if (n.note.isCodeWorkspace || n.type === "share") {
                            navigate(`/editor?roomId=${n.note.codeRoomId}`);
                          } else {
                            navigate("/notes");
                          }
                          setIsNotificationsOpen(false);
                        } else if (n._id === "demo-invite") {
                          navigate(`/editor?roomId=SYNC-4829`);
                          setIsNotificationsOpen(false);
                        }
                      }}
                      className={`p-4 hover:bg-slate-50 dark:hover:bg-[#1e293b]/30 transition-all border-b border-slate-50/50 dark:border-slate-800/20 cursor-pointer flex gap-3 items-start text-left ${
                        n.isRead ? "opacity-60" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          n.type === "share"
                            ? "bg-blue-500/10 text-blue-500"
                            : n.type === "chat"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {n.type === "share"
                            ? "person_add"
                            : n.type === "chat"
                            ? "chat"
                            : "notifications"}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-normal ${n.isRead ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-200 font-semibold"}`}>
                          {n.message}
                        </p>
                        <span className="text-[9px] text-outline font-bold uppercase mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Unread Dot */}
                      {!n.isRead && (
                        <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">
                      notifications_off
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">All caught up! 🎉</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      No notifications to display.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1e293b]/20 text-center">
                <button
                  onClick={() => {
                    navigate("/notifications");
                    setIsNotificationsOpen(false);
                  }}
                  className="text-xs font-bold text-primary dark:text-indigo-400 hover:underline w-full"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="hover:bg-surface-container-high rounded-xl p-2 transition-all duration-300 text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">
            {darkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>
        
        <div className="h-5 w-[1px] bg-outline-variant/10 mx-1"></div>
        
        <div
          className="flex items-center gap-2.5 pl-2 cursor-pointer group"
          onClick={() => navigate("/profile")}
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface leading-tight transition-colors group-hover:text-primary">{userName}</p>
            <p className="text-[9px] text-primary font-black uppercase tracking-tighter">
              Pro Member
            </p>
          </div>
          <div className="w-8 h-8 rounded-full border border-primary/10 p-0.5 group-hover:border-primary/40 transition-all overflow-hidden bg-surface-container shadow-sm">
            <img
              alt="User Avatar"
              className="w-full h-full rounded-full object-cover"
              src={userAvatar}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;