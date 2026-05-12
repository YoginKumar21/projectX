const axios = require("axios");
const { PDFParse } = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const { HfInference } = require("@huggingface/inference");

function cleanupFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.warn(`Failed to clean up file ${filePath}:`, error.message);
  }
}

async function extractPdfText(filePath) {
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });
  try {
    const result = await parser.getText();
    let extractedText = result.text || "";
    if (extractedText.startsWith("undefined")) {
      extractedText = extractedText.replace(/^undefined/, "").trim();
    }
    return extractedText;
  } catch (err) {
    console.error("PDF Parsing error:", err);
    return "Could not extract text from this PDF file.";
  } finally {
    try {
      await parser.destroy();
    } catch (destroyErr) {
      console.warn("Failed to destroy PDF parser:", destroyErr.message);
    }
  }
}


async function extractDocumentText(file) {
  const extension = path.extname(file.originalname || file.path).toLowerCase();

  if (extension === ".txt") {
    return fs.readFileSync(file.path, "utf8").trim();
  }

  if (extension === ".pdf") {
    return extractPdfText(file.path);
  }

  if (extension === ".docx") {
    return `[${file.originalname}] was uploaded. DOCX binary stream extraction is not configured. Please copy and paste its raw text.`;
  }

  return "";
}

function getGeminiSummaryText(responseData) {
  return responseData?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
}

async function generateSummary(text, context = "") {
  const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API key on the server (GEMINI_KEY).");
  }

  const prompt = `
You are an expert summarizer. Analyze the following content and provide:
1. A high-level executive summary (3 sentences).
2. Key takeaways in bullet points.
3. A "Deep Dive" section if the content contains complex data.

Supporting Context/Docs:
${context || "None provided"}

Content:
${text}
  `.trim();

  // Using gemini-2.5-flash as requested by the user
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        timeout: 120000,
      }
    );

    const summaryText = getGeminiSummaryText(response.data);

    if (!summaryText) {
      throw new Error("Gemini returned an empty summary.");
    }

    return summaryText;
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    throw new Error("Failed to generate summary with Gemini 2.5 Flash.");
  }
}

async function transcribeAudio(file) {
  if (!process.env.HF_TOKEN) {
    throw new Error("Missing Hugging Face token on the server (HF_TOKEN).");
  }

  const hf = new HfInference(process.env.HF_TOKEN);
  const audioData = fs.readFileSync(file.path);

  try {
    console.log("Transcribing audio via Hugging Face Inference...");
    const transcription = await hf.automaticSpeechRecognition({
      model: 'openai/whisper-large-v3-turbo',
      data: audioData,
    });

    const transcript = transcription.text?.trim();

    if (!transcript) {
      throw new Error("Hugging Face Whisper returned an empty transcription.");
    }

    return transcript;
  } catch (error) {
    console.error("HF Transcription Error:", error.message);
    throw new Error("Audio transcription failed: " + error.message);
  }
}

const analyzeMeeting = async (req, res) => {
  const type = req.body.type || "audio"; // 'audio' | 'text' | 'doc' | 'youtube'
  const uploadedAudio = req.files?.audio?.[0];
  const uploadedDocs = req.files?.docs || [];
  const youtubeUrl = req.body.youtubeUrl;
  const rawText = req.body.text;

  try {
    let textToSummarize = "";
    let transcriptContext = "";

    switch (type) {
      case "audio":
        if (!uploadedAudio) {
          return res.status(400).json({ error: "Please upload an audio file for transcription." });
        }
        textToSummarize = await transcribeAudio(uploadedAudio);
        transcriptContext = "Meeting Audio Transcription";
        break;

      case "text":
        if (!rawText || !rawText.trim()) {
          return res.status(400).json({ error: "Please provide the text content to summarize." });
        }
        textToSummarize = rawText.trim();
        transcriptContext = "Pasted Text Document";
        break;

      case "doc":
        if (uploadedDocs.length === 0) {
          return res.status(400).json({ error: "Please upload at least one document file (PDF, TXT)." });
        }
        const parsedTexts = [];
        for (const docFile of uploadedDocs) {
          try {
            const extractedText = await extractDocumentText(docFile);
            if (extractedText) {
              parsedTexts.push(`--- Document: ${docFile.originalname} ---\n${extractedText}`);
            }
          } catch (docErr) {
            console.error(`Error parsing ${docFile.originalname}:`, docErr);
            parsedTexts.push(`--- Document: ${docFile.originalname} ---\n[Failed to extract text]`);
          } finally {
            cleanupFile(docFile.path);
          }
        }
        textToSummarize = parsedTexts.join("\n\n");
        transcriptContext = "Uploaded Reference Documents";
        break;

      case "youtube":
        if (!youtubeUrl || !youtubeUrl.trim()) {
          return res.status(400).json({ error: "Please provide a valid YouTube video URL." });
        }
        textToSummarize = `YouTube Video Link: ${youtubeUrl}\n\nPlease fetch, analyze, and summarize this YouTube video directly.`;
        transcriptContext = "YouTube Video Analysis";
        break;

      default:
        return res.status(400).json({ error: `Unsupported summarization source format: ${type}` });
    }

    // Now, summarize with Gemini 2.5 Flash
    const finalSummary = await generateSummary(textToSummarize, transcriptContext);

    return res.json({
      summary: finalSummary,
      transcript: textToSummarize,
      type,
    });

  } catch (error) {
    console.error("Summarizer pipeline error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred in the summarization pipeline.",
    });
  } finally {
    // Make sure we clean up the audio upload if present
    if (uploadedAudio) {
      cleanupFile(uploadedAudio.path);
    }
  }
};

module.exports = {
  analyzeMeeting,
  generateSummary,
};
