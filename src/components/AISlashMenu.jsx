import {
  FileText,
  Wand2,
  List,
  Briefcase,
  Coffee,
  Minimize2,
  Maximize2,
  CheckSquare,
  Users,
} from "lucide-react";

const aiCommands = [
  {
    key: "summarize",
    label: "Summarize note",
    description: "Create a short summary",
    icon: FileText,
  },
  {
    key: "improve",
    label: "Improve writing",
    description: "Make writing clearer and better",
    icon: Wand2,
  },
  {
    key: "bullets",
    label: "Convert to bullets",
    description: "Turn content into bullet points",
    icon: List,
  },
  {
    key: "professional",
    label: "Rewrite professional",
    description: "Make tone formal and polished",
    icon: Briefcase,
  },
  {
    key: "casual",
    label: "Rewrite casual",
    description: "Make tone friendly and relaxed",
    icon: Coffee,
  },
  {
    key: "shorter",
    label: "Make shorter",
    description: "Reduce length and keep key meaning",
    icon: Minimize2,
  },
  {
    key: "longer",
    label: "Make longer",
    description: "Expand with more detail",
    icon: Maximize2,
  },
  {
    key: "action-items",
    label: "Extract action items",
    description: "Find tasks and next steps",
    icon: CheckSquare,
  },
  {
    key: "meeting-summary",
    label: "Meeting summary",
    description: "Generate summary, decisions, actions",
    icon: Users,
  },
];

function AISlashMenu({
  visible,
  position,
  search = "",
  selectedIndex = 0,
  onSelect,
}) {
  if (!visible) return null;

  const filteredCommands = aiCommands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.key.toLowerCase().includes(search.toLowerCase())
  );

  if (filteredCommands.length === 0) {
    return (
      <div
        className="absolute z-50 w-[320px] rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No AI commands found
        </p>
      </div>
    );
  }

  return (
    <div
      className="absolute z-50 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          AI Commands
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Choose an AI action for this note
        </p>
      </div>

      <div className="max-h-[320px] overflow-y-auto p-2">
        {filteredCommands.map((cmd, index) => {
          const Icon = cmd.icon;
          const isActive = index === selectedIndex;

          return (
            <button
              key={cmd.key}
              onClick={() => onSelect(cmd)}
              className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                isActive
                  ? "bg-slate-100 dark:bg-slate-800"
                  : "hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
                <Icon size={16} className="text-slate-700 dark:text-slate-300" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {cmd.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cmd.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AISlashMenu;
export { aiCommands };