import { useState, useEffect } from "react";
import AppShell from "../components/layout/AppShell.jsx";

const FILES = [
  { name: "main.py", lang: "python", color: "#3776ab", content: 'print("Hello SyncPad!")\n\ndef sync_data():\n    print("Syncing...")\n\nsync_data()' },
  { name: "utils.js", lang: "javascript", color: "#f7df1e", content: 'export const formatData = (data) => {\n  return JSON.stringify(data, null, 2);\n};' },
  { name: "styles.css", lang: "css", color: "#264de4", content: '.editor {\n  background: #0d0f14;\n  color: #cdd6f4;\n}' },
];

function Editor() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFile, setActiveFile] = useState(FILES[0]);
  const [terminalOutput, setTerminalOutput] = useState([
    { type: "info", text: "[System] Environment ready." },
    { type: "success", text: "[System] Connected to collaboration server." }
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    setTerminalOutput(prev => [...prev, { type: "info", text: `> Running ${activeFile.name}...` }]);
    
    setTimeout(() => {
      setTerminalOutput(prev => [
        ...prev, 
        { type: "stdout", text: "Hello SyncPad!" },
        { type: "stdout", text: "Syncing..." },
        { type: "success", text: "Process finished with exit code 0" }
      ]);
      setIsRunning(false);
    }, 1000);
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="flex h-[calc(100vh-64px-32px)] bg-[#0d0f14] overflow-hidden rounded-2xl border border-outline-variant/10 shadow-2xl relative">
        
        {/* Activity Bar */}
        <div className="w-10 bg-[#090b10] hidden sm:flex flex-col items-center py-3 gap-3 border-r border-[#1e2030] shrink-0">
          <ActivityIcon icon="ti ti-files" active />
          <ActivityIcon icon="ti ti-message-circle" badge />
          <ActivityIcon icon="ti ti-sparkles" />
          <ActivityIcon icon="ti ti-player-play" />
          <div className="mt-auto flex flex-col items-center gap-3">
             <ActivityIcon icon="ti ti-users" />
             <ActivityIcon icon="ti ti-settings" />
          </div>
        </div>

        {/* Sidebar (File Tree) */}
        <div className="w-48 bg-[#0d0f14] border-r border-[#1e2030] hidden md:flex flex-col shrink-0">
          <div className="px-3 py-2 flex items-center justify-between border-b border-[#1e2030]">
            <span className="text-[9px] uppercase tracking-widest text-[#6c7086] font-black">Explorer</span>
            <div className="flex gap-2 text-[#6c7086]">
              <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-white">note_add</span>
              <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-white">create_new_folder</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {FILES.map(file => (
              <div 
                key={file.name}
                onClick={() => setActiveFile(file)}
                className={`flex items-center gap-2 px-3 py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                  activeFile.name === file.name ? "bg-[#1e2030] text-[#cdd6f4]" : "text-[#a6adc8] hover:bg-[#1e2030]/50 hover:text-white"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: file.color }}></div>
                {file.name}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-[#1e2030]">
             <span className="text-[9px] uppercase tracking-widest text-[#6c7086] font-black block mb-2">Collaborators</span>
             <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center text-[9px] text-white font-black">A</div>
                <div className="w-5 h-5 rounded-lg bg-secondary flex items-center justify-center text-[9px] text-white font-black">B</div>
             </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="h-8 bg-[#090b10] border-b border-[#1e2030] flex items-center px-1 gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2030] text-[#cdd6f4] rounded-t-lg text-[10px] font-bold border-b border-[#89b4fa]">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeFile.color }}></div>
              {activeFile.name}
              <span className="material-symbols-outlined text-[10px] opacity-50 hover:opacity-100 cursor-pointer">close</span>
            </div>
          </div>

          {/* Code Area */}
          <div className="flex-1 overflow-auto bg-[#0d0f14] font-mono text-[12px] leading-relaxed relative">
            <div className="absolute top-0 left-0 w-8 h-full bg-[#090b10] border-r border-[#1e2030] flex flex-col items-end px-2 py-3 text-[#313244] select-none text-[10px]">
              {[...Array(20)].map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <div className="ml-8 p-3 whitespace-pre text-[#cdd6f4]">
              {activeFile.content}
            </div>
          </div>

          {/* Terminal */}
          <div className="h-32 bg-[#090b10] border-t border-[#1e2030] flex flex-col shrink-0">
            <div className="h-7 border-b border-[#1e2030] px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#6c7086] text-[14px]">terminal</span>
                <span className="text-[9px] uppercase tracking-widest text-[#6c7086] font-black">Terminal</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center gap-1 px-2 py-0.5 bg-[#1e2030] border border-[#313244] rounded text-[10px] text-[#a6e3a1] font-bold hover:border-[#a6e3a1] transition-all"
                >
                  <span className="material-symbols-outlined text-[12px]">play_arrow</span>
                  Run
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
              {terminalOutput.map((out, i) => (
                <div key={i} className={
                  out.type === "info" ? "text-[#89b4fa]" : 
                  out.type === "success" ? "text-[#a6e3a1]" : 
                  "text-[#cdd6f4]"
                }>
                  {out.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-[#090b10] border-t border-[#1e2030] px-3 flex items-center justify-between text-[9px] text-[#45475a] font-black uppercase tracking-tighter z-20">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1"><span className="ti ti-git-branch"></span> main</div>
             <div className="flex items-center gap-1 text-[#a6e3a1] font-black"><span className="ti ti-check"></span> Healthy</div>
          </div>
          <div className="flex items-center gap-3">
             <div>Ln 4, Col 12</div>
             <div>UTF-8</div>
             <div className="capitalize">{activeFile.lang}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ActivityIcon({ icon, active = false, badge = false }) {
  return (
    <div className={`w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all relative ${
      active ? "bg-[#1e2030] text-[#89b4fa]" : "text-[#6c7086] hover:bg-[#1e2030] hover:text-[#cdd6f4]"
    }`}>
      <i className={`${icon} text-base`}></i>
      {badge && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#f38ba8] rounded-full border border-[#090b10]"></div>}
    </div>
  );
}


export default Editor;
