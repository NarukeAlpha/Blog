export function requireStudioWriteKey(writeKey: string) {
  const expected = String(process.env.STUDIO_WRITE_KEY || "").trim();
  const provided = String(writeKey || "").trim();

  if (!expected) {
    throw new Error("STUDIO_WRITE_KEY is not configured for this Convex deployment.");
  }

  if (!provided || provided !== expected) {
    throw new Error("Invalid studio write key.");
  }
}
