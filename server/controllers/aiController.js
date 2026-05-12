const OpenAI = require("openai");

const stripHtml = (html = "") => {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, " ")
    .replace(/<script[^>]*>.*?<\/script>/gis, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing in server/.env");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
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

    const client = getOpenAIClient();

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

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are a smart AI assistant inside a premium collaborative notes app. Your output should be useful, clean, directly usable inside the product, and well structured.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    return res.json({
      result: response.output_text || "",
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

    const input = [
      {
        role: "system",
        content:
          "You are an intelligent assistant inside a collaborative notes app. Answer mainly using the user's current note and request. Be concise, helpful, and clear.",
      },
      {
        role: "user",
        content:
          `Here is the current note content:\n\n${cleanContent}\n\n` +
          `Use this note as the main context while answering.`,
      },
      ...limitedHistory.map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content,
      })),
      {
        role: "user",
        content: message,
      },
    ];

    const client = getOpenAIClient();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
    });

    return res.json({
      reply: response.output_text || "",
    });
  } catch (error) {
    console.error("AI Chat Error:", error.message);
    return res.status(500).json({
      message: "AI chat failed",
      error: error.message,
    });
  }
};
