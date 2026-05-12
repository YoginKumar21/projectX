import { X } from "lucide-react";

function EditorDrawer({
  open,
  onClose,
  title = "Note Editor",
  subtitle = "Write, refine, and organize your note.",
  children,
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 left-0 lg:left-[240px] z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-6">
        <div className="flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 sm:h-[92vh] sm:max-w-7xl sm:rounded-[32px]">
          <div className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  {title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white sm:h-11 sm:w-11"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-950/40 sm:px-6 sm:py-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

export default EditorDrawer;