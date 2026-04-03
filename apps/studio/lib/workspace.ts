import { mkdir } from "node:fs/promises";

import { getStudioPaths } from "./paths";

export async function ensureStudioDirectories() {
  const { cacheDir, thumbnailsDir, bookmarkThumbnailsDir, userDataDir } = getStudioPaths();

  await mkdir(userDataDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });
  await mkdir(thumbnailsDir, { recursive: true });
  await mkdir(bookmarkThumbnailsDir, { recursive: true });
}
