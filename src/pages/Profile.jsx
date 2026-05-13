import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AppShell from "../components/layout/AppShell.jsx";
import API from "../api/axios";
import { reconnectSocket } from "../socket";

function Profile() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState([]);
  const [user, setUser] = useState({
    name: localStorage.getItem("userName") || "User",
    email: localStorage.getItem("userEmail") || "",
    bio: localStorage.getItem("userBio") || "Senior UI Designer & Digital Architect. Passionate about creating seamless workflows.",
    location: localStorage.getItem("userLocation") || "San Francisco, CA",
    avatar: localStorage.getItem("userAvatar") || "",
    banner: localStorage.getItem("userBanner") || "",
  });

  const [stats, setStats] = useState({
    totalNotes: 0,
    collaborators: 0,
    activityPercentage: 0
  });

  const [recentNotes, setRecentNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user profile data
      const userRes = await API.get("/auth/me");
      const userData = userRes.data;
      
      const loadedUser = {
        name: userData.name,
        email: userData.email,
        bio: userData.bio || "Senior UI Designer & Digital Architect. Passionate about creating seamless workflows.",
        location: userData.location || "San Francisco, CA",
        avatar: userData.avatar || "",
        banner: userData.banner || "",
      };

      setUser(loadedUser);

      // Keep localStorage in sync for application topbar profiles
      localStorage.setItem("userName", userData.name);
      localStorage.setItem("userBio", loadedUser.bio);
      localStorage.setItem("userLocation", loadedUser.location);
      localStorage.setItem("userAvatar", userData.avatar || "");
      localStorage.setItem("userBanner", userData.banner || "");

      // Fetch actual notes list for real statistics
      const notesRes = await API.get("/notes");
      const notesData = notesRes.data || [];
      setNotes(notesData);

      // Count unique collaborators
      const collaboratorIds = new Set();
      notesData.forEach(note => {
        if (note.sharedWith) {
          note.sharedWith.forEach(id => collaboratorIds.add(typeof id === 'object' ? id._id : id));
        }
      });

      // Simple calculation for achievements progress (e.g. if we have > 0 notes, we unlocked 1 of 3 achievements)
      let completedCount = 0;
      if (notesData.length > 0) completedCount += 1; // Early adopter
      if (notesData.length >= 10) completedCount += 1; // Note Ninja
      if (collaboratorIds.size > 0) completedCount += 1; // Team Player
      const completionPct = Math.round((completedCount / 3) * 100);

      setStats({
        totalNotes: notesData.length,
        collaborators: collaboratorIds.size,
        activityPercentage: completionPct
      });

      // Filter non-deleted and sort notes by last updated date
      const sorted = notesData
        .filter(n => !n.isDeleted)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setRecentNotes(sorted.slice(0, 3));

    } catch (error) {
      console.error("Fetch profile/stats error:", error);
      toast.error("Failed to load profile details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    reconnectSocket(); // Cleanly disconnect the socket
    toast.success("Logged out successfully");
    navigate("/login");
  };

  // Helper to compute a relative time string (e.g., "3m ago")
  const getRelativeTime = (dateString) => {
    try {
      const updated = new Date(dateString);
      const now = new Date();
      const diffMs = now - updated;
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return "Just now";
    }
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="max-w-[1140px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
        
        {/* Profile Card Header with Overlay Avatar & Image Cover */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm relative">
          
          {/* Banner Container */}
          <div className="h-48 sm:h-60 w-full relative bg-slate-100 dark:bg-slate-800">
            {user.banner ? (
              <img 
                src={user.banner} 
                alt="Profile Cover" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/30 via-indigo-600/10 to-secondary/30 relative flex items-center justify-center">
                <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                <span className="material-symbols-outlined text-outline-variant text-4xl">landscape</span>
              </div>
            )}
            
            {/* Inline Edit Button embedded directly in lower-right corner of the Banner */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute bottom-6 right-6 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-transform active:scale-95 z-20"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">edit</span>
              Edit Profile
            </button>
          </div>

          {/* Profile Name, Username, and Floating rounded-square frame */}
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-7 -mt-14 sm:-mt-16 z-10 relative">
              
              {/* Thick rounded-square profile container exactly matching the image */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[32px] border-[5px] border-white dark:border-slate-900 overflow-hidden shadow-xl bg-white dark:bg-slate-800 relative">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt="User Profile" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-4xl sm:text-5xl font-black text-white uppercase">
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                {/* Royal blue verified checkmark badge overlay */}
                <div 
                  className="absolute bottom-1 right-1 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md"
                  title="Verified Account"
                >
                  <span className="material-symbols-outlined text-[12px] font-black">check</span>
                </div>
              </div>

              {/* Username details */}
              <div className="text-center md:text-left pb-1">
                <h1 className="font-black text-3xl text-slate-800 dark:text-white lowercase tracking-tight">
                  {user.name}
                </h1>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-0.5">
                  @{user.name.replace(/\s+/g, "_").toLowerCase()}
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Dynamic 2-Column Desktop Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: About description summary, Info Cards, and Stats (1/3 Width) */}
          <div className="space-y-6 md:col-span-1">
            
            {/* ABOUT Card Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              
              <h3 className="font-bold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">info</span>
                About
              </h3>

              {/* Bio summary block */}
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {user.bio}
              </p>

              {/* Metadata rows with grey-curated rounded containers */}
              <div className="space-y-3 pt-1">
                
                {/* Email container */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase text-outline tracking-wider">Email Address</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user.email || "No email available"}</p>
                  </div>
                </div>

                {/* Joined Date container */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase text-outline tracking-wider">Joined Date</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">May 5, 2026</p>
                  </div>
                </div>

                {/* Location container */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase text-outline tracking-wider">Location</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{user.location}</p>
                  </div>
                </div>

              </div>

            </div>

            {/* Stats Block (Two horizontal columns side by side under About) */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Notes Saved Block */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-center">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 block mb-1">{stats.totalNotes}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-outline block">Notes Saved</span>
              </div>

              {/* Shared Pads Block */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-center">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 block mb-1">{stats.collaborators}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-outline block">Shared Pads</span>
              </div>

            </div>

            {/* Safe Logout Button */}
            <button 
              onClick={handleLogout}
              className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-red-200/20"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Log Out Session
            </button>

          </div>

          {/* RIGHT COLUMN: Achievements Card & Recent Workspace activity (2/3 Width) */}
          <div className="space-y-6 md:col-span-2">
            
            {/* ACHIEVEMENTS card block */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
                <h3 className="font-bold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">emoji_events</span>
                  Achievements
                </h3>
                <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black tracking-wider uppercase border border-indigo-200/20">
                  {stats.activityPercentage}% Complete
                </span>
              </div>

              {/* Achievements Grid cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Early Adopter */}
                <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-2.5 relative ${
                  stats.totalNotes > 0 
                    ? "bg-indigo-50/10 border-indigo-100 dark:border-indigo-950/40" 
                    : "bg-slate-50/50 border-slate-100 dark:border-slate-800 opacity-60"
                }`}>
                  <div className="w-10 h-10 rounded-full border border-indigo-100 dark:border-indigo-950 flex items-center justify-center relative bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>star</span>
                    {stats.totalNotes > 0 && (
                      <div className="absolute -top-1 -right-1 bg-emerald-500 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                        <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Early Adopter</h4>
                    <p className="text-[9px] text-outline font-medium mt-0.5">SyncPad Founding Member</p>
                  </div>
                </div>

                {/* Note Ninja */}
                <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-2.5 relative ${
                  stats.totalNotes >= 10 
                    ? "bg-indigo-50/10 border-indigo-100 dark:border-indigo-950/40" 
                    : "bg-slate-50/50 border-slate-100 dark:border-slate-800 opacity-60"
                }`}>
                  <div className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center relative bg-white dark:bg-slate-800 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                    {stats.totalNotes >= 10 && (
                      <div className="absolute -top-1 -right-1 bg-emerald-500 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                        <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Note Ninja</h4>
                    <p className="text-[9px] text-outline font-medium mt-0.5">
                      {stats.totalNotes >= 10 ? "Note unlocked master" : `Write ${Math.max(1, 10 - stats.totalNotes)} more notes to unlock`}
                    </p>
                  </div>
                </div>

                {/* Team Player */}
                <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-2.5 relative ${
                  stats.collaborators > 0 
                    ? "bg-indigo-50/10 border-indigo-100 dark:border-indigo-950/40" 
                    : "bg-slate-50/50 border-slate-100 dark:border-slate-800 opacity-60"
                }`}>
                  <div className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center relative bg-white dark:bg-slate-800 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">groups</span>
                    {stats.collaborators > 0 && (
                      <div className="absolute -top-1 -right-1 bg-emerald-500 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                        <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Team Player</h4>
                    <p className="text-[9px] text-outline font-medium mt-0.5">
                      {stats.collaborators > 0 ? "Shared permissions verified" : "Share a note to unlock"}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* RECENT ACTIVITY card block */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
                <h3 className="font-bold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  Recent Activity
                </h3>
                <button 
                  onClick={() => navigate("/notes")} 
                  className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:underline"
                >
                  View All
                </button>
              </div>

              {/* Activity Lists items */}
              <div className="space-y-3.5">
                {isLoading ? (
                  Array(2).fill(0).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-50 dark:bg-slate-800/40 animate-pulse rounded-2xl border border-slate-100/50" />
                  ))
                ) : recentNotes.length > 0 ? (
                  recentNotes.map((note) => (
                    <div 
                      key={note._id}
                      onClick={() => navigate(`/dashboard?edit=${note._id}`)}
                      className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-200/60 dark:hover:border-indigo-900/50 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/5 transition-all cursor-pointer flex items-center gap-4 relative group"
                    >
                      {/* Left Document Icon inside Rounded box */}
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <span className="material-symbols-outlined text-[20px]">description</span>
                      </div>

                      {/* Title & Preview details */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          Updated "{note.title || "Untitled Note"}"
                        </h4>
                        <p className="text-[10px] text-outline font-medium truncate mt-0.5">
                          {note.content ? note.content.replace(/<[^>]*>/g, "").slice(0, 75) : "No content preview available."}
                        </p>
                      </div>

                      {/* Right relative Timestamp badge */}
                      <span className="text-[9px] font-black text-outline uppercase tracking-wider shrink-0 pr-1">
                        {getRelativeTime(note.updatedAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/20">
                    <span className="material-symbols-outlined text-outline text-2xl mb-1">inbox</span>
                    <p className="text-xs text-slate-500 italic font-medium">No recent documents edited in this workspace yet.</p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Structured Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal 
          user={user} 
          onClose={() => setIsEditModalOpen(false)} 
          onSave={fetchProfileAndStats}
        />
      )}
    </AppShell>
  );
}

// Highly structured, perfect layout Edit Profile Modal
function EditProfileModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...user });
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Please upload cover assets under 2MB size");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [type]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setIsSaving(true);
      await API.put("/auth/update-profile", formData);
      toast.success("Profile saved perfectly!");
      onSave();
      onClose();
      // Dispatch live sync notification for Topbar and Navbar profile rendering
      window.dispatchEvent(new Event("syncpad-user-updated"));
    } catch (error) {
      console.error("Save profile error:", error);
      toast.error("Failed to save profile changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-250 overflow-y-auto">
      <div className="glass-card-premium w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 border border-outline-variant/10 bg-white dark:bg-slate-900 overflow-hidden">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600">manage_accounts</span>
            Edit Profile Configuration
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Dual Cover Banner & Avatar visual editors */}
          <div className="space-y-4">
            
            {/* Banner Cover file-input preview */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Cover Banner Image</label>
              <div 
                onClick={() => bannerInputRef.current.click()}
                className="h-28 w-full rounded-2xl bg-slate-50 dark:bg-slate-800/40 overflow-hidden cursor-pointer relative group border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center justify-center text-slate-400"
              >
                {formData.banner ? (
                  <img src={formData.banner} className="w-full h-full object-cover" alt="Banner cover preview" />
                ) : (
                  <div className="text-center space-y-1">
                    <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                    <p className="text-[9px] font-black uppercase tracking-wider">Upload Cover image</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-[10px] font-black uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span> Change Cover
                  </span>
                </div>
              </div>
              <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleImageChange(e, "banner")} />
            </div>

            {/* Avatar Profile picture file-input preview */}
            <div className="flex items-center gap-4 pt-1">
              <div className="relative shrink-0">
                <div 
                  onClick={() => avatarInputRef.current.click()}
                  className="w-20 h-20 rounded-[20px] bg-slate-100 dark:bg-slate-800/40 overflow-hidden cursor-pointer relative group border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 flex items-center justify-center text-slate-400"
                >
                  {formData.avatar ? (
                    <img src={formData.avatar} className="w-full h-full object-cover" alt="Avatar profile preview" />
                  ) : (
                    <span className="material-symbols-outlined text-xl">account_circle</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-[9px] font-black uppercase">Edit</span>
                  </div>
                </div>
                <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => handleImageChange(e, "avatar")} />
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Profile Picture</h4>
                <p className="text-[10px] text-outline leading-normal mt-1">
                  Upload a clean JPG, PNG, or SVG image. We automatically fit the square corners to match your page layout.
                </p>
              </div>
            </div>

          </div>

          {/* Core metadata text structures */}
          <div className="space-y-4 pt-1">
            
            {/* Full Name field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm font-medium"
                placeholder="Name"
                required
              />
            </div>

            {/* Location field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm font-medium"
                placeholder="e.g. San Francisco, CA"
              />
            </div>

            {/* About bio paragraph summary field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">About Summary</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm font-medium min-h-[90px] resize-none leading-relaxed"
                placeholder="Provide a modern professional bio summary here..."
              />
            </div>

          </div>

          {/* Bottom buttons */}
          <div className="flex gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? "Saving Configuration..." : "Save Changes"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default Profile;