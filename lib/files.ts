import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

export async function readTextFile(filePath: string) {
  return readFile(filePath, "utf8");
}

export async function writeTextFileIfChanged(filePath: string, content: string) {
  let current: string | null = null;

  try {
    current = await readFile(filePath, "utf8");
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  if (current === content) {
    return false;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return true;
}

export async function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

export async function writeJsonFileIfChanged(filePath: string, value: unknown) {
  return writeTextFileIfChanged(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
