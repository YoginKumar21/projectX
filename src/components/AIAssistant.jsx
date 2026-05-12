import { useMemo, useState } from "react";
import API from "../api/axios";
import {
  Sparkles,
  Send,
  Copy,
  Wand2,
  FileText,
  List,
  ChevronRight,
  X,
  Bot,
  MessageSquare,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

function stripHtml(html = "") {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

function AIAssistant({ content, setContent, setTitle }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I can help with this note. Ask me to summarize it, explain it, improve it, turn it into bullet points, or generate a better title.",
    },
  ]);

  const plainTextLength = useMemo(() => stripHtml(content || "").trim().length, [content]);

  const runQuickAction = async (type) => {
    try {
      if (!content || !stripHtml(content).trim()) {
        toast.error("Write something in the note first");
        return;
      }

      setActionLoading(true);

      const res = await API.post("/ai/action", {
        type,
        content,
      });

      const result = res.data.result || "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result,
        },
      ]);

      if (type === "title" && typeof setTitle === "function") {
        setTitle(result.trim());
        toast.success("AI title generated");
      } else {
        toast.success("AI response ready");
      }

      setOpen(true);
    } catch (error) {
      toast.error("AI action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();

    if (!trimmed) return;

    if (!content || !stripHtml(content).trim()) {
      toast.error("Write something in the note first");
      return;
    }

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setOpen(true);

    try {
      const historyForApi = nextMessages
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const res = await API.post("/ai/chat", {
        message: trimmed,
        content,
        history: historyForApi,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.reply || "No response received.",
        },
      ]);
    } catch (error) {
      toast.error("AI chat failed");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong while talking to AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const insertIntoNote = (text) => {
    const current = content || "";
    const divider = current.trim() ? "<hr /><p><br /></p>" : "";
    const htmlBlock = `<div><p>${text
      .split("\n")
      .map((line) => line || "<br />")
      .join("</p><p>")}</p></div>`;

    setContent(current + divider + htmlBlock);
    toast.success("Inserted into note");
  };

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                AI Assistant
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Smart help for your current note
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runQuickAction("summarize")}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileText size={16} />
            Summarize
          </button>

          <button
            onClick={() => runQuickAction("bullets")}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <List size={16} />
            Bullets
          </button>

          <button
            onClick={() => runQuickAction("improve")}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Wand2 size={16} />
            Improve
          </button>

          <button
            onClick={() => runQuickAction("title")}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronRight size={16} />
            Title
          </button>

          <button
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
          >
            <MessageSquare size={16} />
            {open ? "Hide AI Chat" : "Open AI Chat"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        <span>Current note text length: {plainTextLength} chars</span>
        {actionLoading && <span>AI is working...</span>}
      </div>

      {open && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-slate-700 dark:text-slate-200" />
              <span className="font-medium text-slate-900 dark:text-white">
                Note AI Chat
              </span>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto bg-white p-4 dark:bg-slate-950">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-6">
                    {msg.content}
                  </div>

                  {msg.role === "assistant" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => copyMessage(msg.content)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Copy size={14} />
                        Copy
                      </button>

                      <button
                        onClick={() => insertIntoNote(msg.content)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Download size={14} />
                        Insert into note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  AI is thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask AI about this note..."
                className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600"
              />

              <button
                onClick={sendMessage}
                disabled={loading}
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-slate-900 px-5 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                <Send size={18} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Summarize this note",
                "Explain this simply",
                "Turn this into bullet points",
                "What are the key action items?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;