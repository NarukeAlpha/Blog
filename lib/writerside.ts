import path from "node:path";

import { readTextFile, writeTextFileIfChanged } from "./files";
import {
  BOOKMARKS_TOPIC_FILE,
  HOME_TOPIC_FILE,
  INSTANCE_TREE_FILE,
  JOURNAL_TOPIC_FILE,
  POSTS_DIR
} from "./paths";
import { escapeHtml, escapeMarkdownInline, formatDate, normalizeBody } from "./text";
import type { BookmarkRecord, CreatePostRecordInput, PostRecord } from "./types";

const HOME_LATEST_POSTS_START = "<!-- studio:latest-posts:start -->";
const HOME_LATEST_POSTS_END = "<!-- studio:latest-posts:end -->";

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

export function getPostTopicFile(post: Pick<PostRecord, "slug">) {
  return path.join(POSTS_DIR, `${post.slug}.md`);
}

export function renderPostTopic(post: PostRecord) {
  return `# ${post.title}\n\n${normalizeBody(post.body)}\n`;
}

export function renderHomeLatestPosts(posts: PostRecord[]) {
  const latestPosts = posts.slice(0, 3);

  return latestPosts.length
    ? latestPosts
        .map((post) => `### [${escapeMarkdownInline(post.title)}](${post.topicPath})\n\n${formatDate(post.publishedAt)}\n`)
        .join("\n")
    : "No posts yet. The studio is ready when you are.\n";
}

export function renderDefaultHomePage() {
  return `# Home

This page stays hand-authored, with a small live feed for the newest journal entries.

## Latest posts

${HOME_LATEST_POSTS_START}
${HOME_LATEST_POSTS_END}

See the full [Journal](journal.md).
`;
}

export function injectLatestPostsIntoHomePage(homeContent: string, posts: PostRecord[]) {
  const startIndex = homeContent.indexOf(HOME_LATEST_POSTS_START);
  const endIndex = homeContent.indexOf(HOME_LATEST_POSTS_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      `Home topic must contain ${HOME_LATEST_POSTS_START} and ${HOME_LATEST_POSTS_END} so the latest posts block can be updated.`
    );
  }

  const before = homeContent.slice(0, startIndex + HOME_LATEST_POSTS_START.length);
  const after = homeContent.slice(endIndex);

  return `${before}\n${renderHomeLatestPosts(posts)}${after}`;
}

export async function syncHomePage(posts: PostRecord[]) {
  let homeContent = renderDefaultHomePage();

  try {
    homeContent = await readTextFile(HOME_TOPIC_FILE);
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  return writeTextFileIfChanged(HOME_TOPIC_FILE, injectLatestPostsIntoHomePage(homeContent, posts));
}

export function renderJournalPage(posts: PostRecord[]) {
  const archive = posts.length
    ? posts
        .map((post) => `### [${escapeMarkdownInline(post.title)}](${post.topicPath})\n\n${formatDate(post.publishedAt)}\n`)
        .join("\n")
    : "No posts yet. Publish your first note from the studio to start the archive.\n";

  return `# Journal\n\nEvery entry here starts inside the desktop studio and lands as a Writerside topic.\n\n## Archive\n\n${archive}`;
}

export function renderBookmarksPage(bookmarks: BookmarkRecord[]) {
  const table = bookmarks.length
    ? `<table>\n  <tr><th>Added</th><th>Bookmark</th><th>Why read it</th><th>Preview</th></tr>\n${bookmarks
        .map((bookmark) => {
          const preview = bookmark.thumbnailUrl
            ? `<img src="${escapeHtml(bookmark.thumbnailUrl)}" alt="${escapeHtml(bookmark.title)} preview" width="160"/>`
            : "No preview";

          const source = bookmark.source ? `<br/><small>${escapeHtml(bookmark.source)}</small>` : "";

          return `  <tr><td>${escapeHtml(formatDate(bookmark.addedAt))}</td><td><a href="${escapeHtml(
            bookmark.url
          )}">${escapeHtml(bookmark.title)}</a>${source}</td><td>${escapeHtml(bookmark.description)}</td><td>${preview}</td></tr>`;
        })
        .join("\n")}\n</table>`
    : "No bookmarks yet. Use the studio to research and publish your first reading recommendation.";

  return `# Bookmarks\n\nA running table of links worth another pass. Every row is enriched through OpenCode before it gets published.\n\n${table}\n`;
}

export function renderInstanceTree(posts: Array<Pick<PostRecord, "topicPath">>) {
  const postNodes = posts.map((post) => `        <toc-element topic="${post.topicPath}"/>`).join("\n");

  const childrenBlock = postNodes ? `\n${postNodes}` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE instance-profile
        SYSTEM "https://resources.jetbrains.com/writerside/1.0/product-profile.dtd">

<instance-profile id="hi"
                 name="Home"
                 start-page="home.md">

    <toc-element topic="home.md"/>
    <toc-element topic="journal.md">${childrenBlock}
    </toc-element>
    <toc-element topic="bookmarks.md"/>
</instance-profile>
`;
}

export async function syncGeneratedContent({ posts, bookmarks }: { posts: PostRecord[]; bookmarks: BookmarkRecord[] }) {
  const changedFiles: string[] = [];

  const didWriteHome = await syncHomePage(posts);

  if (didWriteHome) {
    changedFiles.push(HOME_TOPIC_FILE);
  }

  const generatedFiles: Array<[string, string]> = [
    [JOURNAL_TOPIC_FILE, renderJournalPage(posts)],
    [BOOKMARKS_TOPIC_FILE, renderBookmarksPage(bookmarks)],
    [INSTANCE_TREE_FILE, renderInstanceTree(posts)]
  ];

  for (const post of posts) {
    generatedFiles.push([getPostTopicFile(post), renderPostTopic(post)]);
  }

  for (const [filePath, content] of generatedFiles) {
    const didWrite = await writeTextFileIfChanged(filePath, content);

    if (didWrite) {
      changedFiles.push(filePath);
    }
  }

  return changedFiles;
}

export function createPostRecord({ title, body, slug, publishedAt }: CreatePostRecordInput): PostRecord {
  return {
    slug,
    title: title.trim(),
    body: normalizeBody(body),
    publishedAt,
    topicPath: `posts/${slug}.md`
  };
}
