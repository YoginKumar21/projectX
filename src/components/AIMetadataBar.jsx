import { Sparkles, Tag, Type } from "lucide-react";

function AIMetadataBar({ title, tags = [] }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
            <Type size={16} className="text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Current Title
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI can suggest a better title when needed
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {title?.trim() || "No title yet"}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
            <Tag size={16} className="text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Current Tags
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI can suggest relevant tags from note content
            </p>
          </div>
        </div>

        <div className="flex min-h-[52px] flex-wrap gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
          {tags?.length ? (
            tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              No tags yet
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIMetadataBar;