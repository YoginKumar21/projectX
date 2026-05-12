import {
  CalendarDays,
  Briefcase,
  Lightbulb,
  BookOpen,
  ClipboardList,
} from "lucide-react";

const templates = [
  {
    key: "meeting",
    title: "Meeting Notes",
    description: "Quick structure for discussions, decisions, and action items",
    icon: CalendarDays,
    noteTitle: "Meeting Notes",
    html: `
      <h1>Meeting Notes</h1>
      <p><strong>Date:</strong> </p>
      <p><strong>Participants:</strong> </p>
      <h2>Agenda</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Discussion</h2>
      <p></p>
      <h2>Key Decisions</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Action Items</h2>
      <ul>
        <li></li>
      </ul>
    `,
  },
  {
    key: "standup",
    title: "Daily Standup",
    description: "Yesterday, today, blockers format",
    icon: ClipboardList,
    noteTitle: "Daily Standup",
    html: `
      <h1>Daily Standup</h1>
      <h2>Yesterday</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Today</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Blockers</h2>
      <ul>
        <li></li>
      </ul>
    `,
  },
  {
    key: "project-plan",
    title: "Project Plan",
    description: "Goals, scope, milestones, and risks",
    icon: Briefcase,
    noteTitle: "Project Plan",
    html: `
      <h1>Project Plan</h1>
      <h2>Goal</h2>
      <p></p>
      <h2>Scope</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Milestones</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Risks</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Next Steps</h2>
      <ul>
        <li></li>
      </ul>
    `,
  },
  {
    key: "brainstorm",
    title: "Brainstorm",
    description: "Capture ideas, themes, and promising directions",
    icon: Lightbulb,
    noteTitle: "Brainstorm Notes",
    html: `
      <h1>Brainstorm</h1>
      <h2>Problem / Topic</h2>
      <p></p>
      <h2>Ideas</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Interesting Directions</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Best Next Step</h2>
      <p></p>
    `,
  },
  {
    key: "study",
    title: "Study Notes",
    description: "Structured notes for revision and learning",
    icon: BookOpen,
    noteTitle: "Study Notes",
    html: `
      <h1>Study Notes</h1>
      <h2>Topic</h2>
      <p></p>
      <h2>Main Concepts</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Examples</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Key Takeaways</h2>
      <ul>
        <li></li>
      </ul>
      <h2>Questions to Revise</h2>
      <ul>
        <li></li>
      </ul>
    `,
  },
];

function AITemplateCards({ onUseTemplate }) {
  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Smart Templates
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Start faster with structured note templates
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const Icon = template.icon;

          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onUseTemplate(template)}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Icon size={18} />
              </div>

              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {template.title}
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {template.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AITemplateCards;
export { templates };