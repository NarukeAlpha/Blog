import path from "node:path";

import { writeTextFileIfChanged } from "./files.js";
import {
  BOOKMARKS_TOPIC_FILE,
  HOME_TOPIC_FILE,
  INSTANCE_TREE_FILE,
  JOURNAL_TOPIC_FILE,
  POSTS_DIR,
  WORKFLOW_TOPIC_FILE
} from "./paths.js";
import {
  escapeHtml,
  escapeMarkdownInline,
  formatDate,
  normalizeBody,
  summarize
} from "./text.js";

export function getPostTopicFile(post) {
  return path.join(POSTS_DIR, `${post.slug}.md`);
}

function renderTags(tags) {
  if (!tags?.length) {
    return "_No tags yet._";
  }

  return tags.map((tag) => `\`${escapeMarkdownInline(tag)}\``).join(" ");
}

export function renderPostTopic(post) {
  const summary = post.summary ? `${post.summary.trim()}\n\n` : "";

  return `# ${post.title}\n\n> Published ${formatDate(post.publishedAt)}\n> Tags ${renderTags(post.tags)}\n\n${summary}${normalizeBody(post.body)}\n`;
}

export function renderHomePage(posts, bookmarks) {
  const latestPosts = posts.slice(0, 3);
  const latestBookmarks = bookmarks.slice(0, 3);

  const postsBlock = latestPosts.length
    ? latestPosts
        .map(
          (post) =>
            `### [${escapeMarkdownInline(post.title)}](${post.topicPath})\n\n${formatDate(post.publishedAt)} - ${post.summary}\n`
        )
        .join("\n")
    : "No posts yet. The studio is ready when you are.\n";

  const bookmarksBlock = latestBookmarks.length
    ? latestBookmarks
        .map(
          (bookmark) =>
            `- [${escapeMarkdownInline(bookmark.title)}](${bookmark.url}) - ${bookmark.description}`
        )
        .join("\n")
    : "- No bookmarks yet. Add one from the studio and OpenCode will research it for you.";

  return `# Signal & Static\n\nA Writerside blog that publishes from a desktop studio straight into GitHub Pages.\n\n## What lives here\n\n- Journal posts become Writerside topics the moment they are published from the Electron app.\n- Git pushes trigger a GitHub Actions workflow that rebuilds the public site.\n- Bookmarks are researched through OpenCode before they land in the reading queue.\n\n## Latest posts\n\n${postsBlock}\n## Reading queue\n\n${bookmarksBlock}\n\nSee the full [Journal](journal.md), [Bookmarks](bookmarks.md), and [Publishing workflow](workflow.md).\n`;
}

export function renderJournalPage(posts) {
  const archive = posts.length
    ? posts
        .map(
          (post) =>
            `### [${escapeMarkdownInline(post.title)}](${post.topicPath})\n\n- Published ${formatDate(post.publishedAt)}\n- Tags ${renderTags(post.tags)}\n\n${post.summary}\n`
        )
        .join("\n")
    : "No posts yet. Publish your first note from the studio to start the archive.\n";

  return `# Journal\n\nEvery entry here starts inside the desktop studio and lands as a Writerside topic.\n\n## Archive\n\n${archive}`;
}

export function renderBookmarksPage(bookmarks) {
  const table = bookmarks.length
    ? `<table>\n  <tr><th>Added</th><th>Bookmark</th><th>Why read it</th><th>Preview</th></tr>\n${bookmarks
        .map((bookmark) => {
          const preview = bookmark.thumbnailUrl
            ? `<img src="${escapeHtml(bookmark.thumbnailUrl)}" alt="${escapeHtml(bookmark.title)} preview" width="160"/>`
            : "No preview";

          const source = bookmark.source ? `<br/><small>${escapeHtml(bookmark.source)}</small>` : "";

          return `  <tr><td>${escapeHtml(formatDate(bookmark.addedAt))}</td><td><a href="${escapeHtml(
            bookmark.url
          )}">${escapeHtml(bookmark.title)}</a>${source}</td><td>${escapeHtml(
            bookmark.description
          )}</td><td>${preview}</td></tr>`;
        })
        .join("\n")}\n</table>`
    : "No bookmarks yet. Use the studio to research and publish your first reading recommendation.";

  return `# Bookmarks\n\nA running table of links worth another pass. Every row is enriched through OpenCode before it gets published.\n\n${table}\n`;
}

export function renderWorkflowPage() {
  return `# Publishing workflow\n\n## Desktop authoring\n\n- Write a post in the Electron studio and the app saves it into \`content/posts.json\` plus a Writerside topic file.\n- Paste a bookmark and the app asks OpenCode for a title, thumbnail, source, and short description.\n- Generated landing pages stay in sync through the shared content generator.\n\n## GitHub delivery\n\n- The studio stages the affected files, creates a focused commit, and pushes the branch.\n- A GitHub Actions workflow builds the \`Writerside/hi\` instance and deploys it to GitHub Pages.\n\n## Manual maintenance\n\n- Run \`npm run sync\` if you edit the JSON content directly and want to regenerate the Writerside pages.\n- Run \`npm run check\` and \`npm test\` before committing larger structural changes to the studio.\n`;
}

export function renderInstanceTree(posts) {
  const postNodes = posts
    .map((post) => `        <toc-element topic="${post.topicPath}"/>`)
    .join("\n");

  const childrenBlock = postNodes ? `\n${postNodes}` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE instance-profile
        SYSTEM "https://resources.jetbrains.com/writerside/1.0/product-profile.dtd">

<instance-profile id="hi"
                 name="Signal & Static"
                 start-page="home.md">

    <toc-element topic="home.md"/>
    <toc-element topic="journal.md">${childrenBlock}
    </toc-element>
    <toc-element topic="bookmarks.md"/>
    <toc-element topic="workflow.md"/>
</instance-profile>
`;
}

export async function syncGeneratedContent({ posts, bookmarks }) {
  const changedFiles = [];

  const generatedFiles = [
    [HOME_TOPIC_FILE, renderHomePage(posts, bookmarks)],
    [JOURNAL_TOPIC_FILE, renderJournalPage(posts)],
    [BOOKMARKS_TOPIC_FILE, renderBookmarksPage(bookmarks)],
    [WORKFLOW_TOPIC_FILE, renderWorkflowPage()],
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

export function createPostRecord({ title, summary, body, tags, slug, publishedAt }) {
  return {
    slug,
    title: title.trim(),
    summary: summary.trim() || summarize(body),
    body: normalizeBody(body),
    tags,
    publishedAt,
    topicPath: `posts/${slug}.md`
  };
}
