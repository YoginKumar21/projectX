import { useMemo, useState } from "react";
import API from "../api/axios";
import {
  GitCompare,
  Eye,
  PencilLine,
  History,
  BarChart3,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

function formatVersionLabel(version, index) {
  const date = new Date(
    version?.editedAt || version?.savedAt || version?.createdAt || Date.now()
  ).toLocaleString();

  return `Version ${index + 1} • ${date}`;
}

const actions = [
  {
    key: "unread-changes",
    title: "Unread Changes",
    subtitle: "Quick summary of collaborator edits",
    icon: Eye,
  },
  {
    key: "changes-summary",
    title: "Changes Summary",
    subtitle: "What changed between two versions",
    icon: GitCompare,
  },
  {
    key: "edit-explainer",
    title: "Explain Edits",
    subtitle: "Plain-English explanation of updates",
    icon: PencilLine,
  },
  {
    key: "changelog",
    title: "Generate Changelog",
    subtitle: "Build a changelog from version history",
    icon: History,
  },
  {
    key: "progress-update",
    title: "Progress Update",
    subtitle: "Create a team-style project update",
    icon: BarChart3,
  },
];

function AICollaborationPanel({
  content,
  versions = [],
  onPreviewResult,
}) {
  const [loadingKey, setLoadingKey] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");

  const versionOptions = useMemo(() => {
    return (versions || []).map((version, index) => ({
      ...version,
      label: formatVersionLabel(version, index),
    }));
  }, [versions]);

  const selectedVersion =
    versionOptions.find((item) => item._id === selectedVersionId) || versionOptions[0];

  const runAction = async (actionKey, actionTitle) => {
    if (!content || !content.trim()) {
      toast.error("Write something in the note first");
      return;
    }

    try {
      setLoadingKey(actionKey);

      if (["changes-summary", "unread-changes", "edit-explainer"].includes(actionKey)) {
        if (!selectedVersion?.content) {
          toast.error("Choose a previous version first");
          return;
        }

        const res = await API.post("/ai/action", {
          type: actionKey,
          content,
          compareContent: selectedVersion.content,
        });

        const result = (res.data?.result || "").trim();

        if (!result) {
          toast.error("No AI result received");
          return;
        }

        onPreviewResult(result, `${actionTitle} Preview`);
        toast.success(`${actionTitle} ready`);
        return;
      }

      if (["changelog", "progress-update"].includes(actionKey)) {
        if (!versions?.length) {
          toast.error("Version history not available");
          return;
        }

        const res = await API.post("/ai/action", {
          type: actionKey,
          content,
          versionHistory: versions,
        });

        const result = (res.data?.result || "").trim();

        if (!result) {
          toast.error("No AI result received");
          return;
        }

        onPreviewResult(result, `${actionTitle} Preview`);
        toast.success(`${actionTitle} ready`);
      }
    } catch (error) {
      toast.error("AI collaboration action failed");
    } finally {
      setLoadingKey("");
    }
  };

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            AI Collaboration Layer
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare versions, explain edits, and generate collaboration updates
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
          <Users size={16} className="text-slate-700 dark:text-slate-300" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {versions?.length || 0} saved version{versions?.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Compare with previous version
          </label>
          <select
            value={selectedVersionId || selectedVersion?._id || ""}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600"
          >
            {versionOptions.length === 0 ? (
              <option value="">No versions available</option>
            ) : (
              versionOptions.map((version) => (
                <option key={version._id} value={version._id}>
                  {version.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const loading = loadingKey === action.key;

          return (
            <button
              key={action.key}
              type="button"
              onClick={() => runAction(action.key, action.title)}
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

export default AICollaborationPanel;