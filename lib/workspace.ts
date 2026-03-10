import { mkdir } from "node:fs/promises";

import { BOOKMARK_THUMBNAILS_DIR, THUMBNAILS_DIR } from "./paths";

export async function ensureWorkspaceDirectories() {
  await mkdir(THUMBNAILS_DIR, { recursive: true });
  await mkdir(BOOKMARK_THUMBNAILS_DIR, { recursive: true });
}
