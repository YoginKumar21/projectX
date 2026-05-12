import { useMemo, useState } from "react";
import API from "../api/axios";
import {
  Sparkles,
  FileText,
  Wand2,
  List,
  Tag,
  Heading,
  Briefcase,
  Coffee,
  Minimize2,
  Maximize2,
  CheckSquare,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

function stripHtml(html = "") {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

function AISmartBar({
  title,
  content,
  tags = [],
  setTitle,
  setTags,
  onPreviewResult,
}) {
  const [loadingType, setLoadingType] = useState("");

  const plainText = useMemo(() => stripHtml(content || "").trim(), [content]);

  const hasContent = plainText.length > 0;
  const isLongNote = plainText.length > 500;
  const missingTitle = !title?.trim();
  const missingTags = !tags || tags.length === 0;

  const callAIAction = async (type, previewTitle) => {
    if (!hasContent) {
      toast.error("Write something in the note first");
      return;
    }

    try {
      setLoadingType(type);

      const res = await API.post("/ai/action", {
        type,
        content,
      });

      const result = (res.data?.result || "").trim();

      if (!result) {
        toast.error("No AI result received");
        return;
      }

      if (type === "title") {
        setTitle(result);
        toast.success("AI title generated");
        return;
      }

      if (type === "tags") {
        const generatedTags = result
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 5);

        setTags(generatedTags);
        toast.success("AI tags generated");
        return;
      }

      onPreviewResult(result, previewTitle);
    } catch (error) {
      toast.error("AI action failed");
    } finally {
      setLoadingType("");
    }
  };

  const chips = [
    {
      key: "summarize",
      label: "Summarize",
      icon: FileText,
      show: hasContent && isLongNote,
      previewTitle: "Summary Preview",
    },
    {
      key: "improve",
      label: "Improve",
      icon: Wand2,
      show: hasContent,
      previewTitle: "Improved Writing Preview",
    },
    {
      key: "bullets",
      label: "Bullets",
      icon: List,
      show: hasContent,
      previewTitle: "Bullet Points Preview",
    },
    {
      key: "title",
      label: "Generate Title",
      icon: Heading,
      show: hasContent && missingTitle,
    },
    {
      key: "tags",
      label: "Generate Tags",
      icon: Tag,
      show: hasContent && missingTags,
    },
    {
      key: "professional",
      label: "Professional",
      icon: Briefcase,
      show: hasContent,
      previewTitle: "Professional Rewrite Preview",
    },
    {
      key: "casual",
      label: "Casual",
      icon: Coffee,
      show: hasContent,
      previewTitle: "Casual Rewrite Preview",
    },
    {
      key: "shorter",
      label: "Shorter",
      icon: Minimize2,
      show: hasContent,
      previewTitle: "Shorter Version Preview",
    },
    {
      key: "longer",
      label: "Longer",
      icon: Maximize2,
      show: hasContent,
      previewTitle: "Longer Version Preview",
    },
    {
      key: "action-items",
      label: "Action Items",
      icon: CheckSquare,
      show: hasContent,
      previewTitle: "Action Items Preview",
    },
    {
      key: "meeting-summary",
      label: "Meeting Summary",
      icon: Users,
      show: hasContent,
      previewTitle: "Meeting Summary Preview",
    },
  ].filter((item) => item.show);

  if (!hasContent && !missingTitle) return null;
  if (chips.length === 0) return null;

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          <Sparkles size={16} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Smart AI Suggestions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate, rewrite, summarize, and clean your note
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const Icon = chip.icon;
          const active = loadingType === chip.key;

          return (
            <button
              key={chip.key}
              onClick={() => callAIAction(chip.key, chip.previewTitle)}
              disabled={!!loadingType}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Icon size={16} />
              {active ? "Working..." : chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AISmartBar;