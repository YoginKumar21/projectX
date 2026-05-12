import {
  X,
  Sparkles,
  Copy,
  Check,
  Replace,
  PlusSquare,
  Star,
  History,
  Save,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";

function textToHtml(text = "") {
  return `<div>${text
    .split("\n")
    .map((line) => `<p>${line || "<br />"}</p>`)
    .join("")}</div>`;
}

function AIDrawer({
  open,
  onClose,
  result,
  resultTitle = "AI Result",
  resultHistory = [],
  pinnedResults = [],
  onApply,
  onInsert,
  onRestoreHistory,
  onTogglePin,
  editingId,
  noteTitle,
  fetchVersions,
}) {
  const [copied, setCopied] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result || "");
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(textToHtml(result));
    toast.success("AI result applied");
  };

  const handleInsert = () => {
    if (!result) return;
    onInsert(textToHtml(result));
    toast.success("AI result inserted");
  };

  const handleSaveAsVersion = async () => {
    if (!editingId || !result) {
      toast.error("Open an existing note first");
      return;
    }

    try {
      setSavingVersion(true);

      await API.post(`/notes/${editingId}/save-ai-version`, {
        title: `${noteTitle || "Note"} - AI Version`,
        content: textToHtml(result),
      });

      toast.success("AI result saved as version");
      if (typeof fetchVersions === "function") {
        await fetchVersions();
      }
    } catch (error) {
      toast.error("Failed to save AI result as version");
    } finally {
      setSavingVersion(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[430px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                AI Workspace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preview, save, pin, and reuse AI outputs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {resultTitle}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current AI preview
                </p>
              </div>

              <button
                type="button"
                onClick={onTogglePin}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Star size={14} />
                Pin
              </button>
            </div>

            <div className="max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-6 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
              {result || "No AI result selected yet."}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!result}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>

              <button
                type="button"
                onClick={handleInsert}
                disabled={!result}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <PlusSquare size={16} />
                Insert
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={!result}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                <Replace size={16} />
                Apply
              </button>

              <button
                type="button"
                onClick={handleSaveAsVersion}
                disabled={!result || !editingId || savingVersion}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <Save size={16} />
                {savingVersion ? "Saving..." : "Save as version"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center gap-2">
              <History size={16} className="text-slate-700 dark:text-slate-300" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                AI Result History
              </h4>
            </div>

            {resultHistory.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No AI history yet.
              </p>
            ) : (
              <div className="space-y-3">
                {resultHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onRestoreHistory(item)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {item.result}
                        </p>
                      </div>

                      <RotateCcw
                        size={15}
                        className="mt-1 shrink-0 text-slate-400"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center gap-2">
              <Star size={16} className="text-slate-700 dark:text-slate-300" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Pinned AI Results
              </h4>
            </div>

            {pinnedResults.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No pinned AI results yet.
              </p>
            ) : (
              <div className="space-y-3">
                {pinnedResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onRestoreHistory(item)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-950"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.result}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default AIDrawer;