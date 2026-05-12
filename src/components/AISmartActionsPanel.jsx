import {
  FileText,
  CheckSquare,
  Users,
  BookOpen,
  Briefcase,
  Lightbulb,
} from "lucide-react";
import { useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";

const smartActions = [
  {
    key: "summarize",
    title: "Quick Summary",
    subtitle: "Turn note into a clean summary",
    icon: FileText,
    previewTitle: "Quick Summary Preview",
  },
  {
    key: "action-plan",
    title: "Action Plan",
    subtitle: "Convert note into a structured plan",
    icon: CheckSquare,
    previewTitle: "Action Plan Preview",
  },
  {
    key: "minutes",
    title: "Meeting Minutes",
    subtitle: "Formalize discussion into minutes",
    icon: Users,
    previewTitle: "Meeting Minutes Preview",
  },
  {
    key: "study-sheet",
    title: "Study Sheet",
    subtitle: "Make a revision-ready version",
    icon: BookOpen,
    previewTitle: "Study Sheet Preview",
  },
  {
    key: "professional",
    title: "Professional Rewrite",
    subtitle: "Polish writing for formal use",
    icon: Briefcase,
    previewTitle: "Professional Rewrite Preview",
  },
  {
    key: "brainstorm-refine",
    title: "Refine Brainstorm",
    subtitle: "Group ideas and suggest directions",
    icon: Lightbulb,
    previewTitle: "Brainstorm Refinement Preview",
  },
];

function AISmartActionsPanel({ content, onPreviewResult }) {
  const [loadingKey, setLoadingKey] = useState("");

  const handleAction = async (action) => {
    if (!content || !content.trim()) {
      toast.error("Write something in the note first");
      return;
    }

    try {
      setLoadingKey(action.key);

      const res = await API.post("/ai/action", {
        type: action.key,
        content,
      });

      const result = (res.data?.result || "").trim();

      if (!result) {
        toast.error("No AI result received");
        return;
      }

      onPreviewResult(result, action.previewTitle);
      toast.success(`${action.title} ready`);
    } catch (error) {
      toast.error("AI action failed");
    } finally {
      setLoadingKey("");
    }
  };

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Smart AI Actions
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          One-click workflows for real note use cases
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {smartActions.map((action) => {
          const Icon = action.icon;
          const loading = loadingKey === action.key;

          return (
            <button
              key={action.key}
              type="button"
              onClick={() => handleAction(action)}
              disabled={!!loadingKey}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Icon size={18} />
              </div>

              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {loading ? "Working..." : action.title}
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {action.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AISmartActionsPanel;