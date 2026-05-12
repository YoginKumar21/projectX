export function stripHtml(html = "") {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

export function countOccurrences(source = "", regex) {
  const matches = source.match(regex);
  return matches ? matches.length : 0;
}

export function getReadingTimeMinutes(wordCount) {
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function getReadabilityLabel(
  wordCount,
  sentenceCount,
  avgWordsPerSentence,
) {
  if (wordCount < 30) return "Very Simple";
  if (avgWordsPerSentence <= 12) return "Easy";
  if (avgWordsPerSentence <= 18) return "Moderate";
  if (avgWordsPerSentence <= 25) return "Dense";
  return "Complex";
}

export function analyzeNote({
  title = "",
  content = "",
  tags = [],
  attachments = [],
}) {
  const plainText = stripHtml(content).trim();

  const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = plainText.length;

  const sentenceParts = plainText
    ? plainText
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const sentenceCount = sentenceParts.length || 1;

  const avgWordsPerSentence =
    wordCount > 0 ? Number((wordCount / sentenceCount).toFixed(1)) : 0;

  const headingCount = countOccurrences(
    content,
    /<h1[\s>]|<h2[\s>]|<h3[\s>]|<h4[\s>]|<h5[\s>]|<h6[\s>]/gi,
  );

  const bulletCount = countOccurrences(content, /<li[\s>]/gi);

  const checklistCount = countOccurrences(content, /type=["']checkbox["']/gi);

  const imageCount = countOccurrences(content, /<img[\s>]/gi);

  const codeBlockCount = countOccurrences(content, /<pre[\s>]|<code[\s>]/gi);

  const readingTime = getReadingTimeMinutes(wordCount);
  const readability = getReadabilityLabel(
    wordCount,
    sentenceCount,
    avgWordsPerSentence,
  );

  const suggestions = [];

  if (!title?.trim()) {
    suggestions.push({
      key: "missing-title",
      label: "Add or generate a title",
      type: "metadata",
      tone: "warning",
    });
  }

  if (!tags?.length) {
    suggestions.push({
      key: "missing-tags",
      label: "Generate tags for better organization",
      type: "metadata",
      tone: "info",
    });
  }

  if (wordCount > 250 && headingCount === 0) {
    suggestions.push({
      key: "no-headings",
      label: "This note is long. Add headings or summarize it",
      type: "structure",
      tone: "warning",
    });
  }

  if (wordCount > 350) {
    suggestions.push({
      key: "too-long",
      label: "Try summary or shorter rewrite for better readability",
      type: "ai",
      tone: "info",
    });
  }

  if (wordCount > 0 && wordCount < 25) {
    suggestions.push({
      key: "too-short",
      label: "This note is very short. Expand with more detail if needed",
      type: "ai",
      tone: "info",
    });
  }

  if (avgWordsPerSentence > 22) {
    suggestions.push({
      key: "dense-writing",
      label: "Writing is dense. Improve clarity or convert to bullets",
      type: "ai",
      tone: "warning",
    });
  }

  if (wordCount > 120 && bulletCount === 0 && checklistCount === 0) {
    suggestions.push({
      key: "needs-bullets",
      label: "Use bullets or checklist for easier scanning",
      type: "structure",
      tone: "info",
    });
  }

  return {
    plainText,
    wordCount,
    charCount,
    sentenceCount,
    avgWordsPerSentence,
    headingCount,
    bulletCount,
    checklistCount,
    imageCount,
    codeBlockCount,
    attachmentCount: attachments?.length || 0,
    readingTime,
    readability,
    suggestions,
  };
}
