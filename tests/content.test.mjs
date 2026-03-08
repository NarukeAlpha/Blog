import test from "node:test";
import assert from "node:assert/strict";

import { createUniqueSlug, slugify } from "../lib/slug.js";
import { renderBookmarksPage, renderHomePage, renderInstanceTree, renderJournalPage } from "../lib/writerside.js";

test("slugify creates readable ASCII slugs", () => {
  assert.equal(slugify(" Hello, Writerside World! "), "hello-writerside-world");
});

test("createUniqueSlug adds numeric suffixes for duplicates", () => {
  assert.equal(createUniqueSlug("Hello World", ["hello-world", "hello-world-2"]), "hello-world-3");
});

test("home page links to generated post topics", () => {
  const page = renderHomePage(
    [
      {
        title: "Welcome",
        summary: "An intro.",
        topicPath: "posts/welcome.md",
        publishedAt: "2026-03-08T12:00:00.000Z"
      }
    ],
    []
  );

  assert.match(page, /\[Welcome\]\(posts\/welcome\.md\)/);
});

test("journal page contains post summaries", () => {
  const page = renderJournalPage([
    {
      title: "Dispatch",
      summary: "A field note.",
      topicPath: "posts/dispatch.md",
      publishedAt: "2026-03-08T12:00:00.000Z",
      tags: ["notes"]
    }
  ]);

  assert.match(page, /A field note\./);
});

test("bookmark page renders an HTML table when bookmarks exist", () => {
  const page = renderBookmarksPage([
    {
      title: "OpenCode SDK",
      url: "https://opencode.ai/docs/sdk/",
      description: "Structured output docs.",
      thumbnailUrl: "https://example.com/thumb.png",
      source: "OpenCode",
      addedAt: "2026-03-08T12:00:00.000Z"
    }
  ]);

  assert.match(page, /<table>/);
  assert.match(page, /OpenCode SDK/);
});

test("instance tree nests generated posts under journal", () => {
  const tree = renderInstanceTree([{ topicPath: "posts/welcome.md" }]);

  assert.match(tree, /<toc-element topic="journal.md">/);
  assert.match(tree, /<toc-element topic="posts\/welcome.md"\/>/);
});
