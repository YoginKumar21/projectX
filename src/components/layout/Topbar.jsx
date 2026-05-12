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
    window.addEventListener("syncpad-user-updated", syncTopbarState);

    return () => {
      window.removeEventListener("storage", syncTopbarState);
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

  return (
    <header className="h-[64px] fixed top-0 right-0 z-40 bg-surface-container-lowest/70 backdrop-blur-xl border-b border-outline-variant/5 lg:ml-[240px] lg:w-[calc(100%-240px)] w-full flex items-center justify-between px-[20px] transition-all duration-300">
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
            className="w-full pl-11 pr-4 py-2 bg-surface-container-low/50 border border-transparent focus:border-primary/20 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all duration-300 font-medium text-sm text-on-surface"
            placeholder="Search notes, tags, files..."
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button className="hover:bg-surface-container-high rounded-xl p-2 transition-all duration-300 text-on-surface-variant hidden sm:flex">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
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