import { useMemo } from "react";
import {
  FileText,
  Type,
  Heading,
  ListChecks,
  Paperclip,
  Clock3,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Image as ImageIcon,
  Code2,
} from "lucide-react";
import { analyzeNote } from "../utils/noteInsights";

function StatCard({ icon: Icon, label, value, subtle = false }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Icon size={18} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${
          subtle
            ? "text-slate-700 dark:text-slate-200"
            : "text-slate-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SuggestionChip({ item, onTrigger }) {
  const toneClasses =
    item.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
      : item.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

  return (
    <button
      type="button"
      onClick={() => onTrigger?.(item)}
      className={`rounded-full border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${toneClasses}`}
    >
      {item.label}
    </button>
  );
}

function NoteInsightsPanel({
  title,
  content,
  tags = [],
  attachments = [],
  onSuggestionAction,
}) {
  const insights = useMemo(
    () =>
      analyzeNote({
        title,
        content,
        tags,
        attachments,
      }),
    [title, content, tags, attachments]
  );

  const healthLabel =
    insights.suggestions.length === 0
      ? "Strong"
      : insights.suggestions.length <= 2
      ? "Good"
      : insights.suggestions.length <= 4
      ? "Needs polish"
      : "Needs work";

  const healthTone =
    insights.suggestions.length === 0
      ? "text-emerald-600 dark:text-emerald-400"
      : insights.suggestions.length <= 2
      ? "text-blue-600 dark:text-blue-400"
      : insights.suggestions.length <= 4
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Note Insights
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Content analytics, structure quality, and smart suggestions
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
          <Brain size={18} className="text-slate-700 dark:text-slate-300" />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Note health
            </p>
            <p className={`text-sm font-semibold ${healthTone}`}>{healthLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Words" value={insights.wordCount} />
        <StatCard icon={Type} label="Characters" value={insights.charCount} />
        <StatCard icon={Heading} label="Headings" value={insights.headingCount} />
        <StatCard
          icon={ListChecks}
          label="Bullets / Checklists"
          value={`${insights.bulletCount} / ${insights.checklistCount}`}
        />
        <StatCard icon={Paperclip} label="Attachments" value={insights.attachmentCount} />
        <StatCard icon={Clock3} label="Reading Time" value={`${insights.readingTime} min`} />
        <StatCard icon={ImageIcon} label="Images" value={insights.imageCount} />
        <StatCard icon={Code2} label="Code Blocks" value={insights.codeBlockCount} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-slate-700 dark:text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Writing profile
            </h4>
          </div>

          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span>Readability</span>
              <span className="font-medium">{insights.readability}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Sentences</span>
              <span className="font-medium">{insights.sentenceCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Avg words / sentence</span>
              <span className="font-medium">{insights.avgWordsPerSentence}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            {insights.suggestions.length === 0 ? (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
            )}
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Smart suggestions
            </h4>
          </div>

          {insights.suggestions.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your note structure looks strong. You can still use AI to polish or repurpose it.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {insights.suggestions.map((item) => (
                <SuggestionChip
                  key={item.key}
                  item={item}
                  onTrigger={onSuggestionAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoteInsightsPanel;