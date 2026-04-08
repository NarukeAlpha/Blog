import {
  buildBookmarkPrompt,
  extractBookmarkStructuredMetadata,
  normalizeBookmarkMetadata,
  truncateBookmarkDescription
} from "../apps/studio/lib/opencode";
import { getImageExtension } from "../apps/studio/lib/thumbnails";
import { createUniqueSlug, slugify } from "@shared/slug";
import { createExcerpt, estimateReadingTimeMinutes, normalizeBookmarkUrl, stripMarkdown } from "@shared/site";
import { escapeHtml, escapeMarkdownInline, normalizeBody } from "@shared/text";
import { describe, expect, test } from "vitest";

test("slugify creates readable ASCII slugs", () => {
  expect(slugify(" Hello, Convex World! ")).toBe("hello-convex-world");
  expect(slugify("Crème brûlée")).toBe("creme-brulee");
  expect(slugify("***")).toBe("untitled");
});

test("createUniqueSlug adds numeric suffixes for duplicates", () => {
  expect(createUniqueSlug("Hello World", ["hello-world", "hello-world-2"])).toBe("hello-world-3");
});

test("stripMarkdown removes common markdown formatting while keeping content", () => {
  const plain = stripMarkdown("# Post\n\nVisit [the docs](https://example.com) and `ship it`.\n\n- one\n- two");

  expect(plain).toBe("Post Visit the docs and ship it. - one - two");
});

test("createExcerpt trims long markdown into a compact summary", () => {
  const excerpt = createExcerpt("## Title\n\n" + "A ".repeat(120), 50);

  expect(excerpt).toMatch(/^Title A A A/);
  expect(excerpt.endsWith("...")).toBe(true);
  expect(excerpt.length).toBeLessThanOrEqual(50);
});

test("createExcerpt returns the plain text when already short enough", () => {
  expect(createExcerpt("Short note", 50)).toBe("Short note");
});

test("estimateReadingTimeMinutes never returns less than one minute", () => {
  expect(estimateReadingTimeMinutes("tiny note")).toBe(1);
  expect(estimateReadingTimeMinutes("word ".repeat(440))).toBe(2);
});

test("normalizeBookmarkUrl accepts and trims http and https URLs", () => {
  expect(normalizeBookmarkUrl("https://example.com/notes?q=1")).toBe("https://example.com/notes?q=1");
  expect(normalizeBookmarkUrl(" http://example.com/path ")).toBe("http://example.com/path");
});

test("normalizeBookmarkUrl rejects empty, invalid, and unsupported URLs", () => {
  expect(() => normalizeBookmarkUrl("  ")).toThrow("Bookmarks need a URL.");
  expect(() => normalizeBookmarkUrl("not-a-url")).toThrow();
  expect(() => normalizeBookmarkUrl("ftp://example.com")).toThrow("Only HTTP and HTTPS URLs are supported.");
});

test("text helpers escape HTML and markdown-sensitive punctuation", () => {
  expect(escapeHtml(`<tag attr=\"x\">Tom & 'Jerry'</tag>`)).toBe("&lt;tag attr=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/tag&gt;");
  expect(escapeMarkdownInline("[link](url) *bold* _em_ `code` \\")).toBe("\\[link\\]\\(url\\) \\*bold\\* \\_em\\_ \\`code\\` \\\\");
  expect(normalizeBody("line 1\r\nline 2\r\n")).toBe("line 1\nline 2");
});

test("getImageExtension prefers content type and normalizes known image formats", () => {
  expect(getImageExtension("image/jpeg", "https://example.com/image")).toBe("jpg");
  expect(getImageExtension("image/svg+xml", "https://example.com/image")).toBe("svg");
  expect(getImageExtension(null, "https://example.com/image.webp?size=2")).toBe("webp");
  expect(getImageExtension("text/html", "https://example.com/image")).toBe("png");
});

test("buildBookmarkPrompt requires webfetch and a short description", () => {
  const prompt = buildBookmarkPrompt("https://example.com/post", "Focus on the article summary");

  expect(prompt).toMatch(/webfetch/i);
  expect(prompt).toMatch(/format to html/i);
  expect(prompt).toMatch(/timeout to 30 seconds/i);
  expect(prompt).toMatch(/50 characters/i);
  expect(prompt).toMatch(/Additional context from the user: Focus on the article summary/);
});

test("extractBookmarkStructuredMetadata reads structured and fallback outputs", () => {
  expect(
    extractBookmarkStructuredMetadata({
      info: {
        structured: {
          title: "Example title",
          description: "Example description",
          source: "Example",
          thumbnailUrl: "https://example.com/image.png"
        }
      }
    })
  ).toEqual({
    title: "Example title",
    description: "Example description",
    source: "Example",
    thumbnailUrl: "https://example.com/image.png"
  });

  expect(
    extractBookmarkStructuredMetadata({
      info: {
        structured_output: {
          title: "Legacy title",
          description: "Legacy description",
          source: "Legacy source",
          thumbnailUrl: ""
        }
      }
    })
  ).toEqual({
    title: "Legacy title",
    description: "Legacy description",
    source: "Legacy source",
    thumbnailUrl: ""
  });

  expect(
    extractBookmarkStructuredMetadata({
      parts: [
        {
          type: "text",
          text: '{"title":"JSON title","description":"JSON description","source":"JSON source","thumbnailUrl":""}'
        }
      ]
    })
  ).toEqual({
    title: "JSON title",
    description: "JSON description",
    source: "JSON source",
    thumbnailUrl: ""
  });
});

describe("truncateBookmarkDescription", () => {
  test("clips long text at a word boundary", () => {
    const description = truncateBookmarkDescription("This is a deliberately long description for a bookmark entry that should be clipped neatly");

    expect(description.length).toBeLessThanOrEqual(50);
    expect(description).toBe("This is a deliberately long description for a");
  });

  test("returns an empty string for blank input", () => {
    expect(truncateBookmarkDescription("   \n  ")).toBe("");
  });
});

test("normalizeBookmarkMetadata trims values, caps descriptions, and validates thumbnails", () => {
  const metadata = normalizeBookmarkMetadata("https://www.example.com/posts/1", {
    title: "  Example post title  ",
    description: "A long explanation that should be shortened to fit inside the bookmark description limit cleanly.",
    source: "  Example Site  ",
    thumbnailUrl: "javascript:alert('xss')"
  });

  expect(metadata.title).toBe("Example post title");
  expect(metadata.source).toBe("Example Site");
  expect(metadata.description.length).toBeLessThanOrEqual(50);
  expect(metadata.thumbnailUrl).toBe("");
});

test("normalizeBookmarkMetadata falls back to the hostname and default description", () => {
  expect(normalizeBookmarkMetadata("https://www.example.com/posts/1", null)).toEqual({
    title: "example.com",
    description: "Saved link from example.com",
    source: "example.com",
    thumbnailUrl: ""
  });
});
