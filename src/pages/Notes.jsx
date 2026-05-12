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
    try {
      if (editingNote) {
        const res = await API.put(`/notes/${editingNote._id}`, { title, content, tags, isPinned });
        setNotes(prev => prev.map(n => n._id === editingNote._id ? res.data : n));
        toast.success("Note updated");
      } else {
        const res = await API.post("/notes", { title, content, tags, isPinned });
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
          <div className="flex bg-surface-container-low/50 p-1.5 rounded-2xl gap-1 border border-outline-variant/10 overflow-x-auto no-scrollbar">
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
          <button className="flex items-center justify-center gap-2 px-4 py-2 border border-outline-variant/10 rounded-xl text-on-surface-variant font-bold text-xs hover:bg-surface-container transition-colors w-full md:w-auto">
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
            filteredNotes.map(note => (
              <article 
                key={note._id}
                onClick={() => !note.isTrashed && handleEdit(note)}
                className={`glass-card-premium p-5 rounded-2xl relative flex flex-col h-[260px] group border border-outline-variant/5 hover:border-primary/20 hover:shadow-xl transition-all bg-surface-container-lowest/50 ${
                  note.isTrashed ? "cursor-default opacity-85" : "cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase tracking-wider">
                    {note.tags?.[0] || "General"}
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
                  {note.content?.replace(/<[^>]*>/g, "") || "No content captured yet..."}
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
                        <button className="p-1.5 hover:bg-primary/10 rounded-lg text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[16px]">share</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))
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
    </AppShell>
  );
}

export default Notes;
