import { Sparkles } from "lucide-react";

function AIFloatingButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.25)] dark:bg-white dark:text-slate-900"
      title="Open AI Workspace"
    >
      <Sparkles size={22} />
    </button>
  );
}

export default AIFloatingButton;