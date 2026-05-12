const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleGenAI } = require("@google/genai");

const stripHtml = (html = "") => {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, " ")
    .replace(/<script[^>]*>.*?<\/script>/gis, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// POST /api/ai/action
exports.handleAIAction = async (req, res) => {
  try {
    const {
      type,
      content,
      compareContent = "",
      versionHistory = [],
    } = req.body;

    if (!type || content === undefined) {
      return res.status(400).json({
        message: "Type and content are required",
      });
    }

    const cleanContent = stripHtml(content);
    const cleanCompareContent = stripHtml(compareContent);

    let instruction = "";

    switch (type) {
      case "summarize":
        instruction =
          "Summarize the following note clearly and concisely. Keep only the important points.";
        break;
      case "improve":
        instruction =
          "Improve the writing of the following note. Make it clearer, more professional, and better structured.";
        break;
      case "expand":
        instruction =
          "Expand the following note with more useful detail while keeping it relevant and readable.";
        break;
      case "fix":
        instruction =
          "Fix grammar, spelling, punctuation, and clarity in the following note.";
        break;
      case "bullets":
        instruction = "Convert the following note into clean bullet points.";
        break;
      case "title":
        instruction =
          "Generate a short, strong, clean professional title for the following note. Return only the title text.";
        break;
      case "tags":
        instruction =
          "Generate up to 5 short relevant tags for the following note. Return only comma-separated tags with no numbering and no explanation.";
        break;
      case "professional":
        instruction =
          "Rewrite the following note in a professional tone. Keep the meaning same but make it polished and formal.";
        break;
      case "casual":
        instruction =
          "Rewrite the following note in a casual and friendly tone while keeping the meaning the same.";
        break;
      case "shorter":
        instruction =
          "Rewrite the following note in a shorter and more concise way without losing the main meaning.";
        break;
      case "longer":
        instruction =
          "Rewrite the following note in a slightly longer and more detailed way while keeping it clear and useful.";
        break;
      case "action-items":
        instruction =
          "Extract clear action items from the following note. Return them as bullet points.";
        break;
      case "meeting-summary":
        instruction =
          "Turn the following note into a clean meeting summary with sections for Summary, Key Decisions, and Action Items.";
        break;
      case "action-plan":
        instruction =
          "Convert the following note into a structured action plan with sections: Goal, Tasks, Owners if implied, and Next Steps.";
        break;
      case "study-sheet":
        instruction =
          "Convert the following note into a compact study revision sheet with headings, bullet points, and key takeaways.";
        break;
      case "brainstorm-refine":
        instruction =
          "Organize the following brainstorm into themes, strongest ideas, and suggested next steps.";
        break;
      case "minutes":
        instruction =
          "Convert the following note into formal meeting minutes with Agenda, Discussion, Decisions, and Action Items.";
        break;
      case "changes-summary":
        if (!compareContent) {
          return res.status(400).json({
            message: "compareContent is required for changes-summary",
          });
        }
        instruction =
          "Compare the old note and current note. Summarize the important changes clearly under sections: What Changed, New Additions, Removed/Updated Content, and Why It Matters if inferable.";
        break;
      case "unread-changes":
        if (!compareContent) {
          return res.status(400).json({
            message: "compareContent is required for unread-changes",
          });
        }
        instruction =
          "Compare the previous note and the current note. Write a concise summary of unread collaborator changes for a busy user. Focus only on meaningful changes.";
        break;
      case "edit-explainer":
        if (!compareContent) {
          return res.status(400).json({
            message: "compareContent is required for edit-explainer",
          });
        }
        instruction =
          "Compare the previous note and the current note. Explain the edits in simple language, including structural changes, tone changes, and content additions/removals.";
        break;
      case "changelog":
        if (!Array.isArray(versionHistory) || versionHistory.length === 0) {
          return res.status(400).json({
            message: "versionHistory is required for changelog",
          });
        }
        instruction =
          "Using the provided version history, generate a clean changelog in reverse chronological order. Highlight important progress, edits, and milestones. Keep it readable and useful.";
        break;
      case "progress-update":
        if (!Array.isArray(versionHistory) || versionHistory.length === 0) {
          return res.status(400).json({
            message: "versionHistory is required for progress-update",
          });
        }
        instruction =
          "Using the provided version history and current note, generate a concise progress update suitable for sharing with a team lead or manager. Include completed progress, recent changes, and next likely steps.";
        break;
      default:
        return res.status(400).json({
          message: "Invalid AI action type",
        });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY or GEMINI_KEY is missing in server/.env");
    }

    const genAI = new GoogleGenerativeAI({ apiKey });
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are a smart AI assistant inside a premium collaborative notes app. Your output should be useful, clean, directly usable inside the product, and well structured.",
      generationConfig: { maxOutputTokens: 8192 }
    });

    let userContent = `${instruction}\n\nCurrent Note:\n${cleanContent}`;

    if (
      ["changes-summary", "unread-changes", "edit-explainer"].includes(type)
    ) {
      userContent += `\n\nPrevious Note:\n${cleanCompareContent}`;
    }

    if (["changelog", "progress-update"].includes(type)) {
      const normalizedHistory = versionHistory
        .map((item, index) => {
          const versionText = stripHtml(item.content || "");
          const versionTitle = item.title || "Untitled Version";
          const versionDate =
            item.editedAt || item.savedAt || item.createdAt || "";
          return `Version ${index + 1}
Title: ${versionTitle}
Edited At: ${versionDate}
Content:
${versionText}`;
        })
        .join("\n\n--------------------\n\n");

      userContent += `\n\nVersion History:\n${normalizedHistory}`;
    }

    const response = await model.generateContent(userContent);
    const replyText = response.response.text();

    return res.json({
      result: replyText || "",
    });
  } catch (error) {
    console.error("AI Action Error:", error.message);
    return res.status(500).json({
      message: "AI action failed",
      error: error.message,
    });
  }
};

// POST /api/ai/chat
exports.handleAIChat = async (req, res) => {
  try {
    const { message, content, history = [] } = req.body;

    if (!message || content === undefined) {
      return res.status(400).json({
        message: "Message and note content are required",
      });
    }

    const cleanContent = stripHtml(content);
    const limitedHistory = Array.isArray(history) ? history.slice(-8) : [];

    // Ensure we use the exact GEMINI_API_KEY from env
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in server/.env");
    }

    // Initialize with the new official GoogleGenAI SDK
    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    // Provide the dynamic editor code context cleanly
    const systemInstruction = 
      "You are a professional coding assistant inside a collaborative real-time code editor.\n\n" +
      "Below is the current active code buffer open in the user's Monaco Editor canvas:\n" +
      `[ACTIVE MONACO EDITOR CODE BUFFER]:\n\`\`\`\n${cleanContent}\n\`\`\`\n\n` +
      "OPERATING INSTRUCTIONS:\n" +
      "1. REFERRING TO ACTIVE CODE: If the user refers to their editor code (e.g. 'look at my code', 'explain this', 'debug this', 'fix my code', 'why does this fail'), " +
      "analyze and reference the [ACTIVE MONACO EDITOR CODE BUFFER] above. Provide exact corrections, line references, or optimized suggestions based on it.\n" +
      "2. INDEPENDENT CODE GENERATION: If the user asks for brand-new, independent code (e.g. 'generate a script to add 2 numbers', 'write a function', " +
      "'give me a quicksort form', 'write code for...'), DO NOT try to merge, mix, or confuse it with the active editor code. " +
      "Write the requested utility from scratch, cleanly, with complete instructions and copy-pasteable blocks.";

    // Convert history cleanly to standard GenAI structure
    const chatHistory = limitedHistory.map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content || "" }]
    }));

    // Start Chat Session using Official SDK
    const chat = await ai.chats.create({
      model: "gemini-2.5-flash",
      history: chatHistory,
      config: {
        systemInstruction: systemInstruction
      }
    });

    // Send message and stream the content back so it renders word-by-word instantly in the UI
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const responseStream = await chat.sendMessageStream({ message: message });
    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (error) {
    console.error("AI Chat Error:", error.message);
    
    // Emit socket event to prevent the UI from hanging
    const io = req.app.get("io");
    if (io && req.user && req.user.id) {
      io.to(`user:${req.user.id}`).emit("ai-error", { message: error.message });
    }

    if (!res.headersSent) {
      return res.status(500).json({
        message: "AI chat failed",
        error: error.message,
      });
    } else {
      res.end();
    }
  }
};
