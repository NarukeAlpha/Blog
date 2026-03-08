import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..");
export const CONTENT_DIR = path.join(ROOT_DIR, "content");
export const WRITERSIDE_DIR = path.join(ROOT_DIR, "Writerside");
export const TOPICS_DIR = path.join(WRITERSIDE_DIR, "topics");
export const POSTS_DIR = path.join(TOPICS_DIR, "posts");

export const POSTS_DATA_FILE = path.join(CONTENT_DIR, "posts.json");
export const BOOKMARKS_DATA_FILE = path.join(CONTENT_DIR, "bookmarks.json");

export const HOME_TOPIC_FILE = path.join(TOPICS_DIR, "home.md");
export const JOURNAL_TOPIC_FILE = path.join(TOPICS_DIR, "journal.md");
export const BOOKMARKS_TOPIC_FILE = path.join(TOPICS_DIR, "bookmarks.md");
export const WORKFLOW_TOPIC_FILE = path.join(TOPICS_DIR, "workflow.md");
export const INSTANCE_TREE_FILE = path.join(WRITERSIDE_DIR, "hi.tree");

export const OPENCODE_PORT = 4096;
export const OPENCODE_BASE_URL = `http://127.0.0.1:${OPENCODE_PORT}`;
