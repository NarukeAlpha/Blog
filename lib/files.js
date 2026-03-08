import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readTextFile(filePath) {
  return readFile(filePath, "utf8");
}

export async function writeTextFileIfChanged(filePath, content) {
  let current = null;

  try {
    current = await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
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

export async function readJsonFile(filePath, fallback) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

export async function writeJsonFileIfChanged(filePath, value) {
  return writeTextFileIfChanged(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
