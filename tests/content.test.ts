import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBookmarkPrompt,
  extractBookmarkStructuredMetadata,
  normalizeBookmarkMetadata,
  truncateBookmarkDescription
} from "../apps/studio/lib/opencode";
import { getImageExtension } from "../apps/studio/lib/thumbnails";
import { createUniqueSlug, slugify } from "../packages/shared/src/slug";
import { createExcerpt, estimateReadingTimeMinutes, normalizeBookmarkUrl, stripMarkdown } from "../packages/shared/src/site";

test("slugify creates readable ASCII slugs", () => {
  assert.equal(slugify(" Hello, Convex World! "), "hello-convex-world");
});

test("createUniqueSlug adds numeric suffixes for duplicates", () => {
  assert.equal(createUniqueSlug("Hello World", ["hello-world", "hello-world-2"]), "hello-world-3");
});

test("stripMarkdown removes common markdown formatting while keeping content", () => {
  const plain = stripMarkdown("# Post\n\nVisit [the docs](https://example.com) and `ship it`.\n\n- one\n- two");

  assert.equal(plain, "Post Visit the docs and ship it. - one - two");
});

test("createExcerpt trims long markdown into a compact summary", () => {
  const excerpt = createExcerpt("## Title\n\n" + "A ".repeat(120), 50);

  assert.match(excerpt, /^Title A A A/);
  assert.ok(excerpt.endsWith("..."));
  assert.ok(excerpt.length <= 50);
});

test("estimateReadingTimeMinutes never returns less than one minute", () => {
  assert.equal(estimateReadingTimeMinutes("tiny note"), 1);
  assert.equal(estimateReadingTimeMinutes("word ".repeat(440)), 2);
});

test("normalizeBookmarkUrl accepts http and https URLs", () => {
  assert.equal(normalizeBookmarkUrl("https://example.com/notes?q=1"), "https://example.com/notes?q=1");
  assert.equal(normalizeBookmarkUrl(" http://example.com/path "), "http://example.com/path");
});

test("normalizeBookmarkUrl rejects unsupported protocols", () => {
  assert.throws(() => normalizeBookmarkUrl("ftp://example.com"), /Only HTTP and HTTPS URLs are supported/);
});

test("getImageExtension prefers content type and normalizes jpeg", () => {
  assert.equal(getImageExtension("image/jpeg", "https://example.com/image"), "jpg");
  assert.equal(getImageExtension(null, "https://example.com/image.webp?size=2"), "webp");
  assert.equal(getImageExtension("text/html", "https://example.com/image"), "png");
});

test("buildBookmarkPrompt requires webfetch and a short description", () => {
  const prompt = buildBookmarkPrompt("https://example.com/post", "Focus on the article summary");

  assert.match(prompt, /webfetch/i);
  assert.match(prompt, /format to html/i);
  assert.match(prompt, /timeout to 30 seconds/i);
  assert.match(prompt, /50 characters/i);
  assert.match(prompt, /Additional context from the user: Focus on the article summary/);
});

test("extractBookmarkStructuredMetadata reads v2 structured output", () => {
  const metadata = extractBookmarkStructuredMetadata({
    info: {
      structured: {
        title: "Example title",
        description: "Example description",
        source: "Example",
        thumbnailUrl: "https://example.com/image.png"
      }
    }
  });

  assert.deepEqual(metadata, {
    title: "Example title",
    description: "Example description",
    source: "Example",
    thumbnailUrl: "https://example.com/image.png"
  });
});

test("extractBookmarkStructuredMetadata falls back to JSON text parts", () => {
  const metadata = extractBookmarkStructuredMetadata({
    parts: [
      {
        type: "text",
        text: '{"title":"JSON title","description":"JSON description","source":"JSON source","thumbnailUrl":""}'
      }
    ]
  });

  assert.deepEqual(metadata, {
    title: "JSON title",
    description: "JSON description",
    source: "JSON source",
    thumbnailUrl: ""
  });
});

test("truncateBookmarkDescription clips long text at a word boundary", () => {
  const description = truncateBookmarkDescription("This is a deliberately long description for a bookmark entry that should be clipped neatly");

  assert.ok(description.length <= 50);
  assert.equal(description, "This is a deliberately long description for a");
});

test("normalizeBookmarkMetadata trims values, caps descriptions, and validates thumbnails", () => {
  const metadata = normalizeBookmarkMetadata("https://www.example.com/posts/1", {
    title: "  Example post title  ",
    description: "A long explanation that should be shortened to fit inside the bookmark description limit cleanly.",
    source: "  Example Site  ",
    thumbnailUrl: "javascript:alert('xss')"
  });

  assert.equal(metadata.title, "Example post title");
  assert.equal(metadata.source, "Example Site");
  assert.ok(metadata.description.length <= 50);
  assert.equal(metadata.thumbnailUrl, "");
});
