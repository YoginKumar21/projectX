import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api/axios";
import NoteForm from "../components/NoteForm";
import EditorDrawer from "../components/EditorDrawer";
import AppShell from "../components/layout/AppShell.jsx";

const FILTERS = [
  { key: "active", label: "All Notes", icon: "description" },
  { key: "archived", label: "Archived", icon: "archive" },
  { key: "trashed", label: "Trash", icon: "delete" },
];

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [notes, setNotes] = useState([]);
  const [counts, setCounts] = useState({
    active: 0,
    archived: 0,
    trashed: 0,
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [tags, setTags] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [activeFilter, setActiveFilter] = useState("active");
  const [editorKey, setEditorKey] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showEditorDrawer, setShowEditorDrawer] = useState(false);
  const [sharingNote, setSharingNote] = useState(null);

  const fetchCounts = async () => {
    try {
      const [activeRes, archivedRes, trashedRes] = await Promise.all([
        API.get("/notes?filter=active"),
        API.get("/notes?filter=archived"),
        API.get("/notes?filter=trashed"),
      ]);

      setCounts({
        active: activeRes.data?.length || 0,
        archived: archivedRes.data?.length || 0,
        trashed: trashedRes.data?.length || 0,
      });
    } catch (error) {
      console.error("Fetch counts error:", error);
    }
  };

  const fetchNotes = async (filter = activeFilter) => {
    try {
      setLoading(true);
      const res = await API.get(`/notes?filter=${filter}`);
      setNotes(res.data || []);
    } catch (error) {
      console.error("Fetch notes error:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboardData = async (filter = activeFilter) => {
    await Promise.all([fetchNotes(filter), fetchCounts()]);
  };

  useEffect(() => {
    refreshDashboardData(activeFilter);
    setSelectedNotes([]);
  }, [activeFilter]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "true") {
      handleNewNote();
      navigate("/dashboard", { replace: true });
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

  const resetEditor = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
    setAttachments([]);
    setTags([]);
    setIsPinned(false);
  };

  const closeEditorDrawer = () => {
    resetEditor();
    setEditorKey((prev) => prev + 1);
    setShowEditorDrawer(false);

    const nextQuery = new URLSearchParams(location.search);
    nextQuery.delete("edit");
    navigate({ pathname: "/dashboard", search: nextQuery.toString() }, { replace: true });
  };

  const handleNewNote = () => {
    resetEditor();
    setEditorKey((prev) => prev + 1);
    setSearchTerm("");
    setActiveFilter("active");
    setSelectedNotes([]);
    setShowEditorDrawer(true);
  };

  const handleEdit = (note) => {
    if (note.isCodeWorkspace) {
      navigate(`/editor?roomId=${note.codeRoomId}`);
      return;
    }

    if (activeFilter !== "active") {
      toast.error("Only active notes can be edited");
      return;
    }

    setEditingId(note._id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setAttachments(note.attachments || []);
    setTags(note.tags || []);
    setIsPinned(Boolean(note.isPinned));
    setEditorKey((prev) => prev + 1);
    setShowEditorDrawer(true);
  };

  const filteredNotes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const result = notes.filter((note) => {
      if (!term) return true;
      return (
        (note.title || "").toLowerCase().includes(term) ||
        (note.content || "").toLowerCase().includes(term) ||
        (note.tags || []).some((tag) => tag.toLowerCase().includes(term))
      );
    });

    return result.sort((a, b) => {
      if (activeFilter === "active") {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [notes, searchTerm, activeFilter]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const finalTitle = title.trim() || "Untitled Note";

    try {
      if (editingId) {
        const res = await API.put(`/notes/${editingId}`, { title: finalTitle, content, attachments, tags, isPinned });
        setNotes((prev) => prev.map((note) => (note._id === editingId ? res.data : note)));
        toast.success("Note updated successfully");
      } else {
        const res = await API.post("/notes", { title: finalTitle, content, attachments, tags, isPinned });
        if (activeFilter === "active") setNotes((prev) => [res.data, ...prev]);
        toast.success("Note created successfully");
      }
      await fetchCounts();
      closeEditorDrawer();
    } catch (error) {
      toast.error("Failed to save note");
    }
  };

  const handleTrash = async (id) => {
    if (!window.confirm("Move this note to trash?")) return;
    try {
      await API.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((note) => note._id !== id));
      await fetchCounts();
      toast.success("Moved to trash");
    } catch (error) {
      toast.error("Failed to move to trash");
    }
  };

  const handleArchiveToggle = async (id) => {
    try {
      await API.put(`/notes/${id}/archive`);
      setNotes((prev) => prev.filter((note) => note._id !== id));
      await fetchCounts();
      toast.success("Archive status updated");
    } catch (error) {
      toast.error("Failed to update archive");
    }
  };

  const handleRestore = async (id) => {
    try {
      await API.put(`/notes/${id}/restore`);
      setNotes((prev) => prev.filter((note) => note._id !== id));
      await fetchCounts();
      toast.success("Note restored");
    } catch (error) {
      toast.error("Failed to restore note");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm("Permanently delete this note?")) return;
    try {
      await API.delete(`/notes/${id}/permanent`);
      setNotes((prev) => prev.filter((note) => note._id !== id));
      await fetchCounts();
      toast.success("Permanently deleted");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleFilterChange = (filterKey) => {
    setActiveFilter(filterKey);
    setSearchTerm("");
    setSelectedNotes([]);
    if (filterKey !== "active") closeEditorDrawer();
  };

  const toggleSelectNote = (id) => {
    setSelectedNotes((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const clearSelection = () => setSelectedNotes([]);

  const bulkArchive = async () => {
    if (!window.confirm(`Archive ${selectedNotes.length} notes?`)) return;
    try {
      await Promise.all(selectedNotes.map((id) => API.put(`/notes/${id}/archive`)));
      await refreshDashboardData(activeFilter);
      clearSelection();
      toast.success("Notes archived");
    } catch (error) {
      toast.error("Bulk archive failed");
    }
  };

  const bulkTrash = async () => {
    if (!window.confirm(`Move ${selectedNotes.length} notes to trash?`)) return;
    try {
      await Promise.all(selectedNotes.map((id) => API.delete(`/notes/${id}`)));
      await refreshDashboardData(activeFilter);
      clearSelection();
      toast.success("Notes moved to trash");
    } catch (error) {
      toast.error("Bulk trash failed");
    }
  };

  const bulkRestoreFromTrash = async () => {
    try {
      await Promise.all(selectedNotes.map((id) => API.put(`/notes/${id}/restore`)));
      await refreshDashboardData(activeFilter);
      clearSelection();
      toast.success("Notes restored");
    } catch (error) {
      toast.error("Bulk restore failed");
    }
  };

  const bulkPermanentDelete = async () => {
    if (!window.confirm(`Permanently delete ${selectedNotes.length} notes?`)) return;
    try {
      await Promise.all(selectedNotes.map((id) => API.delete(`/notes/${id}/permanent`)));
      await refreshDashboardData(activeFilter);
      clearSelection();
      toast.success("Notes deleted");
    } catch (error) {
      toast.error("Bulk delete failed");
    }
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="max-w-[1280px] mx-auto space-y-6 animate-in fade-in duration-700">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-h2 text-h2 text-on-surface">Dashboard</h2>
            <p className="text-sm text-on-surface-variant max-w-lg">
              {activeFilter === "archived"
                ? "Review and restore your archived thoughts."
                : activeFilter === "trashed"
                  ? "Manage your deleted notes."
                  : "Manage your workspace and organized thoughts."}
            </p>
          </div>
          {activeFilter === "active" && (
            <button
              onClick={handleNewNote}
              className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:translate-y-[-2px] transition-all duration-300 w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              New Note
            </button>
          )}
        </div>

        {/* Filter Section */}
        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low/50 p-1.5 rounded-2xl border border-outline-variant/10 overflow-x-auto no-scrollbar">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => handleFilterChange(filter.key)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap ${
                  isActive ? "bg-primary text-on-primary shadow-md" : "text-on-surface-variant hover:bg-surface-container-high/50"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{filter.icon}</span>
                <span className="font-bold text-xs">{filter.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isActive ? "bg-on-primary/20" : "bg-surface-container-highest"}`}>
                  {counts[filter.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total" value={counts.active + counts.archived} icon="description" color="primary" />
          <StatCard label="Active" value={counts.active} icon="rocket_launch" color="secondary" />
          <StatCard label="Archived" value={counts.archived} icon="archive" color="tertiary" />
          <StatCard label="Favorites" value={notes.filter((n) => n.isPinned).length} icon="favorite" color="error" fill={true} />
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-10">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : filteredNotes.length > 0 ? (
            filteredNotes.map((note) => {
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
              : (note.content?.replace(/<[^>]*>/g, "") || "No content preview...");

            const tagColorClass = isCode
              ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400"
              : note.isPinned
                ? "bg-error/10 text-error"
                : "bg-primary/10 text-primary";

            return (
              <div
                key={note._id}
                onClick={() => handleEdit(note)}
                className={`glass-card-premium p-5 rounded-2xl hover:shadow-xl transition-all duration-300 group cursor-pointer border relative bg-surface-container-lowest/50 ${
                  selectedNotes.includes(note._id) ? "border-primary ring-1 ring-primary/20" : "border-outline-variant/10"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${tagColorClass}`}>
                    {note.isPinned ? "Favorite" : (isCode ? "Code IDE" : (note.tags?.[0] || "General"))}
                  </span>
                </div>
                <h4 className="font-bold text-on-surface mb-1.5 truncate">
                  {note.title || "Untitled Note"}
                </h4>
                <p className="text-on-surface-variant text-xs line-clamp-3 mb-4 leading-relaxed">
                  {previewText}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/5">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeFilter !== "trashed" ? (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                          title="Edit Note"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleArchiveToggle(note._id); }}
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
                    ) : (
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
                    )}
                  </div>
                </div>
              </div>
            );
          })
          ) : (
            <div onClick={handleNewNote} className="p-8 rounded-2xl border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/30 transition-colors group cursor-pointer bg-surface-container-low/20">
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-3xl text-outline-variant group-hover:text-primary">add_notes</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Start something new</h4>
                <p className="text-xs text-on-surface-variant max-w-[180px] mx-auto mt-1">Your creative journey begins with a single note.</p>
              </div>
              <button className="text-primary text-sm font-black uppercase tracking-widest hover:underline">Create Note</button>
            </div>
          )}
        </div>
      </div>

      <EditorDrawer
        open={showEditorDrawer}
        onClose={closeEditorDrawer}
        title={editingId ? "Edit Note" : "Create New Note"}
      >
        <NoteForm
          title={title}
          content={content}
          tags={tags}
          attachments={attachments}
          setTitle={setTitle}
          setContent={setContent}
          setTags={setTags}
          editingId={editingId}
          handleSubmit={handleSubmit}
          handleCancelEdit={closeEditorDrawer}
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

function StatCard({ label, value, icon, color, fill = false }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    tertiary: "bg-tertiary-container/10 text-tertiary",
    error: "bg-error/10 text-error",
  };

  return (
    <div className="glass-card-premium p-4 rounded-2xl flex items-center gap-3.5 hover:shadow-lg transition-all duration-300 cursor-default group border border-outline-variant/10">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 flex-shrink-0 ${colorMap[color]}`}>
        <span className="material-symbols-outlined text-[20px]" style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-outline uppercase tracking-widest truncate">{label}</p>
        <p className="text-xl font-bold text-on-surface leading-tight">{value}</p>
      </div>
    </div>
  );
}


export default Dashboard;