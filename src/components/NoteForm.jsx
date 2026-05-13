import React, { useEffect, useState, useRef } from "react";
import socket from "../socket";
import API from "../api/axios";
import toast from "react-hot-toast";

function NoteForm({
  title,
  content,
  tags = [],
  attachments = [],
  setTitle,
  setContent,
  setTags,
  editingId,
  handleSubmit,
  handleCancelEdit,
}) {
  const [collaboratorsCount, setCollaboratorsCount] = useState(0);
  const [activeTypingUsers, setActiveTypingUsers] = useState([]);
  const [realCollaborators, setRealCollaborators] = useState([]);
  const [noteOwner, setNoteOwner] = useState(null);
  
  // Real-Time Cursors State
  const [liveCursors, setLiveCursors] = useState({});

  // Real Sharing/Collaborators States
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  // Active Image Resizing State
  const [selectedImg, setSelectedImg] = useState(null);
  const [imageStyleToolbarPos, setImageStyleToolbarPos] = useState(null);

  // Real Pinned Comments State (Initiates empty per user feedback)
  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] = useState("");
  const [commentSection, setCommentSection] = useState("General Section");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  const highlightColors = [
    { name: "Yellow Glow", hex: "#fef08a" },
    { name: "Green Mint", hex: "#bbf7d0" },
    { name: "Blue Sky", hex: "#bfdbfe" },
    { name: "Pink Rose", hex: "#fbcfe8" },
    { name: "Orange Sunset", hex: "#fed7aa" },
    { name: "Purple Lavender", hex: "#e9d5ff" }
  ];

  const isEditing = Boolean(editingId);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Sync content with ref on initial load
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content || "";
    }
  }, [content]);

  // Handle live room connection, real collaborators list, and socket broadcasts
  useEffect(() => {
    if (!editingId) {
      setCollaboratorsCount(0);
      setRealCollaborators([]);
      setNoteOwner(null);
      setLiveCursors({});
      return;
    }

    const currentUserId = localStorage.getItem("userId") || `guest-${Math.random().toString(36).substr(2, 9)}`;
    const currentUserName = localStorage.getItem("userName") || "Collaborator";

    // Join Room with complete details required by server/sockets/socketHandler.js
    socket.emit("join-note", {
      noteId: editingId,
      userId: currentUserId,
      userName: currentUserName
    });

    // Sockets Listeners for real updates
    const handleCollaboratorsUpdate = ({ count }) => {
      setCollaboratorsCount(count);
    };

    const handleLiveCursors = (cursorsList) => {
      const cursorsMap = {};
      cursorsList.forEach(c => {
        // Filter out current active client cursor
        if (c.userId !== currentUserId) {
          cursorsMap[c.socketId] = c;
        }
      });
      setLiveCursors(cursorsMap);
    };

    const handleCursorUpdate = (cursor) => {
      if (cursor.userId !== currentUserId) {
        setLiveCursors(prev => ({
          ...prev,
          [cursor.socketId]: cursor
        }));
      }
    };

    const handleRemoveCursor = ({ socketId }) => {
      setLiveCursors(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const handleUserTyping = ({ userName }) => {
      if (userName && userName !== currentUserName) {
        setActiveTypingUsers(prev => [...new Set([...prev, userName])]);
      }
    };

    const handleUserStopTyping = () => {
      setActiveTypingUsers([]);
    };

    const handleReceiveChanges = (newContent) => {
      if (editorRef.current && editorRef.current.innerHTML !== newContent) {
        editorRef.current.innerHTML = newContent || "";
        setContent(newContent);
      }
    };

    const handleReceiveTitleChanges = (newTitle) => {
      setTitle(newTitle);
    };

    const handleReceiveComments = (newComments) => {
      setComments(newComments || []);
    };

    // Attach Sockets
    socket.on("collaborators-update", handleCollaboratorsUpdate);
    socket.on("live-cursors", handleLiveCursors);
    socket.on("cursor-update", handleCursorUpdate);
    socket.on("remove-cursor", handleRemoveCursor);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("receive-changes", handleReceiveChanges);
    socket.on("receive-title-changes", handleReceiveTitleChanges);
    socket.on("receive-comments", handleReceiveComments);

    // Fetch note profile and sharing fields
    fetchRealCollaborators();

    return () => {
      socket.emit("leave-note", editingId);
      socket.off("collaborators-update", handleCollaboratorsUpdate);
      socket.off("live-cursors", handleLiveCursors);
      socket.off("cursor-update", handleCursorUpdate);
      socket.off("remove-cursor", handleRemoveCursor);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("receive-changes", handleReceiveChanges);
      socket.off("receive-title-changes", handleReceiveTitleChanges);
      socket.off("receive-comments", handleReceiveComments);
    };
  }, [editingId]);

  const fetchRealCollaborators = async () => {
    try {
      const res = await API.get(`/notes/${editingId}`);
      if (res.data) {
        setRealCollaborators(res.data.sharedWith || []);
        setNoteOwner(res.data.owner || null);
      }
    } catch (err) {
      console.error("Error fetching note collaborators:", err);
    }
  };

  const updateContent = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // Broadcast text changes in real-time
  const handleEditorInput = (e) => {
    updateContent();

    if (editingId) {
      const newContent = e.target.innerHTML;
      socket.emit("send-changes", { noteId: editingId, content: newContent });

      // Trigger typing sync
      const currentUserName = localStorage.getItem("userName") || "Collaborator";
      socket.emit("typing", { noteId: editingId, userName: currentUserName });

      // Debounce typing status
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", { noteId: editingId });
      }, 1500);
    }
  };

  // Broadcast title changes in real-time
  const handleTitleChange = (e) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    if (editingId) {
      socket.emit("send-title-changes", { noteId: editingId, title: nextTitle });
    }
  };

  // Broadcast mouse coordinates on the page canvas
  const handlePageMouseMove = (e) => {
    if (!editingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Relative layout %
    const y = ((e.clientY - rect.top) / rect.height) * 100; // Relative layout %
    
    socket.emit("cursor-move", { noteId: editingId, x, y });
  };

  const applyFormat = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateContent();
  };

  const insertHtmlAtCursor = (html) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    updateContent();
  };

  // Base64 Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Please upload images under 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const imgHtml = `<img src="${reader.result}" class="rounded-xl my-4 max-w-full shadow-lg border border-slate-100 transition-all cursor-pointer" style="width: 100%; height: auto;" alt="Embedded Asset" />`;
        insertHtmlAtCursor(imgHtml);
        toast.success("Image embedded! Click to resize.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Embed Hyperlink
  const handleInsertLink = () => {
    const url = prompt("Enter hyperlink URL:", "https://");
    if (url) {
      applyFormat("createLink", url);
      toast.success("Link added successfully");
    }
  };

  // Image Click Listener for Resizing Overlay Toolbar
  const handleEditorClick = (e) => {
    if (e.target.tagName === "IMG") {
      if (selectedImg) {
        selectedImg.classList.remove("selected-img-active");
      }
      
      const img = e.target;
      img.classList.add("selected-img-active");
      setSelectedImg(img);

      const editorRect = editorRef.current.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      
      setImageStyleToolbarPos({
        top: imgRect.bottom - editorRect.top + 8,
        left: Math.max(12, imgRect.left - editorRect.left + (imgRect.width / 2) - 130),
      });
    } else {
      if (selectedImg) {
        selectedImg.classList.remove("selected-img-active");
      }
      setSelectedImg(null);
      setImageStyleToolbarPos(null);
    }
  };

  const handleResizeImage = (widthPercent) => {
    if (selectedImg) {
      selectedImg.style.width = widthPercent;
      selectedImg.style.height = "auto";
      updateContent();
      if (editingId) {
        socket.emit("send-changes", { noteId: editingId, content: editorRef.current.innerHTML });
      }
      toast.success(`Image resized to ${widthPercent}`);
    }
  };

  const handleRemoveImage = () => {
    if (selectedImg) {
      selectedImg.remove();
      setSelectedImg(null);
      setImageStyleToolbarPos(null);
      updateContent();
      if (editingId) {
        socket.emit("send-changes", { noteId: editingId, content: editorRef.current.innerHTML });
      }
      toast.success("Image removed");
    }
  };

  // Real DB-Backed Sharing Function
  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setIsSharing(true);
      const res = await API.post(`/notes/${editingId}/share`, { email: shareEmail });
      toast.success(res.data?.message || "Collaborator added successfully!");
      setShareEmail("");
      setShowShareModal(false);
      fetchRealCollaborators(); // Reload list
    } catch (err) {
      const msg = err.response?.data?.message || "User with this email not found";
      toast.error(msg);
    } finally {
      setIsSharing(false);
    }
  };

  // Comments Management
  const handleAddCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      author: `${localStorage.getItem("userName") || "You"} (Pro Member)`,
      text: commentText,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      section: commentSection || "General Document"
    };

    const nextComments = [...comments, newComment];
    setComments(nextComments);
    if (editingId) {
      socket.emit("send-comments", { noteId: editingId, comments: nextComments });
    }
    setCommentText("");
    setIsAddingComment(false);
    toast.success("Comment pinned to section!");
  };

  const handleResolveComment = (id) => {
    const nextComments = comments.filter(c => c.id !== id);
    setComments(nextComments);
    if (editingId) {
      socket.emit("send-comments", { noteId: editingId, comments: nextComments });
    }
    toast.success("Comment thread resolved");
  };

  const textColors = [
    { name: "Slate Black", hex: "#0f172a" },
    { name: "Royal Blue", hex: "#2563eb" },
    { name: "Indigo Purple", hex: "#4f46e5" },
    { name: "Emerald Green", hex: "#059669" },
    { name: "Crimson Red", hex: "#dc2626" },
    { name: "Coral Pink", hex: "#db2777" },
    { name: "Amber Gold", hex: "#d97706" }
  ];

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      
      {/* GOOGLE DOC WORKSPACE MAIN HEADER PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        
        {/* Document Title row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Document Title & Saved indicator */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="material-symbols-outlined text-primary text-4xl shrink-0">description</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Untitled Document"
                  className="bg-transparent border-none p-0 text-lg font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none w-full max-w-[320px] placeholder:text-slate-400"
                />
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase text-outline rounded">Saved</span>
              </div>
              <p className="text-[10px] text-outline font-bold mt-1 uppercase tracking-wider flex items-center gap-2">
                <span>{isEditing ? `Live Room ID: ${editingId}` : "Local Document Canvas"}</span>
                {activeTypingUsers.length > 0 && (
                  <span className="text-emerald-500 animate-pulse font-black uppercase tracking-widest text-[9px] ml-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                    {activeTypingUsers.join(", ")} typing...
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Sockets Sync and Real DB-Backed Collaborators Presence */}
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            
            {/* Real Collaborators dynamic avatars bubble list */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
              <div className="flex -space-x-1.5">
                {/* Note Owner Avatar */}
                <div 
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 text-white font-bold flex items-center justify-center text-[9px] shadow-sm uppercase cursor-pointer" 
                  title={`Owner: ${noteOwner?.name || 'You'}`}
                >
                  {(noteOwner?.name || localStorage.getItem("userName") || "Y").charAt(0)}
                </div>

                {/* Real collaborators dynamic display */}
                {realCollaborators.map((collab) => (
                  <div 
                    key={collab._id}
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 text-white font-bold flex items-center justify-center text-[9px] shadow-sm uppercase cursor-pointer" 
                    title={`Collaborator: ${collab.name} (${collab.email})`}
                  >
                    {collab.name.charAt(0)}
                  </div>
                ))}
              </div>

              <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                {collaboratorsCount || 1} active
              </span>
            </div>

            {/* REAL COLLABORATOR ADDITION CONTROL */}
            {isEditing ? (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-950/60 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-indigo-200/30"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Add Collaborator
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error("Please create your document first before inviting collaborators!")}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-not-allowed border border-slate-200/20"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Add Collaborator
              </button>
            )}

            {/* Note submit/cancel actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-on-primary font-bold text-xs rounded-xl shadow-md shadow-primary/10 transition-transform active:scale-95"
              >
                {isEditing ? "Save Document" : "Create Document"}
              </button>
            </div>

          </div>

        </div>

        {/* GOOGLE DOC STYLE INTERACTIVE FORMATTING TOOLBAR */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
          
          {/* Undo / Redo */}
          <button onClick={() => applyFormat("undo")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-600 dark:text-slate-300" title="Undo (Ctrl+Z)">
            <span className="material-symbols-outlined text-[18px]">undo</span>
          </button>
          <button onClick={() => applyFormat("redo")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-600 dark:text-slate-300" title="Redo (Ctrl+Y)">
            <span className="material-symbols-outlined text-[18px]">redo</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Heading Style Selectors */}
          <button onClick={() => applyFormat("formatBlock", "p")} className="px-2.5 py-1 text-[11px] font-bold hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded-lg" title="Normal Text">
            Normal text
          </button>
          <button onClick={() => applyFormat("formatBlock", "h1")} className="px-2.5 py-1 text-[11px] font-bold hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded-lg" title="Heading 1">
            H1
          </button>
          <button onClick={() => applyFormat("formatBlock", "h2")} className="px-2.5 py-1 text-[11px] font-bold hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded-lg" title="Heading 2">
            H2
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Bold, Italic, Underline, Strikethrough */}
          <button onClick={() => applyFormat("bold")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300 font-bold" title="Bold (Ctrl+B)">
            <span className="material-symbols-outlined text-[18px] font-bold">format_bold</span>
          </button>
          <button onClick={() => applyFormat("italic")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300 italic" title="Italic (Ctrl+I)">
            <span className="material-symbols-outlined text-[18px]">format_italic</span>
          </button>
          <button onClick={() => applyFormat("underline")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Underline (Ctrl+U)">
            <span className="material-symbols-outlined text-[18px]">format_underlined</span>
          </button>
          <button onClick={() => applyFormat("strikeThrough")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Strikethrough">
            <span className="material-symbols-outlined text-[18px]">format_strikethrough</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Text Color Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowColorMenu(!showColorMenu)} 
              className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1"
              title="Text Color"
            >
              <span className="material-symbols-outlined text-[18px]">format_color_text</span>
              <span className="text-[10px] font-black uppercase text-primary">A</span>
            </button>
            {showColorMenu && (
              <div className="absolute top-9 left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl shadow-xl flex flex-col gap-1.5 w-36">
                <p className="text-[9px] font-black uppercase tracking-widest text-outline border-b pb-1">Text Colors</p>
                {textColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => {
                      applyFormat("foreColor", color.hex);
                      setShowColorMenu(false);
                    }}
                    className="flex items-center gap-2 px-1.5 py-1 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200/40" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Highlight Color Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowHighlightMenu(!showHighlightMenu)} 
              className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1"
              title="Highlight Color"
            >
              <span className="material-symbols-outlined text-[18px]">border_color</span>
              <span className="text-[10px] font-black uppercase text-secondary">H</span>
            </button>
            {showHighlightMenu && (
              <div className="absolute top-9 left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl shadow-xl flex flex-col gap-1.5 w-36">
                <p className="text-[9px] font-black uppercase tracking-widest text-outline border-b pb-1">Highlight Colors</p>
                {highlightColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => {
                      applyFormat("hiliteColor", color.hex);
                      setShowHighlightMenu(false);
                    }}
                    className="flex items-center gap-2 px-1.5 py-1 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200/40" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    applyFormat("hiliteColor", "transparent");
                    setShowHighlightMenu(false);
                  }}
                  className="flex items-center gap-2 px-1.5 py-1 text-xs text-left text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-semibold"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-dashed border-red-300 flex items-center justify-center text-[10px]">✕</span>
                  Clear Highlight
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Alignments */}
          <button onClick={() => applyFormat("justifyLeft")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Align Left">
            <span className="material-symbols-outlined text-[18px]">format_align_left</span>
          </button>
          <button onClick={() => applyFormat("justifyCenter")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Align Center">
            <span className="material-symbols-outlined text-[18px]">format_align_center</span>
          </button>
          <button onClick={() => applyFormat("justifyRight")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Align Right">
            <span className="material-symbols-outlined text-[18px]">format_align_right</span>
          </button>
          <button onClick={() => applyFormat("justifyFull")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Align Justified">
            <span className="material-symbols-outlined text-[18px]">format_align_justify</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Bullet and Numbered Lists */}
          <button onClick={() => applyFormat("insertUnorderedList")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Bulleted List">
            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
          </button>
          <button onClick={() => applyFormat("insertOrderedList")} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Numbered List">
            <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Insert Media (Image, Links) */}
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
          <button onClick={() => fileInputRef.current.click()} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Insert Local Image">
            <span className="material-symbols-outlined text-[18px]">image</span>
          </button>
          <button onClick={handleInsertLink} className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300" title="Insert Link">
            <span className="material-symbols-outlined text-[18px]">link</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Add Pinned Comment */}
          <button 
            onClick={() => setIsAddingComment(!isAddingComment)} 
            className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold ${
              isAddingComment ? "bg-primary/10 text-primary" : "hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300"
            }`}
            title="Pin Comment / Message"
          >
            <span className="material-symbols-outlined text-[18px]">add_comment</span>
            <span className="text-[10px] font-black uppercase tracking-wider">Add Comment</span>
          </button>

        </div>

      </div>

      {/* NEW COMMENT COMPOSE OVERLAY POPUP */}
      {isAddingComment && (
        <form onSubmit={handleAddCommentSubmit} className="glass-card-premium p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-3 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">add_comment</span>
              Pin New Message to Page Section
            </h4>
            <button type="button" onClick={() => setIsAddingComment(false)} className="text-outline hover:text-slate-900 dark:hover:text-white">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-outline ml-1">Document Section / Anchor</label>
              <input
                type="text"
                value={commentSection}
                onChange={(e) => setCommentSection(e.target.value)}
                placeholder="e.g. Executive Summary"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-outline ml-1">Your Comment / Message</label>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type your feedback message here..."
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-800 dark:text-slate-100"
                required
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg shadow hover:brightness-105 active:scale-95"
            >
              Pin Comment
            </button>
          </div>
        </form>
      )}

      {/* REAL COLLABORATOR INVITATION SHIELD (MODAL) */}
      {showShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="glass-card-premium w-full max-w-md rounded-2xl shadow-2xl p-6 border border-outline-variant/10 animate-in zoom-in-95 duration-200 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_add</span>
                Invite Teammate Collaborator
              </h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCollaborator} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Collaborator Email</label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-medium"
                  required
                />
                <p className="text-[10px] text-outline font-medium leading-relaxed pt-1">
                  Invite your colleagues via their registered email address. They will receive access permissions to edit this document in real-time.
                </p>
              </div>

              {realCollaborators.length > 0 && (
                <div className="space-y-2 border-t dark:border-slate-800 pt-3.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline">Current Collaborators ({realCollaborators.length})</p>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {realCollaborators.map((user) => (
                      <div key={user._id} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[9px] uppercase">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                          <p className="text-[10px] text-outline truncate">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSharing}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-on-primary rounded-xl font-bold text-xs shadow-lg shadow-primary/15 flex items-center justify-center gap-1.5 transition-all"
                >
                  {isSharing ? "Inviting..." : "Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE DOC WORKSPACE BG CANVAS CONTAINER */}
      <div className="flex flex-col xl:flex-row gap-6 bg-[#f8f9fa] dark:bg-slate-950/20 rounded-[2.5rem] p-6 min-h-[900px] border border-slate-200/50 dark:border-slate-800/40 relative">
        
        {/* CENTER COLUMN: Google Doc Physical Sheet Page */}
        <div className="flex-1 flex flex-col items-center p-2 sm:p-4 overflow-x-auto relative">
          
          {/* FLOATING IMAGE RESIZE TOOLBAR */}
          {imageStyleToolbarPos && (
            <div 
              style={{ top: `${imageStyleToolbarPos.top}px`, left: `${imageStyleToolbarPos.left}px` }}
              className="absolute z-50 bg-slate-900/95 dark:bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-2xl flex items-center gap-1 text-white animate-in zoom-in-90 duration-150"
            >
              <span className="text-[9px] font-black uppercase text-slate-400 px-2 border-r border-slate-700">Resize</span>
              <button onClick={() => handleResizeImage("25%")} className="px-2 py-1 text-[10px] font-black uppercase hover:bg-white/10 rounded transition-colors">25%</button>
              <button onClick={() => handleResizeImage("50%")} className="px-2 py-1 text-[10px] font-black uppercase hover:bg-white/10 rounded transition-colors">50%</button>
              <button onClick={() => handleResizeImage("75%")} className="px-2 py-1 text-[10px] font-black uppercase hover:bg-white/10 rounded transition-colors">75%</button>
              <button onClick={() => handleResizeImage("100%")} className="px-2 py-1 text-[10px] font-black uppercase hover:bg-white/10 rounded transition-colors">100%</button>
              <div className="w-px h-4 bg-slate-700 mx-1" />
              <button onClick={handleRemoveImage} className="p-1 hover:bg-red-500/30 hover:text-red-400 rounded transition-colors" title="Delete Image">
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              </button>
            </div>
          )}

          <div 
            onMouseMove={handlePageMouseMove}
            className="w-full max-w-[800px] min-h-[1050px] bg-white border border-slate-200/60 shadow-[0_4px_24px_rgba(15,23,42,0.04),0_1px_4px_rgba(15,23,42,0.02)] dark:bg-slate-900 dark:border-slate-800 rounded-[4px] p-12 sm:p-16 relative text-slate-900 dark:text-slate-100 flex flex-col justify-between"
          >
            
            <div className="space-y-4 relative">
              
              {/* REAL-TIME COLLABORATIVE POINTER PRESENCE (MAPPED FROM BACKEND SOCKET) */}
              {Object.values(liveCursors).map((cursor) => (
                <div
                  key={cursor.socketId}
                  className="absolute pointer-events-none transition-all duration-100 ease-out z-[40]"
                  style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
                >
                  {/* Dynamic Pointer Arrow */}
                  <svg 
                    className="w-5 h-5 drop-shadow-sm" 
                    viewBox="0 0 24 24" 
                    fill={cursor.color} 
                    stroke="white" 
                    strokeWidth="1.5"
                  >
                    <path d="M4.5 3v15.3l4.7-4.6h6.3L4.5 3z" />
                  </svg>
                  
                  {/* Dynamic Pointer Name Label */}
                  <div 
                    className="px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-md whitespace-nowrap -mt-1 ml-3"
                    style={{ backgroundColor: cursor.color }}
                  >
                    {cursor.userName}
                  </div>
                </div>
              ))}

              {/* Document Text Editor Canvas */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onClick={handleEditorClick}
                className="google-doc-editor-canvas min-h-[850px] text-[15px] leading-8 text-slate-800 dark:text-slate-200 outline-none p-1 border-none focus:ring-0 select-text font-medium"
                data-placeholder="Start typing your collaborative workspace documents here..."
              />

            </div>

            {/* Document page footers */}
            <div className="text-[9px] text-outline font-black uppercase tracking-widest border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-8 flex justify-between">
              <span>SyncPad Word Processor v3.1</span>
              <span>Page 1 of 1</span>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Pinned Comments threads sidebar */}
        <div className="w-full xl:w-[290px] shrink-0 space-y-4 flex flex-col justify-start">
          
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-xs text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">chat_bubble</span>
              Pinned Comments ({comments.length})
            </h3>
            <span className="text-[9px] font-black uppercase text-outline">Floating Panel</span>
          </div>

          {comments.length > 0 ? (
            <div className="space-y-3.5 max-h-[850px] overflow-y-auto pr-1 no-scrollbar">
              {comments.map((comment) => (
                <div 
                  key={comment.id}
                  className="glass-card-premium p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-between gap-2 hover:-translate-y-0.5 transition-all relative overflow-hidden group"
                >
                  {/* Left accent color for comments */}
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary/40" />

                  <div className="flex items-start justify-between gap-1.5 pl-1.5">
                    <div>
                      <h4 className="font-bold text-xs text-on-surface leading-tight">{comment.author}</h4>
                      <p className="text-[9px] font-black uppercase text-primary tracking-widest mt-0.5">{comment.section}</p>
                    </div>
                    <span className="text-[9px] font-black text-outline uppercase">{comment.createdAt}</span>
                  </div>

                  <p className="text-xs text-on-surface-variant pl-1.5 leading-relaxed font-medium">
                    "{comment.text}"
                  </p>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleResolveComment(comment.id)}
                      className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                    >
                      <span className="material-symbols-outlined text-[13px] font-black">check</span>
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/10">
              <span className="material-symbols-outlined text-outline-variant text-2xl mb-1.5">chat_bubble_outline</span>
              <p className="text-xs text-on-surface-variant italic font-medium">No active comments on this document.</p>
              <button 
                onClick={() => setIsAddingComment(true)}
                className="text-[9px] text-primary font-black uppercase tracking-widest mt-2 hover:underline block mx-auto"
              >
                Create first comment
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default NoteForm;