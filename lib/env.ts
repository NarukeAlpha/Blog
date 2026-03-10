import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ROOT_DIR } from "./paths";

function parseEnvValue(rawValue: string) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return "";
  }

  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(fileName: string) {
  const filePath = path.join(ROOT_DIR, fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!key || key in process.env) {
      continue;
    }

    const value = trimmed.slice(separatorIndex + 1);
    process.env[key] = parseEnvValue(value);
  }
}

export function loadWorkspaceEnv() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
}
