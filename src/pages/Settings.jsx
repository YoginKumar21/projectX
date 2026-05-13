import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AppShell from "../components/layout/AppShell.jsx";
import { reconnectSocket } from "../socket";

function Settings() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState(localStorage.getItem("userName") || "");
  const [email] = useState(localStorage.getItem("userEmail") || "");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("syncpad-theme-updated", { detail: theme }));
  }, [theme]);

  useEffect(() => {
    const handleThemeUpdated = () => {
      setTheme(localStorage.getItem("theme") || "light");
    };
    window.addEventListener("storage", handleThemeUpdated);
    window.addEventListener("syncpad-theme-updated", handleThemeUpdated);
    return () => {
      window.removeEventListener("storage", handleThemeUpdated);
      window.removeEventListener("syncpad-theme-updated", handleThemeUpdated);
    };
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    localStorage.setItem("userName", name.trim());
    toast.success("Settings saved successfully");
    window.dispatchEvent(new Event("syncpad-user-updated"));
  };

  const handleLogout = () => {
    localStorage.clear();
    reconnectSocket(); // Cleanly disconnect the socket
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface tracking-tight">Settings</h1>
          <p className="text-on-surface-variant font-body-lg">Manage your profile and workspace preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card-premium p-8 rounded-[2.5rem]">
              <h3 className="font-h3 text-xl text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Account Information
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-6 py-4 bg-surface-container-low border border-outline-variant/10 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-6 py-4 bg-surface-container-highest border border-outline-variant/10 rounded-2xl text-on-surface-variant cursor-not-allowed"
                  />
                </div>
                <button
                  type="submit"
                  className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Save Changes
                </button>
              </form>
            </div>

            <div className="glass-card-premium p-8 rounded-[2.5rem]">
              <h3 className="font-h3 text-xl text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">security</span>
                Security
              </h3>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-surface-container transition-colors border border-outline-variant/10">
                  <span className="font-medium">Change Password</span>
                  <span className="material-symbols-outlined text-outline">chevron_right</span>
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-surface-container transition-colors border border-outline-variant/10">
                  <span className="font-medium">Two-Factor Authentication</span>
                  <span className="material-symbols-outlined text-outline">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card-premium p-8 rounded-[2.5rem]">
              <h3 className="font-h3 text-xl text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">palette</span>
                Appearance
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-bold transition ${
                    theme === "light"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined">light_mode</span> Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-bold transition ${
                    theme === "dark"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined">dark_mode</span> Dark
                </button>
              </div>
            </div>

            <div className="glass-card-premium p-8 rounded-[2.5rem] bg-error/5 border border-error/10">
              <h3 className="font-h3 text-xl text-error mb-2">Danger Zone</h3>
              <p className="text-on-surface-variant text-xs mb-6">Irreversible actions for your account.</p>
              <button 
                onClick={handleLogout}
                className="w-full py-3 bg-error/10 text-error rounded-xl font-bold hover:bg-error hover:text-on-error transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default Settings;