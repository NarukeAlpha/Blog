import { ensureContentFiles, readBookmarks, readPosts } from "../lib/content.js";
import { syncGeneratedContent } from "../lib/writerside.js";

await ensureContentFiles();

const posts = await readPosts();
const bookmarks = await readBookmarks();
const changedFiles = await syncGeneratedContent({ posts, bookmarks });

console.log(`Synced Writerside content for ${posts.length} post(s) and ${bookmarks.length} bookmark(s).`);

if (changedFiles.length) {
  console.log(changedFiles.join("\n"));
}
