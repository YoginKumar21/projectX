const axios = require("axios");
const { PDFParse } = require("pdf-parse");
const fs = require("fs");
const path = require("path");

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
    return result.text?.trim() || "";
  } finally {
    await parser.destroy();
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
    return `[${file.originalname}] was uploaded, but DOCX text extraction is not configured yet.`;
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
  if (!process.env.GEMINI_KEY) {
    throw new Error("Missing Gemini API key on the server.");
  }

  const prompt = `
Analyze the following meeting transcript and supporting documents.
Provide a structured summary with:
1. Key Discussion Points
2. Decisions Made
3. Action Items

Supporting Documents:
${context || "None provided"}

Transcript:
${text}
  `.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;

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
    throw new Error("Failed to generate summary");
  }
}

async function transcribeAudio(file) {
  if (!process.env.HF_TOKEN) {
    throw new Error("Missing Hugging Face token on the server.");
  }

  const audioData = fs.readFileSync(file.path);

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
      audioData,
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": file.mimetype || "application/octet-stream",
        },
        timeout: 300000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const transcript = response.data?.text?.trim();

    if (!transcript) {
      const apiMessage =
        typeof response.data?.error === "string"
          ? response.data.error
          : "Transcription service returned an empty response.";

      throw new Error(apiMessage);
    }

    return transcript;
  } catch (error) {
    const apiMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;

    throw new Error(apiMessage || "Audio transcription failed.");
  }
}

const analyzeMeeting = async (req, res) => {
  const uploadedAudio = req.files?.audio?.[0];
  const uploadedDocs = req.files?.docs || [];

  try {
    if (!uploadedAudio) {
      return res.status(400).json({ error: "Please upload an audio file first." });
    }

    const documentTexts = [];

    for (const docFile of uploadedDocs) {
      try {
        const extractedText = await extractDocumentText(docFile);

        if (extractedText) {
          documentTexts.push(`Document: ${docFile.originalname}\n${extractedText}`);
        }
      } catch (docError) {
        console.error(`Document parsing error for ${docFile.originalname}:`, docError);
        documentTexts.push(
          `Document: ${docFile.originalname}\nCould not parse this file.`
        );
      } finally {
        cleanupFile(docFile.path);
      }
    }

    const transcript = await transcribeAudio(uploadedAudio);
    const docText = documentTexts.join("\n\n").trim();
    const finalSummary = await generateSummary(transcript, docText);

    return res.json({
      summary: finalSummary,
      transcript,
      documentText: docText ? docText.substring(0, 500) : null,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({
      error: error.message || "Analysis failed. Check your API limits and tokens.",
    });
  } finally {
    cleanupFile(uploadedAudio?.path);
  }
};

module.exports = {
  analyzeMeeting,
  generateSummary,
};
