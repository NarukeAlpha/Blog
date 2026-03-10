export function assertStudioWriteKey(apiKey: string) {
  const expected = process.env.STUDIO_WRITE_KEY;

  if (!expected) {
    throw new Error("STUDIO_WRITE_KEY is missing from the Convex deployment.");
  }

  if (apiKey !== expected) {
    throw new Error("Studio write access was rejected.");
  }
}
