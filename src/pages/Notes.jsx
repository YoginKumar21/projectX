import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api/axios";
import AppShell from "../components/layout/AppShell.jsx";
import EditorDrawer from "../components/EditorDrawer";
import NoteForm from "../components/NoteForm";

const TABS = [
  { key: "all", label: "All", icon: "grid_view" },
  { key: "favorites", label: "Favorites", icon: "favorite" },
  { key: "archived", label: "Archived", icon: "archive" },
  { key: "trash", label: "Trash", icon: "delete" },
];

function Notes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sharingNote, setSharingNote] = useState(null);
  
  // Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [isPinned, setIsPinned] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const [activeRes, archivedRes, trashedRes] = await Promise.all([
        API.get("/notes?filter=active"),
        API.get("/notes?filter=archived"),
        API.get("/notes?filter=trashed"),
      ]);
      setNotes([...(activeRes.data || []), ...(archivedRes.data || []), ...(trashedRes.data || [])]);
    } catch (error) {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "true") {
      handleNewNote();
      navigate("/notes", { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get("search");
    if (searchParam !== null) {
      setSearchTerm(searchParam);
    } else {
      setSearchTerm("");
    }
  }, [location.search]);

  const counts = useMemo(() => {
    return {
      all: notes.filter(n => !n.isArchived && !n.isTrashed).length,
      favorites: notes.filter(n => n.isPinned && !n.isArchived && !n.isTrashed).length,
      archived: notes.filter(n => n.isArchived && !n.isTrashed).length,
      trash: notes.filter(n => n.isTrashed).length,
    };
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes;
    
    if (activeTab === "favorites") {
      result = result.filter(n => n.isPinned && !n.isArchived && !n.isTrashed);
    } else if (activeTab === "archived") {
      result = result.filter(n => n.isArchived && !n.isTrashed);
    } else if (activeTab === "trash") {
      result = result.filter(n => n.isTrashed);
    } else {
      result = result.filter(n => !n.isArchived && !n.isTrashed);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n => 
        (n.title || "").toLowerCase().includes(term) || 
        (n.content || "").toLowerCase().includes(term)
      );
    }

    return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [notes, activeTab, searchTerm]);

  const handleEdit = (note) => {
    if (note.isCodeWorkspace) {
      navigate(`/editor?roomId=${note.codeRoomId}`);
      return;
    }

    setEditingNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
    setTags(note.tags || []);
    setIsPinned(Boolean(note.isPinned));
    setShowEditor(true);
  };

  const handleNewNote = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setTags([]);
    setIsPinned(false);
    setShowEditor(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const finalTitle = title.trim() || "Untitled Note";
    try {
      if (editingNote) {
        const res = await API.put(`/notes/${editingNote._id}`, { title: finalTitle, content, tags, isPinned });
        setNotes(prev => prev.map(n => n._id === editingNote._id ? res.data : n));
        toast.success("Note updated");
      } else {
        const res = await API.post("/notes", { title: finalTitle, content, tags, isPinned });
        setNotes(prev => [res.data, ...prev]);
        toast.success("Note created");
      }
      setShowEditor(false);
    } catch (error) {
      toast.error("Failed to save note");
    }
  };

  const handleArchive = async (id) => {
    try {
      await API.put(`/notes/${id}/archive`);
      setNotes(prev => prev.map(n => n._id === id ? { ...n, isArchived: !n.isArchived } : n));
      toast.success("Archive status updated");
    } catch (error) {
      toast.error("Archive failed");
    }
  };

  const handleFavorite = async (id) => {
    try {
      await API.put(`/notes/${id}/pin`);
      setNotes(prev => prev.map(n => n._id === id ? { ...n, isPinned: !n.isPinned } : n));
      toast.success("Favorite status updated");
    } catch (error) {
      toast.error("Favorite toggle failed");
    }
  };

  const handleTrash = async (id) => {
    try {
      await API.delete(`/notes/${id}`);
      setNotes(prev => prev.map(n => n._id === id ? { ...n, isTrashed: true } : n));
      toast.success("Moved to trash");
    } catch (error) {
      toast.error("Failed to move to trash");
    }
  };

  const handleRestore = async (id) => {
    try {
      await API.put(`/notes/${id}/restore`);
      setNotes(prev => prev.map(n => n._id === id ? { ...n, isTrashed: false } : n));
      toast.success("Note restored");
    } catch (error) {
      toast.error("Failed to restore note");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm("Permanently delete this note? This action cannot be undone.")) return;
    try {
      await API.delete(`/notes/${id}/permanent`);
      setNotes(prev => prev.filter(n => n._id !== id));
      toast.success("Permanently deleted");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="max-w-[1280px] mx-auto space-y-6 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-h2 text-h2 text-on-surface tracking-tight">My Notes</h2>
            <p className="text-sm text-on-surface-variant">Manage your digital brain and stay organized.</p>
          </div>
          <button 
            onClick={handleNewNote}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Note
          </button>
        </div>

        {/* Tabs and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-[#f2f4f6] dark:bg-[#0f172a] p-1.5 rounded-2xl gap-1 border border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key 
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20" 
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTab === tab.key ? "bg-on-primary/20 text-on-primary" : "bg-surface-container-highest text-on-surface-variant"}`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-100 dark:border-slate-800 rounded-xl text-on-surface-variant font-bold text-xs hover:bg-surface-container transition-colors w-full md:w-auto">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Tags & Filters
          </button>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-20 flex justify-center">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : filteredNotes.length > 0 ? (
            filteredNotes.map(note => {
              const isCode = note.isCodeWorkspace;
              let filesCount = 0;
              if (isCode && note.content) {
                try {
                  const parsed = JSON.parse(note.content);
                  if (Array.isArray(parsed)) filesCount = parsed.length;
                } catch (e) {}
              }

              const previewText = isCode
                ? `Real-time collaborative IDE workspace (Room: ${note.codeRoomId}). Contains ${filesCount} code files and folders.`
                : (note.content?.replace(/<[^>]*>/g, "") || "No content captured yet...");

              const tagColorClass = isCode
                ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase tracking-wider";

              return (
                <article 
                  key={note._id}
                  onClick={() => !note.isTrashed && handleEdit(note)}
                  className={`glass-card-premium p-5 rounded-2xl relative flex flex-col h-[260px] group border border-outline-variant/5 hover:border-primary/20 hover:shadow-xl transition-all bg-surface-container-lowest/50 ${
                    note.isTrashed ? "cursor-default opacity-85" : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2.5 py-0.5 ${tagColorClass}`}>
                      {isCode ? "Code IDE" : (note.tags?.[0] || "General")}
                    </span>
                    {!note.isTrashed && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFavorite(note._id);
                        }}
                        className={`${note.isPinned ? "text-error" : "text-outline-variant"} hover:scale-110 transition-transform`}
                      >
                        <span className="material-symbols-outlined text-[20px]" style={note.isPinned ? { fontVariationSettings: "'FILL' 1" } : {}}>
                          favorite
                        </span>
                      </button>
                    )}
                  </div>
                  <h3 className="font-bold text-on-surface mb-1.5 line-clamp-2">{note.title || "Untitled"}</h3>
                  <p className="text-on-surface-variant text-xs mb-auto line-clamp-4 leading-relaxed">
                    {previewText}
                  </p>
                <div className="pt-3 border-t border-outline-variant/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {note.isTrashed ? (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRestore(note._id); }}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                          title="Restore Note"
                        >
                          <span className="material-symbols-outlined text-[16px]">settings_backup_restore</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePermanentDelete(note._id); }}
                          className="p-1.5 hover:bg-error/10 rounded-lg text-on-surface-variant hover:text-error transition-colors"
                          title="Permanently Delete"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                          title="Edit Note"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleArchive(note._id); }}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                          title={note.isArchived ? "Unarchive Note" : "Archive Note"}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {note.isArchived ? "unarchive" : "archive"}
                          </span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleTrash(note._id); }}
                          className="p-1.5 hover:bg-error/10 rounded-lg text-on-surface-variant hover:text-error transition-colors"
                          title="Move to Trash"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSharingNote(note); }}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                          title="Share Document"
                        >
                          <span className="material-symbols-outlined text-[16px]">share</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })
          ) : activeTab === "trash" ? (
            <div 
              className="col-span-full border border-outline-variant/10 bg-surface-container-low/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[260px]"
            >
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4 text-outline-variant">
                <span className="material-symbols-outlined text-3xl">delete_outline</span>
              </div>
              <h3 className="font-bold text-on-surface">Trash is empty</h3>
              <p className="text-xs text-on-surface-variant mt-1.5 max-w-[200px] mx-auto">No deleted notes in here.</p>
            </div>
          ) : (
            <div 
              onClick={handleNewNote}
              className="border-2 border-dashed border-outline-variant/20 bg-surface-container-low/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[260px] hover:bg-surface-container-low/30 transition-colors cursor-pointer group"
            >
              <div className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-outline-variant group-hover:text-primary text-2xl">add</span>
              </div>
              <h3 className="font-bold text-on-surface">Create Note</h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-[150px]">Start capturing your thoughts</p>
            </div>
          )}
        </div>
      </div>

      <EditorDrawer
        open={showEditor}
        onClose={() => setShowEditor(false)}
        title={editingNote ? "Edit Note" : "New Note"}
      >
        <NoteForm
          title={title}
          content={content}
          tags={tags}
          setTitle={setTitle}
          setContent={setContent}
          setTags={setTags}
          editingId={editingNote?._id}
          handleSubmit={handleSubmit}
          handleCancelEdit={() => setShowEditor(false)}
        />
      </EditorDrawer>

      {sharingNote && (
        <ShareExportModal 
          note={sharingNote} 
          onClose={() => setSharingNote(null)} 
        />
      )}
    </AppShell>
  );
}

// Premium, interactive Share & Export Modal Component
function ShareExportModal({ note, onClose }) {
  const [email, setEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const handleShareEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setIsSharing(true);
      const res = await API.post(`/notes/${note._id}/share`, { email });
      toast.success(res.data?.message || "Collaborator added successfully!");
      setEmail("");
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "User with this email not found";
      toast.error(msg);
    } finally {
      setIsSharing(false);
    }
  };

  const downloadText = () => {
    const title = note.title || "Untitled Note";
    const content = note.content || "";
    const cleanContent = content.replace(/<[^>]*>/g, "");
    
    const text = `Title: ${title}\nUpdated: ${new Date(note.updatedAt).toLocaleDateString()}\n\n${cleanContent}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Plain Text (.txt)");
  };

  const downloadHtml = () => {
    const title = note.title || "Untitled Note";
    const content = note.content || "";
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 0 20px; }
          h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #0f172a; }
          .meta { color: #64748b; font-size: 0.85em; margin-bottom: 24px; }
          ul, ol { padding-left: 20px; }
          img { max-width: 100%; height: auto; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Last Updated: ${new Date(note.updatedAt).toLocaleDateString()}</div>
        <div>${content}</div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "_")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Rich HTML Document");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card-premium w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150 border border-outline-variant/10 bg-white dark:bg-slate-900 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">share</span>
              Share & Export Document
            </h2>
            <p className="text-[10px] text-outline truncate mt-0.5 font-bold uppercase">Note: "{note.title || "Untitled"}"</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Section 1: Export Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-outline flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download Document Offline
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Save your document locally. You can export as raw plain text or format-preserving HTML.
            </p>
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <button
                onClick={downloadText}
                className="py-2.5 bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">text_snippet</span>
                Plain Text (.txt)
              </button>
              <button
                onClick={downloadHtml}
                className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-950/60 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">html</span>
                Rich HTML (.html)
              </button>
            </div>
          </div>

          {/* Section 2: Share via Email Form */}
          <form onSubmit={handleShareEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Share via Registered Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborator@syncpad.com"
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary/5 outline-none transition-all text-xs font-medium text-slate-800 dark:text-slate-100"
                  required
                />
                <button
                  type="submit"
                  disabled={isSharing}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-on-primary rounded-xl font-bold text-xs shadow-lg shadow-primary/15 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSharing ? "Sharing..." : "Share Link"}
                </button>
              </div>
              <p className="text-[10px] text-outline font-medium leading-relaxed pt-1.5 px-0.5">
                Entering an email registers this document's access permissions to their workspace instantly.
              </p>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}

export default Notes;
