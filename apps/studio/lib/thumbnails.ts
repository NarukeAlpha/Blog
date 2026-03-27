import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { BOOKMARK_THUMBNAILS_DIR, ROOT_DIR } from "./paths";
import { ensureWorkspaceDirectories } from "./workspace";

const KNOWN_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"]);

export function getImageExtension(contentType: string | null, sourceUrl: string) {
  const normalizedContentType = String(contentType || "").toLowerCase();

  if (normalizedContentType.startsWith("image/")) {
    const extension = normalizedContentType.split("/")[1]?.split(";")[0]?.replace("svg+xml", "svg") || "png";
    return extension === "jpeg" ? "jpg" : extension;
  }

  try {
    const pathname = new URL(sourceUrl).pathname;
    const extension = path.extname(pathname).replace(/^\./, "").toLowerCase();

    if (KNOWN_IMAGE_EXTENSIONS.has(extension)) {
      return extension === "jpeg" ? "jpg" : extension;
    }
  } catch {
    // noop
  }

  return "png";
}

export async function mirrorThumbnailToPublic(sourceUrl: string) {
  if (!sourceUrl) {
    return null;
  }

  const response = await fetch(sourceUrl);

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type");

  if (contentType && !contentType.toLowerCase().startsWith("image/")) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const extension = getImageExtension(contentType, sourceUrl);
  const fileName = `${createHash("sha1").update(sourceUrl).digest("hex").slice(0, 16)}.${extension}`;

  await ensureWorkspaceDirectories();

  const filePath = path.join(BOOKMARK_THUMBNAILS_DIR, fileName);
  await writeFile(filePath, buffer);

  return path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
}
