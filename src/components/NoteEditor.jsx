import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Eraser,
} from "lucide-react";
import UnifiedSlashMenu, { slashCommands } from "./UnifiedSlashMenu";

function NoteEditor({ value, onChange, onAIMenuAction }) {
  const editorRef = useRef(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearch, setSlashSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 70, left: 20 });

  useEffect(() => {
    if (!editorRef.current) return;

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const filteredCommands = useMemo(() => {
    return slashCommands.filter((cmd) => {
      const q = slashSearch.toLowerCase();
      return (
        cmd.label.toLowerCase().includes(q) ||
        cmd.key.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.group.toLowerCase().includes(q)
      );
    });
  }, [slashSearch]);

  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(0);
    }
  }, [filteredCommands, selectedIndex]);

  const updateEditorValue = () => {
    onChange(editorRef.current?.innerHTML || "");
  };

  const applyFormat = (command, commandValue = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    updateEditorValue();
  };

  const setParagraph = () => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, "p");
    updateEditorValue();
  };

  const insertHtmlAtCursor = (html) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    updateEditorValue();
  };

  const handleBlockCommand = (key) => {
    switch (key) {
      case "divider":
        insertHtmlAtCursor("<hr />");
        break;

      case "callout":
        insertHtmlAtCursor(`
          <div class="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 my-2">
            <strong>Callout:</strong> Write something important...
          </div>
        `);
        break;

      case "quote":
        insertHtmlAtCursor(`
          <blockquote class="border-l-4 border-slate-300 pl-4 italic my-2 text-slate-600">
            Quote goes here...
          </blockquote>
        `);
        break;

      case "code":
        insertHtmlAtCursor(`
          <pre class="rounded-2xl bg-slate-900 text-slate-100 p-4 my-2 overflow-x-auto"><code>Write code here...</code></pre>
        `);
        break;

      case "checklist":
        insertHtmlAtCursor(`
          <div class="my-2">
            <label style="display:flex;gap:8px;align-items:center;">
              <input type="checkbox" />
              <span>Checklist item</span>
            </label>
          </div>
        `);
        break;

      case "image":
        insertHtmlAtCursor(`
          <div class="my-2 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Image block placeholder
          </div>
        `);
        break;

      case "video":
        insertHtmlAtCursor(`
          <div class="my-2 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Video embed placeholder
          </div>
        `);
        break;

      default:
        break;
    }
  };

  const removeSlashCommandText = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const textBeforeCursor = preCaretRange.toString();
    const slashMatch = textBeforeCursor.match(/\/([a-zA-Z-]*)$/);

    if (!slashMatch) return;

    const matchedText = slashMatch[0];
    const plainText = editorRef.current.innerText || "";
    const lastIndex = plainText.lastIndexOf(matchedText);

    if (lastIndex !== -1) {
      const updatedText =
        plainText.slice(0, lastIndex) +
        plainText.slice(lastIndex + matchedText.length);

      editorRef.current.innerText = updatedText;
      onChange(editorRef.current.innerHTML || updatedText);
    }
  };

  const handleSelectCommand = (command) => {
    removeSlashCommandText();
    setShowSlashMenu(false);
    setSlashSearch("");
    setSelectedIndex(0);

    if (command.type === "block") {
      handleBlockCommand(command.key);
      return;
    }

    if (command.type === "ai" && typeof onAIMenuAction === "function") {
      onAIMenuAction(command.key, command.label);
    }
  };

  const handleInput = () => {
    updateEditorValue();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      setShowSlashMenu(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const textBeforeCursor = preCaretRange.toString();
    const slashMatch = textBeforeCursor.match(/\/([a-zA-Z-]*)$/);

    if (slashMatch) {
      const query = slashMatch[1] || "";
      setSlashSearch(query);
      setShowSlashMenu(true);

      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      setMenuPosition({
        top: rect.bottom - editorRect.top + 12,
        left: Math.max(12, rect.left - editorRect.left),
      });
    } else {
      setShowSlashMenu(false);
      setSlashSearch("");
      setSelectedIndex(0);
    }
  };

  const handleKeyDown = (e) => {
    if (showSlashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev + 1 >= filteredCommands.length ? 0 : prev + 1,
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev - 1 < 0 ? filteredCommands.length - 1 : prev - 1,
        );
        return;
      }

      if (e.key === "Enter" && filteredCommands.length > 0) {
        e.preventDefault();
        handleSelectCommand(filteredCommands[selectedIndex]);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setShowSlashMenu(false);
        setSlashSearch("");
        setSelectedIndex(0);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyFormat("bold");
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyFormat("italic");
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      applyFormat("underline");
    }
  };

  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-slate-200 bg-white/90 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <button
          type="button"
          onClick={() => applyFormat("bold")}
          className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bold size={18} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("italic")}
          className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Italic size={18} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("underline")}
          className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Underline size={18} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("formatBlock", "h1")}
          className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Heading1 size={18} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("formatBlock", "h2")}
          className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Heading2 size={18} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("insertUnorderedList")}
          className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <List size={18} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat("insertOrderedList")}
          className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ListOrdered size={18} />
        </button>

        <button
          type="button"
          onClick={setParagraph}
          className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Eraser size={18} />
        </button>
      </div>

      <div className="relative p-4">
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            className="min-h-[420px] rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
            data-placeholder="Start writing your note… Type / for AI and blocks"
          />

          {!value && (
            <span className="pointer-events-none absolute left-5 top-4 text-sm text-slate-400 dark:text-slate-500">
              Start writing your note… Type / for AI and blocks
            </span>
          )}
        </div>

        <UnifiedSlashMenu
          visible={showSlashMenu}
          position={menuPosition}
          search={slashSearch}
          selectedIndex={selectedIndex}
          onSelect={handleSelectCommand}
        />
      </div>
    </div>
  );
}

export default NoteEditor;