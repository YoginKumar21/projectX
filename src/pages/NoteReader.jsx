import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Pin,
  Paperclip,
  CalendarDays,
  Tag,
  ExternalLink,
  Download,
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode2,
  Copy,
  List,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Share2,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../api/axios";
import AppShell from "../components/layout/AppShell.jsx";

function formatDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
}

function resolveFileUrl(url = "") {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const apiBase =
    (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(
      /\/api$/,
      "",
    );

  if (url.startsWith("/")) return `${apiBase}${url}`;
  return `${apiBase}/${url}`;
}

function getAttachmentIcon(file = {}) {
  const mime = file.mimetype || "";
  const name = file.originalName || file.filename || "";

  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("audio/")) return FileAudio;

  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    name.match(/\.(zip|rar|7z|tar|gz)$/i)
  ) {
    return FileArchive;
  }

  if (
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("html") ||
    mime.includes("css") ||
    mime.includes("xml") ||
    name.match(/\.(js|jsx|ts|tsx|json|html|css|xml|py|java|cpp|c)$/i)
  ) {
    return FileCode2;
  }

  return FileText;
}

function getFileTypeLabel(file = {}) {
  const mime = file.mimetype || "";
  const name = file.originalName || file.filename || "";

  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime.includes("pdf") || name.match(/\.pdf$/i)) return "PDF";
  if (mime.includes("word") || name.match(/\.(doc|docx)$/i)) return "Document";
  if (mime.includes("sheet") || name.match(/\.(xls|xlsx|csv)$/i)) {
    return "Spreadsheet";
  }
  if (mime.includes("presentation") || name.match(/\.(ppt|pptx)$/i)) {
    return "Presentation";
  }
  if (name.match(/\.(zip|rar|7z|tar|gz)$/i)) return "Archive";

  return "File";
}

function extractYoutubeId(url = "") {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1);
    }

    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}

function slugify(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function enhanceEmbeds(html = "") {
  if (!html) return "";

  let output = html;

  output = output.replace(
    /<oembed[^>]*url="([^"]+)"[^>]*><\/oembed>/gi,
    (_, url) => {
      const youtubeId = extractYoutubeId(url);

      if (youtubeId) {
        return `
          <div class="reader-embed">
            <iframe
              src="https://www.youtube.com/embed/${youtubeId}"
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          </div>
        `;
      }

      return `
        <a
          class="reader-link-card"
          href="${url}"
          target="_blank"
          rel="noreferrer"
        >
          <span class="reader-link-card-label">Embedded Link</span>
          <span class="reader-link-card-url">${url}</span>
        </a>
      `;
    },
  );

  return output;
}

function addIdsToHeadings(html = "") {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h1, h2, h3");

  const usedIds = new Set();

  headings.forEach((heading, index) => {
    const text = heading.textContent?.trim() || `section-${index + 1}`;
    let id = slugify(text) || `section-${index + 1}`;

    let uniqueId = id;
    let count = 1;

    while (usedIds.has(uniqueId)) {
      uniqueId = `${id}-${count}`;
      count += 1;
    }

    usedIds.add(uniqueId);
    heading.setAttribute("id", uniqueId);
  });

  return doc.body.innerHTML;
}

function extractTocItems(html = "") {
  if (!html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = [...doc.querySelectorAll("h1, h2, h3")];

  return headings.map((heading, index) => ({
    id: heading.getAttribute("id") || `section-${index + 1}`,
    text: heading.textContent?.trim() || `Section ${index + 1}`,
    level: heading.tagName.toLowerCase(),
  }));
}

function NoteReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const articleRef = useRef(null);

  const [note, setNote] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [activeHeading, setActiveHeading] = useState("");
  const [lightboxImage, setLightboxImage] = useState("");
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  const processedContent = useMemo(() => {
    const embedded = enhanceEmbeds(note?.content || "");
    return addIdsToHeadings(embedded);
  }, [note]);

  const tocItems = useMemo(() => {
    return extractTocItems(processedContent);
  }, [processedContent]);

  const orderedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [notes]);

  const currentNoteIndex = useMemo(() => {
    return orderedNotes.findIndex((item) => item._id === id);
  }, [orderedNotes, id]);

  const previousNote =
    currentNoteIndex >= 0 ? orderedNotes[currentNoteIndex - 1] : null;
  const nextNote =
    currentNoteIndex >= 0 ? orderedNotes[currentNoteIndex + 1] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [noteRes, notesRes] = await Promise.all([
          API.get(`/notes/${id}`),
          API.get("/notes"),
        ]);

        setNote(noteRes.data);
        setNotes(notesRes.data || []);
      } catch (error) {
        console.error("Failed to fetch note:", error);
        toast.error("Failed to load note");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    if (!articleRef.current || !processedContent) return;

    const root = articleRef.current;

    const codeBlocks = root.querySelectorAll("pre");
    codeBlocks.forEach((pre, index) => {
      if (pre.parentElement?.classList.contains("reader-code-wrap")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "reader-code-wrap";

      const toolbar = document.createElement("div");
      toolbar.className = "reader-code-toolbar";

      const button = document.createElement("button");
      button.className = "reader-copy-btn";
      button.type = "button";
      button.innerHTML = `
        <span>${copiedCodeIndex === index ? "Copied" : "Copy"}</span>
      `;

      button.onclick = async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText || "");
          setCopiedCodeIndex(index);
          toast.success("Code copied");
          setTimeout(() => {
            setCopiedCodeIndex((current) => (current === index ? null : current));
          }, 2000);
        } catch (error) {
          console.error("Copy failed:", error);
          toast.error("Failed to copy code");
        }
      };

      toolbar.appendChild(button);

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(toolbar);
      wrapper.appendChild(pre);
    });

    const images = root.querySelectorAll("img");
    images.forEach((img) => {
      img.classList.add("reader-zoomable-image");
      img.setAttribute("loading", "lazy");

      if (img.parentElement?.classList.contains("reader-image-wrap")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "reader-image-wrap";

      const zoomButton = document.createElement("button");
      zoomButton.className = "reader-image-zoom-btn";
      zoomButton.type = "button";
      zoomButton.innerHTML = `<span>Zoom</span>`;

      zoomButton.onclick = () => {
        setLightboxImage(img.getAttribute("src") || "");
      };

      img.onclick = () => {
        setLightboxImage(img.getAttribute("src") || "");
      };

      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      wrapper.appendChild(zoomButton);
    });
  }, [processedContent, copiedCodeIndex]);

  useEffect(() => {
    if (!articleRef.current || tocItems.length === 0) return;

    const headingElements = tocItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (headingElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveHeading(visible[0].target.id);
        }
      },
      {
        rootMargin: "-120px 0px -60% 0px",
        threshold: 0.1,
      },
    );

    headingElements.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [tocItems]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setLightboxImage("");
        setIsTocOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const updateProgress = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollHeight = doc.scrollHeight - window.innerHeight;

      if (scrollHeight <= 0) {
        setReadingProgress(0);
        return;
      }

      const progress = Math.min((scrollTop / scrollHeight) * 100, 100);
      setReadingProgress(progress);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress);

    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  const handleEdit = () => {
    navigate(`/dashboard?edit=${id}`);
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleTocClick = (headingId) => {
    const el = document.getElementById(headingId);
    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setIsTocOpen(false);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/notes/${id}`;
    const shareTitle = note?.title || "SyncPad Note";

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: `Check out this note: ${shareTitle}`,
          url: shareUrl,
        });
        toast.success("Note shared");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Reader link copied");
    } catch (error) {
      console.error("Share failed:", error);
      toast.error("Failed to share note");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <AppShell title="Loading Note" subtitle="Preparing reader view...">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="mb-6 h-10 w-40 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 h-10 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="mb-8 h-5 w-1/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-11/12 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-10/12 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-9/12 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!note) {
    return (
      <AppShell title="Note Reader" subtitle="Unable to open note">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Note not found
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            The note may have been removed or you may not have access to it.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  const attachments = note.attachments || [];
  const plainTextLength = (note.content || "")
    .replace(/<[^>]+>/g, "")
    .trim().length;

  return (
    <AppShell
      title="Reader View"
      subtitle="Clean full-page note reading experience"
    >
      <div className="reader-progress-print-hide fixed left-0 right-0 top-0 z-[90] h-1 bg-slate-200/70 dark:bg-slate-800/70">
        <div
          className="h-full bg-slate-900 transition-all duration-150 dark:bg-white"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="reader-toolbar-print-hide mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {tocItems.length > 0 && (
              <button
                onClick={() => setIsTocOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
              >
                <List size={16} />
                Contents
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Share2 size={16} />
              Share
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Printer size={16} />
              Print
            </button>

            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white dark:text-slate-900"
            >
              <Pencil size={16} />
              Edit Note
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:rounded-none print:border-0 print:shadow-none">
              <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/70 px-6 py-8 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 sm:px-8 print:bg-white print:px-0 dark:print:bg-white">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {note.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      <Pin size={12} />
                      Pinned
                    </span>
                  )}

                  {(note.tags || []).map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white print:text-black sm:text-4xl">
                  {note.title || "Untitled Note"}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 print:text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={16} />
                    Updated {formatDate(note.updatedAt)}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <FileText size={16} />
                    {plainTextLength} characters
                  </span>

                  {attachments.length > 0 && (
                    <span className="inline-flex items-center gap-2">
                      <Paperclip size={16} />
                      {attachments.length} attachment{attachments.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-6 py-8 sm:px-8 print:px-0">
                <article
                  ref={articleRef}
                  className="reader-content prose prose-slate max-w-none dark:prose-invert print:max-w-none print:prose-black"
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              </div>
            </div>

            <div className="reader-toolbar-print-hide mt-8 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => previousNote && navigate(`/notes/${previousNote._id}`)}
                disabled={!previousNote}
                className="group flex items-center justify-between rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    <ChevronLeft size={14} />
                    Previous Note
                  </div>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {previousNote?.title || "No previous note"}
                  </p>
                </div>
              </button>

              <button
                onClick={() => nextNote && navigate(`/notes/${nextNote._id}`)}
                disabled={!nextNote}
                className="group flex items-center justify-between rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="ml-auto min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Next Note
                    <ChevronRight size={14} />
                  </div>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {nextNote?.title || "No next note"}
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/60 print:hidden">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Attachments
              </h3>

              {attachments.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  No attachments for this note.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {attachments.map((file, index) => {
                    const Icon = getAttachmentIcon(file);
                    const fileUrl = resolveFileUrl(file.url || file.path || "");
                    const label = getFileTypeLabel(file);

                    return (
                      <div
                        key={file._id || file.filename || index}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                            <Icon
                              size={18}
                              className="text-slate-700 dark:text-slate-200"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {file.originalName || file.filename || "Attachment"}
                              </p>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {label}
                              </span>
                            </div>

                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {file.size
                                ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                                : "File attached"}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <ExternalLink size={14} />
                                Open
                              </a>

                              <a
                                href={fileUrl}
                                download
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
                              >
                                <Download size={14} />
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-24 space-y-6">
              {tocItems.length > 0 && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Table of Contents
                  </h3>

                  <div className="space-y-1">
                    {tocItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleTocClick(item.id)}
                        className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                          activeHeading === item.id
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        } ${
                          item.level === "h2"
                            ? "ml-3"
                            : item.level === "h3"
                              ? "ml-6"
                              : ""
                        }`}
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Note Info
                </h3>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Title
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {note.title || "Untitled Note"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {formatDate(note.updatedAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Tags
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(note.tags || []).length > 0 ? (
                        note.tags.map((tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          No tags added
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Progress
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {Math.round(readingProgress)}% read
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {isTocOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm lg:hidden">
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Table of Contents
              </h3>
              <button
                onClick={() => setIsTocOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTocClick(item.id)}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    activeHeading === item.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  } ${
                    item.level === "h2"
                      ? "ml-3"
                      : item.level === "h3"
                        ? "ml-6"
                        : ""
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="reader-lightbox"
          onClick={() => setLightboxImage("")}
        >
          <button
            className="reader-lightbox-close"
            onClick={() => setLightboxImage("")}
          >
            <X size={20} />
          </button>

          <div
            className="reader-lightbox-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reader-lightbox-label">
              <ZoomIn size={16} />
              Image Preview
            </div>
            <img
              src={lightboxImage}
              alt="Preview"
              className="reader-lightbox-image"
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default NoteReader;