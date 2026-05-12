import { useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import toast from "react-hot-toast";
import axios from "../api/axios";

const allowedAudioMimeTypes = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
]);

const allowedAudioExtensions = [".mp3", ".wav", ".m4a", ".webm", ".mp4"];
const allowedDocMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const allowedDocExtensions = [".pdf", ".docx", ".txt"];

const hasAllowedExtension = (fileName = "", allowedExtensions = []) =>
  allowedExtensions.some((extension) =>
    fileName.toLowerCase().endsWith(extension)
  );

const isSupportedAudioFile = (file) =>
  Boolean(
    file &&
      (allowedAudioMimeTypes.has(file.type) ||
        hasAllowedExtension(file.name, allowedAudioExtensions))
  );

const isSupportedDocumentFile = (file) =>
  Boolean(
    file &&
      (allowedDocMimeTypes.has(file.type) ||
        hasAllowedExtension(file.name, allowedDocExtensions))
  );

function Summarizer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [docFiles, setDocFiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [meetingTitle, setMeetingTitle] = useState("");

  const handleAudioDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    if (isSupportedAudioFile(file)) {
      setAudioFile(file);
      toast.success("Audio file uploaded");
      return;
    }

    toast.error("Please upload an audio file (MP3, WAV, M4A, WEBM)");
  };

  const handleDocDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter((file) => isSupportedDocumentFile(file));

    if (validFiles.length > 0) {
      setDocFiles((currentFiles) => [...currentFiles, ...validFiles]);
      toast.success(`${validFiles.length} document(s) uploaded`);
      return;
    }

    toast.error("Please upload PDF, DOCX, or TXT files");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleAudioClick = () => {
    document.getElementById("audio-input")?.click();
  };

  const handleAudioInputChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (isSupportedAudioFile(file)) {
      setAudioFile(file);
      toast.success("Audio file uploaded");
      return;
    }

    toast.error("Please upload an audio file (MP3, WAV, M4A, WEBM)");
  };

  const handleDocClick = () => {
    document.getElementById("doc-input")?.click();
  };

  const handleDocInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => isSupportedDocumentFile(file));

    if (validFiles.length > 0) {
      setDocFiles((currentFiles) => [...currentFiles, ...validFiles]);
      toast.success(`${validFiles.length} document(s) uploaded`);
      return;
    }

    if (files.length > 0) {
      toast.error("Please upload PDF, DOCX, or TXT files");
    }
  };

  const removeDoc = (index) => {
    setDocFiles((currentFiles) => currentFiles.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!audioFile) {
      toast.error("Please upload an audio file first");
      return;
    }

    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("audio", audioFile);

    docFiles.forEach((file) => {
      formData.append("docs", file);
    });

    toast
      .promise(
        axios.post("/summarizer/analyze", formData).then((response) => {
          setSummary(response.data.summary);
          setTranscript(response.data.transcript);
          return response.data;
        }),
        {
          loading: "Analyzing meeting data...",
          success: "Summary generated successfully!",
          error: (err) => err.response?.data?.error || "Analysis failed",
        }
      )
      .finally(() => setIsAnalyzing(false));
  };

  const saveAsNote = async () => {
    if (!summary) return;

    if (!meetingTitle.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    setIsSavingNote(true);

    try {
      await axios.post("/notes", {
        title: meetingTitle,
        content: `# Meeting Summary: ${meetingTitle}\n\n## Summary\n${summary}\n\n## Full Transcript\n${transcript || "No transcript available"}`,
        tags: ["meeting", "summary", "ai-generated"],
      });
      toast.success("Summary saved as note!");
      setMeetingTitle("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const downloadAsText = () => {
    if (!summary) return;

    const element = document.createElement("a");
    const file = new Blob(
      [`Meeting Summary\n\n${summary}\n\nTranscript:\n${transcript}`],
      { type: "text/plain" }
    );

    element.href = URL.createObjectURL(file);
    element.download = `meeting_summary_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Downloaded as text file!");
  };

  const resetAnalysis = () => {
    setSummary(null);
    setTranscript(null);
    setAudioFile(null);
    setDocFiles([]);
    setMeetingTitle("");
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="flex-1 p-gutter flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-full max-w-3xl mb-8 text-center sm:text-left">
          <h1 className="font-h2 text-h2 text-on-surface mb-2 tracking-tight">
            AI Meeting Summarizer
          </h1>
          <p className="text-sm text-on-surface-variant">
            Upload meeting audio and reference docs to generate structured
            insights.
          </p>
        </div>

        {!summary ? (
          <section className="w-full max-w-3xl glass-card-premium rounded-2xl p-6 sm:p-8 border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <span className="material-symbols-outlined text-[20px]">
                cloud_upload
              </span>
              <h2 className="uppercase tracking-[0.2em] text-[10px] font-black">
                Upload Sources
              </h2>
            </div>

            <div className="space-y-6">
              <input
                type="file"
                id="audio-input"
                hidden
                accept="audio/*,.mp3,.wav,.m4a,.webm,.mp4"
                onChange={handleAudioInputChange}
              />

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-on-surface mb-3">
                  1. Meeting Audio (Required)
                </h3>
                <div
                  onDrop={handleAudioDrop}
                  onDragOver={handleDragOver}
                  onClick={handleAudioClick}
                  className="border-2 border-dashed border-outline-variant/30 rounded-2xl py-8 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all group"
                >
                  <div className="bg-surface-container-low p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-outline-variant group-hover:text-primary">
                      mic
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface mb-1">
                    {audioFile
                      ? `Uploaded: ${audioFile.name}`
                      : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-[10px] text-on-surface-variant font-black tracking-widest uppercase">
                    MP3, WAV, M4A, WEBM
                  </p>
                </div>
              </div>

              <input
                type="file"
                id="doc-input"
                hidden
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                multiple
                onChange={handleDocInputChange}
              />

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-on-surface mb-3">
                  2. Reference Documents (Optional)
                </h3>
                <div
                  onDrop={handleDocDrop}
                  onDragOver={handleDragOver}
                  onClick={handleDocClick}
                  className="border-2 border-dashed border-outline-variant/30 rounded-2xl py-8 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all group"
                >
                  <div className="bg-surface-container-low p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-outline-variant group-hover:text-primary">
                      description
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface mb-1">
                    {docFiles.length > 0
                      ? `Uploaded: ${docFiles.length} document(s)`
                      : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-[10px] text-on-surface-variant font-black tracking-widest uppercase">
                    PDF, DOCX, TXT
                  </p>
                  {docFiles.length > 0 && (
                    <div className="mt-4 w-full px-2 space-y-2">
                      {docFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between text-[10px] text-on-surface-variant bg-surface-container rounded px-2 py-1"
                        >
                          <span className="truncate">- {file.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDoc(idx);
                              toast.success("Document removed");
                            }}
                            className="text-error hover:text-error/80 ml-2"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !audioFile}
                  className={`w-full py-3.5 rounded-xl font-black uppercase tracking-[0.1em] text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                    isAnalyzing || !audioFile
                      ? "bg-surface-container text-outline-variant cursor-not-allowed"
                      : "bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20 hover:-translate-y-0.5 active:scale-95"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    auto_awesome
                  </span>
                  {isAnalyzing ? "Analyzing..." : "Generate Summary"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="w-full max-w-4xl space-y-6">
            <div className="glass-card-premium rounded-2xl p-6 sm:p-8 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[20px]">
                    summarize
                  </span>
                  <h2 className="uppercase tracking-[0.2em] text-[10px] font-black">
                    Summary Results
                  </h2>
                </div>
                <button
                  onClick={resetAnalysis}
                  className="px-4 py-2 text-sm bg-surface-container text-on-surface rounded-lg hover:bg-surface-container/80 transition"
                >
                  Back to Upload
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-on-surface">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed bg-surface-container/50 p-4 rounded-lg">
                    {summary}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-outline-variant/10 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">
                  Save This Summary
                </h4>
                <input
                  type="text"
                  placeholder="Enter meeting title (e.g., 'Q2 Planning - May 11')"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-4 py-2 text-sm bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary"
                />
                <div className="flex gap-3">
                  <button
                    onClick={saveAsNote}
                    disabled={isSavingNote || !meetingTitle.trim()}
                    className={`flex-1 py-2.5 rounded-lg font-bold uppercase tracking-[0.05em] text-sm flex items-center justify-center gap-2 transition-all ${
                      isSavingNote || !meetingTitle.trim()
                        ? "bg-surface-container text-outline-variant cursor-not-allowed"
                        : "bg-primary text-on-primary hover:bg-primary/90"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      save
                    </span>
                    {isSavingNote ? "Saving..." : "Save as Note"}
                  </button>
                  <button
                    onClick={downloadAsText}
                    className="flex-1 py-2.5 rounded-lg font-bold uppercase tracking-[0.05em] text-sm flex items-center justify-center gap-2 bg-surface-container text-on-surface hover:bg-surface-container/80 transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      download
                    </span>
                    Download
                  </button>
                </div>
              </div>
            </div>

            {transcript && (
              <details className="glass-card-premium rounded-2xl p-6 sm:p-8 border border-outline-variant/10 shadow-sm">
                <summary className="flex items-center gap-2 cursor-pointer text-on-surface font-bold mb-4 hover:text-primary transition">
                  <span className="material-symbols-outlined">description</span>
                  View Full Transcript
                </summary>
                <div className="pl-6 max-h-64 overflow-y-auto">
                  <p className="text-sm text-on-surface-variant whitespace-pre-wrap bg-surface-container/50 p-4 rounded-lg">
                    {transcript}
                  </p>
                </div>
              </details>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mt-10">
          <HighlightItem icon="bolt" title="Fast AI" desc="Transcription in seconds." />
          <HighlightItem icon="summarize" title="Insights" desc="Action items identified." />
          <HighlightItem icon="security" title="Secure" desc="Encrypted & Private." />
        </div>
      </div>
    </AppShell>
  );
}

function HighlightItem({ icon, title, desc }) {
  return (
    <div className="text-center space-y-1.5 p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/5">
      <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-2">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <h4 className="font-bold text-on-surface text-sm">{title}</h4>
      <p className="text-[11px] text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  );
}

export default Summarizer;
