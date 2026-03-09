import { mkdir } from "node:fs/promises";

import { readJsonFile, writeJsonFileIfChanged } from "./files";
import { BOOKMARKS_DATA_FILE, CONTENT_DIR, POSTS_DATA_FILE, POSTS_DIR, TOPICS_DIR } from "./paths";
import type { BookmarkRecord, PostRecord } from "./types";

export async function ensureContentFiles() {
  await mkdir(CONTENT_DIR, { recursive: true });
  await mkdir(TOPICS_DIR, { recursive: true });
  await mkdir(POSTS_DIR, { recursive: true });

  const posts = await readJsonFile<PostRecord[]>(POSTS_DATA_FILE, []);
  const bookmarks = await readJsonFile<BookmarkRecord[]>(BOOKMARKS_DATA_FILE, []);

  await writeJsonFileIfChanged(POSTS_DATA_FILE, posts);
  await writeJsonFileIfChanged(BOOKMARKS_DATA_FILE, bookmarks);
}

export async function readPosts() {
  return readJsonFile<PostRecord[]>(POSTS_DATA_FILE, []);
}

export async function writePosts(posts: PostRecord[]) {
  await writeJsonFileIfChanged(POSTS_DATA_FILE, posts);
}

export async function readBookmarks() {
  return readJsonFile<BookmarkRecord[]>(BOOKMARKS_DATA_FILE, []);
}

export async function writeBookmarks(bookmarks: BookmarkRecord[]) {
  await writeJsonFileIfChanged(BOOKMARKS_DATA_FILE, bookmarks);
}
