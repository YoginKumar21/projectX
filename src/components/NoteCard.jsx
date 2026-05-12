import {
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  Trash,
  Clock3,
  Star,
  Tag,
  Paperclip,
  CheckSquare,
  Square,
  Users,
} from "lucide-react";

function stripHtml(html = "") {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

function formatDate(date) {
  if (!date) return "Recently updated";

  try {
    return new Date(date).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Recently updated";
  }
}

function NoteCard({
  note,
  viewMode = "active",
  onEdit,
  onTrash,
  onArchiveToggle,
  onRestore,
  onPermanentDelete,
  isSelected = false,
  onToggleSelect,
  bulkMode = false,
}) {
  const previewText = stripHtml(note.content || "").trim();
  const tags = Array.isArray(note.tags) ? note.tags : [];
  const attachments = Array.isArray(note.attachments) ? note.attachments : [];
  const sharedCount = Array.isArray(note.sharedWith) ? note.sharedWith.length : 0;

  const preview =
    previewText.length > 180
      ? `${previewText.slice(0, 180)}...`
      : previewText || "No content yet.";

  const metaDate =
    viewMode === "trashed"
      ? note.trashedAt || note.updatedAt
      : viewMode === "archived"
        ? note.archivedAt || note.updatedAt
        : note.updatedAt;

  return (
    <div
      className={`group relative overflow-hidden rounded-[28px] border bg-white p-5 shadow-sm transition duration-300 dark:bg-slate-900 ${
        isSelected
          ? "border-slate-900 ring-2 ring-slate-900/10 dark:border-white dark:ring-white/10"
          : "border-slate-200 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-50 to-transparent opacity-80 dark:from-slate-800/40 dark:to-transparent" />

      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {viewMode === "active" && note.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <Star size={12} className="fill-current" />
                  Pinned
                </span>
              )}

              {viewMode === "archived" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Archive size={12} />
                  Archived
                </span>
              )}

              {viewMode === "trashed" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  <Trash2 size={12} />
                  Trash
                </span>
              )}

              {sharedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <Users size={12} />
                  Shared
                </span>
              )}
            </div>

            <h3 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {note.title || "Untitled Note"}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                {formatDate(metaDate)}
              </span>

              {attachments.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Paperclip size={13} />
                  {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onToggleSelect?.(note._id)}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
              title={isSelected ? "Deselect note" : "Select note"}
            >
              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-3xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="line-clamp-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {preview}
          </p>
        </div>

        {tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Tag size={11} />
                {tag}
              </span>
            ))}

            {tags.length > 4 && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                +{tags.length - 4} more
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {viewMode === "active" && !bulkMode && (
            <>
              <button
                type="button"
                onClick={() => onEdit?.(note)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
              >
                <Edit size={15} />
                Edit
              </button>

              <button
                type="button"
                onClick={() => onArchiveToggle?.(note._id, false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Archive size={15} />
                Archive
              </button>

              <button
                type="button"
                onClick={() => onTrash?.(note._id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              >
                <Trash2 size={15} />
                Trash
              </button>
            </>
          )}

          {viewMode === "archived" && !bulkMode && (
            <>
              <button
                type="button"
                onClick={() => onArchiveToggle?.(note._id, true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
              >
                <RotateCcw size={15} />
                Restore
              </button>

              <button
                type="button"
                onClick={() => onTrash?.(note._id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              >
                <Trash2 size={15} />
                Trash
              </button>
            </>
          )}

          {viewMode === "trashed" && !bulkMode && (
            <>
              <button
                type="button"
                onClick={() => onRestore?.(note._id)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
              >
                <RotateCcw size={15} />
                Restore
              </button>

              <button
                type="button"
                onClick={() => onPermanentDelete?.(note._id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              >
                <Trash size={15} />
                Delete Forever
              </button>
            </>
          )}

          {bulkMode && (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Bulk selection active
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoteCard;