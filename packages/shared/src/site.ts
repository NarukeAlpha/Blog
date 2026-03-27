import { normalizeBody } from "./text";

export function stripMarkdown(markdown: string) {
  return normalizeBody(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[\*_~]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createExcerpt(markdown: string, maxLength = 180) {
  const plainText = stripMarkdown(markdown);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function estimateReadingTimeMinutes(markdown: string, wordsPerMinute = 220) {
  const wordCount = stripMarkdown(markdown)
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export function normalizeBookmarkUrl(rawUrl: string) {
  const trimmed = String(rawUrl || "").trim();

  if (!trimmed) {
    throw new Error("Bookmarks need a URL.");
  }

  try {
    const parsed = new URL(trimmed);

    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported.");
    }

    return parsed.toString();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "That bookmark URL is not valid.");
  }
}
