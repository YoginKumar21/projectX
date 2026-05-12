import { useState } from "react";
import API from "../api/axios";
import { Sparkles, Wand2, FileText, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

function AIPanel({ content, setContent }) {
  const [loading, setLoading] = useState(false);

  const runAI = async (type) => {
    try {
      setLoading(true);

      const res = await API.post("/ai", {
        type,
        content,
      });

      setContent(res.data.result);
      toast.success("AI updated your note ✨");
    } catch (err) {
      toast.error("AI failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 dark:border-slate-700">
      <button onClick={() => runAI("summarize")} className="btn-ai">
        <FileText size={16} /> Summarize
      </button>

      <button onClick={() => runAI("improve")} className="btn-ai">
        <Sparkles size={16} /> Improve
      </button>

      <button onClick={() => runAI("expand")} className="btn-ai">
        <Wand2 size={16} /> Expand
      </button>

      <button onClick={() => runAI("fix")} className="btn-ai">
        <RefreshCw size={16} /> Fix
      </button>

      {loading && <span className="text-sm text-gray-400">AI thinking...</span>}
    </div>
  );
}

export default AIPanel;