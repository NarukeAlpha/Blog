import assert from "node:assert/strict";
import test from "node:test";

import { getImageExtension } from "../lib/thumbnails";
import { createUniqueSlug, slugify } from "../lib/slug";
import { createExcerpt, estimateReadingTimeMinutes, normalizeBookmarkUrl, stripMarkdown } from "../lib/site";

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
