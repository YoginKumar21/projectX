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
  const [activeTab, setActiveTab] = useState("audio"); // 'audio' | 'doc' | 'text' | 'youtube'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [docFiles, setDocFiles] = useState([]);
  const [pastedText, setPastedText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
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
    if (activeTab === "audio" && !audioFile) {
      toast.error("Please upload an audio file first");
      return;
    }
    if (activeTab === "doc" && docFiles.length === 0) {
      toast.error("Please upload at least one document");
      return;
    }
    if (activeTab === "text" && !pastedText.trim()) {
      toast.error("Please enter some text to summarize");
      return;
    }
    if (activeTab === "youtube" && !youtubeUrl.trim()) {
      toast.error("Please enter a YouTube link first");
      return;
    }

    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("type", activeTab);

    if (activeTab === "audio" && audioFile) {
      formData.append("audio", audioFile);
    } else if (activeTab === "doc") {
      docFiles.forEach((file) => {
        formData.append("docs", file);
      });
    } else if (activeTab === "text") {
      formData.append("text", pastedText);
    } else if (activeTab === "youtube") {
      formData.append("youtubeUrl", youtubeUrl);
    }

    toast
      .promise(
        axios.post("/summarizer/analyze", formData).then((response) => {
          setSummary(response.data.summary);
          setTranscript(response.data.transcript);
          return response.data;
        }),
        {
          loading: `Analyzing ${activeTab === "audio" ? "audio recording" : activeTab === "doc" ? "reference document" : activeTab === "text" ? "text notes" : "YouTube video"}...`,
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
        content: `# Meeting Summary: ${meetingTitle}\n\n## Summary\n${summary}\n\n## Source Details / Transcript\n${transcript || "No context transcripts available"}`,
        tags: ["meeting", "summary", "ai-generated", activeTab],
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
      [`Meeting Summary\n\n${summary}\n\nSource Content:\n${transcript}`],
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
    setPastedText("");
    setYoutubeUrl("");
    setMeetingTitle("");
  };

  const isFormValid = () => {
    if (activeTab === "audio") return !!audioFile;
    if (activeTab === "doc") return docFiles.length > 0;
    if (activeTab === "text") return !!pastedText.trim();
    if (activeTab === "youtube") return !!youtubeUrl.trim();
    return false;
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="flex-1 p-gutter flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-full max-w-3xl mb-8 text-center sm:text-left">
          <h1 className="font-h2 text-h2 text-on-surface mb-2 tracking-tight">
            AI Universal Summarizer
          </h1>
          <p className="text-sm text-on-surface-variant">
            Transform files, audio, reference documents, raw text, and YouTube videos into structured executive summaries instantly.
          </p>
        </div>

        {!summary ? (
          <section className="w-full max-w-3xl glass-card-premium rounded-2xl p-6 sm:p-8 border border-outline-variant/10 shadow-sm">
            
            {/* Custom Tab Selection Header */}
            <div className="flex border-b border-outline-variant/15 mb-6 overflow-x-auto gap-2">
              {[
                { id: "audio", label: "Audio File", icon: "mic" },
                { id: "doc", label: "Documents", icon: "description" },
                { id: "text", label: "Pasted Text", icon: "edit_document" },
                { id: "youtube", label: "YouTube Link", icon: "play_circle" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              
              {/* Audio Tab Controls */}
              {activeTab === "audio" && (
                <div>
                  <input
                    type="file"
                    id="audio-input"
                    hidden
                    accept="audio/*,.mp3,.wav,.m4a,.webm,.mp4"
                    onChange={handleAudioInputChange}
                  />
                  <h3 className="text-xs font-black uppercase tracking-wider text-on-surface mb-3">
                    1. Upload Meeting Audio File (Whisper v3 Automatic Transcription)
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
                        : "Drag & drop or click to upload audio"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-black tracking-widest uppercase">
                      MP3, WAV, M4A, WEBM, MP4
                    </p>
                  </div>
                </div>
              )}

              {/* Documents Tab Controls */}
              {activeTab === "doc" && (
                <div>
                  <input
                    type="file"
                    id="doc-input"
                    hidden
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    multiple
                    onChange={handleDocInputChange}
                  />
                  <h3 className="text-xs font-black uppercase tracking-wider text-on-surface mb-3">
                    1. Upload Reference Documents (Supports PDF & Text)
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
                        : "Drag & drop or click to upload docs"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-black tracking-widest uppercase">
                      PDF, TXT, DOCX
                    </p>
                    {docFiles.length > 0 && (
                      <div className="mt-4 w-full px-4 space-y-2 max-h-32 overflow-y-auto">
                        {docFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between text-[10px] text-on-surface-variant bg-surface-container rounded px-3 py-1.5"
                          >
                            <span className="truncate font-medium">- {file.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDoc(idx);
                                toast.success("Document removed");
                              }}
                              className="text-error hover:text-error/80 ml-2 font-bold"
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pasted Text Tab Controls */}
              {activeTab === "text" && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-on-surface mb-3">
                    1. Paste Article, Document or Discussion Text Notes
                  </h3>
                  <textarea
                    rows={8}
                    className="w-full p-4 bg-surface-container border border-outline-variant/30 rounded-2xl text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium leading-relaxed"
                    placeholder="Paste or write anything here... AI will formulate a clean, comprehensive executive summary for you."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <div className="flex justify-end pt-1">
                    <p className="text-[10px] font-black text-on-surface-variant tracking-wider uppercase">
                      Characters: {pastedText.length}
                    </p>
                  </div>
                </div>
              )}

              {/* YouTube Tab Controls */}
              {activeTab === "youtube" && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-on-surface mb-3">
                    1. Enter YouTube Video URL
                  </h3>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary transition-colors">
                      play_circle
                    </span>
                    <input
                      type="url"
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-container border border-outline-variant/30 focus:border-primary/20 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all duration-300 font-medium text-sm text-on-surface placeholder-on-surface-variant/40"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed pt-2 px-1">
                    AI will analyze this YouTube video, map its transcript flow, and construct summaries of discussion takeaways directly.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !isFormValid()}
                  className={`w-full py-3.5 rounded-xl font-black uppercase tracking-[0.1em] text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                    isAnalyzing || !isFormValid()
                      ? "bg-surface-container text-outline-variant cursor-not-allowed"
                      : "bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20 hover:-translate-y-0.5 active:scale-95"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    auto_awesome
                  </span>
                  {isAnalyzing ? "Summarizing..." : "Generate Universal Summary"}
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
                    Analysis Summary Results
                  </h2>
                </div>
                <button
                  onClick={resetAnalysis}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-container text-on-surface rounded-xl hover:bg-surface-container/80 transition flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Source Selection
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                <div className="prose prose-sm max-w-none text-on-surface">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed bg-surface-container/50 p-5 rounded-2xl border border-outline-variant/5">
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
                  placeholder="Enter a descriptive title for this summary..."
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-surface-container border border-outline-variant/30 rounded-xl text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={saveAsNote}
                    disabled={isSavingNote || !meetingTitle.trim()}
                    className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-[0.05em] text-sm flex items-center justify-center gap-2 transition-all ${
                      isSavingNote || !meetingTitle.trim()
                        ? "bg-surface-container text-outline-variant cursor-not-allowed"
                        : "bg-primary text-on-primary hover:bg-primary/90 hover:-translate-y-0.5 shadow-lg shadow-primary/10"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      save
                    </span>
                    {isSavingNote ? "Saving..." : "Save as Note"}
                  </button>
                  <button
                    onClick={downloadAsText}
                    className="flex-1 py-3 rounded-xl font-bold uppercase tracking-[0.05em] text-sm flex items-center justify-center gap-2 bg-surface-container text-on-surface hover:bg-surface-container/80 hover:-translate-y-0.5 transition-all"
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
                  View Source Content / Transcript
                </summary>
                <div className="pl-0 sm:pl-6 max-h-64 overflow-y-auto mt-2">
                  <p className="text-sm text-on-surface-variant whitespace-pre-wrap bg-surface-container/50 p-4 rounded-xl">
                    {transcript}
                  </p>
                </div>
              </details>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mt-10">
          <HighlightItem icon="bolt" title="Fast AI Pipeline" desc="Processes inputs dynamically." />
          <HighlightItem icon="summarize" title="Action Insights" desc="Action items mapped." />
          <HighlightItem icon="security" title="Fully Secure" desc="End-to-end sandbox privacy." />
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
