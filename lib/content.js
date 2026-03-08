import { mkdir } from "node:fs/promises";

import { writeJsonFileIfChanged, readJsonFile } from "./files.js";
import {
  BOOKMARKS_DATA_FILE,
  CONTENT_DIR,
  POSTS_DATA_FILE,
  POSTS_DIR,
  TOPICS_DIR
} from "./paths.js";

export async function ensureContentFiles() {
  await mkdir(CONTENT_DIR, { recursive: true });
  await mkdir(TOPICS_DIR, { recursive: true });
  await mkdir(POSTS_DIR, { recursive: true });

  const posts = await readJsonFile(POSTS_DATA_FILE, []);
  const bookmarks = await readJsonFile(BOOKMARKS_DATA_FILE, []);

  await writeJsonFileIfChanged(POSTS_DATA_FILE, posts);
  await writeJsonFileIfChanged(BOOKMARKS_DATA_FILE, bookmarks);
}

export async function readPosts() {
  return readJsonFile(POSTS_DATA_FILE, []);
}

export async function writePosts(posts) {
  await writeJsonFileIfChanged(POSTS_DATA_FILE, posts);
}

export async function readBookmarks() {
  return readJsonFile(BOOKMARKS_DATA_FILE, []);
}

export async function writeBookmarks(bookmarks) {
  await writeJsonFileIfChanged(BOOKMARKS_DATA_FILE, bookmarks);
}
