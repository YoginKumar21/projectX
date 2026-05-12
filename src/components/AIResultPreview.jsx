import { Copy, Check, PlusSquare, Replace, Sparkles } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

function textToHtml(text = "") {
  return `<div>${text
    .split("\n")
    .map((line) => `<p>${line || "<br />"}</p>`)
    .join("")}</div>`;
}

function AIResultPreview({ result, onApply, onInsert, onClose, title = "AI Result" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleApply = () => {
    onApply(textToHtml(result));
    toast.success("AI result applied");
  };

  const handleInsert = () => {
    onInsert(textToHtml(result));
    toast.success("AI result inserted");
  };

  if (!result) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preview before changing your note
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-xl px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
        >
          Close
        </button>
      </div>

      <div className="max-h-[360px] overflow-y-auto p-4">
        <div className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
          {result}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>

        <button
          onClick={handleInsert}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <PlusSquare size={16} />
          Insert into note
        </button>

        <button
          onClick={handleApply}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-white dark:text-slate-900"
        >
          <Replace size={16} />
          Replace note content
        </button>
      </div>
    </div>
  );
}

export default AIResultPreview;