import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import {
  getNotificationPrefs,
  setNotificationPrefs,
} from "../utils/notificationPreferences";

function NotificationSettings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [prefs, setPrefs] = useState({
    sound: true,
    toast: true,
    dnd: false,
  });

  useEffect(() => {
    setPrefs(getNotificationPrefs());
  }, []);

  const updatePref = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setNotificationPrefs(updated);
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface tracking-tight">Notification Settings</h1>
          <p className="text-on-surface-variant font-body-lg">Customize how you receive alerts and updates.</p>
        </div>

        <div className="glass-card-premium p-8 rounded-[2.5rem] space-y-6">
          <h3 className="font-h3 text-xl text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">settings_suggest</span>
            Delivery Preferences
          </h3>
          
          <PreferenceToggle 
            label="Notification Sound" 
            desc="Play a sound when a new notification arrives."
            icon="volume_up"
            active={prefs.sound}
            onToggle={() => updatePref("sound")}
          />

          <PreferenceToggle 
            label="Toast Notifications" 
            desc="Show a small popup at the corner of your screen."
            icon="notifications_active"
            active={prefs.toast}
            onToggle={() => updatePref("toast")}
          />

          <PreferenceToggle 
            label="Do Not Disturb" 
            desc="Mute all notifications while this mode is active."
            icon="do_not_disturb_on"
            active={prefs.dnd}
            onToggle={() => updatePref("dnd")}
          />
        </div>

        <div className="glass-card-premium p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10">
           <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary">info</span>
              <div>
                 <h4 className="font-bold text-on-surface mb-1">About Notifications</h4>
                 <p className="text-sm text-on-surface-variant leading-relaxed">
                    SyncPad uses a real-time notification system to keep you informed about shared notes, collaborator activity, and system updates. You can manage these settings at any time.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </AppShell>
  );
}

function PreferenceToggle({ label, desc, icon, active, onToggle }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-outline-variant/10 bg-surface-container-low/30 hover:bg-surface-container-low transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-primary text-on-primary" : "bg-surface-container text-outline"}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <p className="font-bold text-on-surface">{label}</p>
          <p className="text-xs text-on-surface-variant">{desc}</p>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${active ? "bg-primary" : "bg-outline-variant"}`}
      >
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${active ? "translate-x-7" : "translate-x-1"}`}></div>
      </button>
    </div>
  );
}

export default NotificationSettings;