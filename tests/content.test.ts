import assert from "node:assert/strict";
import test from "node:test";

import { createUniqueSlug, slugify } from "../lib/slug";
import {
  injectLatestPostsIntoHomePage,
  renderBookmarksPage,
  renderInstanceTree,
  renderJournalPage,
  renderPostTopic
} from "../lib/writerside";

test("slugify creates readable ASCII slugs", () => {
  assert.equal(slugify(" Hello, Writerside World! "), "hello-writerside-world");
});

test("createUniqueSlug adds numeric suffixes for duplicates", () => {
  assert.equal(createUniqueSlug("Hello World", ["hello-world", "hello-world-2"]), "hello-world-3");
});

test("home page preserves manual content and links the newest posts into the journal timeline", () => {
  const page = injectLatestPostsIntoHomePage(
    `# Home

Manual intro.

## Latest posts

<!-- studio:latest-posts:start -->
Old generated content.
<!-- studio:latest-posts:end -->

Manual footer.
`,
    [
      {
        slug: "dispatch",
        title: "Dispatch",
        body: "",
        topicPath: "posts/dispatch.md",
        publishedAt: "2026-03-07T12:00:00.000Z"
      },
      {
        slug: "archive",
        title: "Archive",
        body: "",
        topicPath: "posts/archive.md",
        publishedAt: "2026-03-05T12:00:00.000Z"
      },
      {
        slug: "welcome",
        title: "Welcome",
        body: "",
        topicPath: "posts/welcome.md",
        publishedAt: "2026-03-08T12:00:00.000Z"
      },
      {
        slug: "field-report",
        title: "Field Report",
        body: "",
        topicPath: "posts/field-report.md",
        publishedAt: "2026-03-06T12:00:00.000Z"
      }
    ]
  );

  assert.match(page, /\[Welcome\]\(journal\.md#welcome\)/);
  assert.match(page, /\[Dispatch\]\(journal\.md#dispatch\)/);
  assert.match(page, /Manual intro\./);
  assert.match(page, /Manual footer\./);
  assert.doesNotMatch(page, /Old generated content\./);
  assert.doesNotMatch(page, /\[Archive\]\(journal\.md#archive\)/);
  assert.ok(page.indexOf("[Welcome](journal.md#welcome)") < page.indexOf("[Dispatch](journal.md#dispatch)"));
});

test("journal page renders a full timeline entry for each post", () => {
  const page = renderJournalPage([
    {
      slug: "dispatch",
      title: "Dispatch",
      body: "Intro paragraph.\n\n## Section",
      topicPath: "posts/dispatch.md",
      publishedAt: "2026-03-08T12:00:00.000Z"
    }
  ]);

  assert.match(page, /## Dispatch \{id="dispatch"\}/);
  assert.match(page, /Mar 8, 2026/);
  assert.match(page, /Intro paragraph\./);
  assert.match(page, /### Section/);
  assert.doesNotMatch(page, /Tags/);
  assert.doesNotMatch(page, /## Archive/);
});

test("post topic renders title and markdown without extra metadata", () => {
  const page = renderPostTopic({
    slug: "dispatch",
    title: "Dispatch",
    body: "Intro paragraph.\n\n## Section",
    topicPath: "posts/dispatch.md",
    publishedAt: "2026-03-08T12:00:00.000Z"
  });

  assert.match(page, /^# Dispatch/m);
  assert.match(page, /Intro paragraph\./);
  assert.match(page, /## Section/);
  assert.doesNotMatch(page, /Published/);
  assert.doesNotMatch(page, /Tags/);
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

test("instance tree keeps journal as a standalone top-level page", () => {
  const tree = renderInstanceTree();

  assert.match(tree, /name="Home"/);
  assert.match(tree, /<toc-element topic="journal.md"\/>/);
  assert.match(tree, /<toc-element topic="bookmarks.md"\/>/);
  assert.doesNotMatch(tree, /posts\/welcome\.md/);
  assert.doesNotMatch(tree, /workflow\.md/);
});
