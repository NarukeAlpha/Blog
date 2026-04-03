import { readFile, writeFile } from "node:fs/promises";

import { safeStorage } from "electron";

import type { SaveStudioSettingsPayload, StudioSettings } from "../../../packages/shared/src/types";
import { DEFAULT_OPENCODE_BASE_URL, DEFAULT_OPENCODE_COMMAND, getStudioPaths } from "./paths";
import { ensureStudioDirectories } from "./workspace";

interface StoredStudioSettings {
  version: number;
  convexUrl?: string;
  publicSiteUrl?: string;
  opencodeCommand?: string;
  opencodeBaseUrl?: string;
  encryptedDeployKey?: string;
  plaintextDeployKey?: string;
  encryptedWriteKey?: string;
  plaintextWriteKey?: string;
}

export interface StudioRuntimeSettings extends StudioSettings {
  deployKey: string;
}

const SETTINGS_VERSION = 1;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getEnvironmentDefaults() {
  return {
    convexUrl: normalizeString(process.env.CONVEX_URL || process.env.VITE_CONVEX_URL),
    publicSiteUrl: normalizeString(process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL),
    opencodeCommand: normalizeString(process.env.OPENCODE_COMMAND) || DEFAULT_OPENCODE_COMMAND,
    opencodeBaseUrl: normalizeString(process.env.OPENCODE_BASE_URL) || DEFAULT_OPENCODE_BASE_URL,
    deployKey: normalizeString(process.env.CONVEX_DEPLOY_KEY)
  };
}

async function readStoredSettings() {
  const { settingsFile } = getStudioPaths();

  try {
    const raw = await readFile(settingsFile, "utf8");
    const parsed = JSON.parse(raw) as StoredStudioSettings;

    return typeof parsed === "object" && parsed ? parsed : { version: SETTINGS_VERSION };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: SETTINGS_VERSION };
    }

    throw error;
  }
}

function resolveStoredString(storedValue: unknown, fallback: string) {
  return typeof storedValue === "string" ? storedValue.trim() : fallback;
}

function decodeStoredSecret(storedValue: string | undefined) {
  if (typeof storedValue !== "string") {
    return null;
  }

  if (!storedValue) {
    return "";
  }

  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(storedValue, "base64")).trim();
    }
  } catch {
    return "";
  }

  return null;
}

function decodeStoredDeployKey(stored: StoredStudioSettings, fallback: string) {
  const encryptedDeployKey = decodeStoredSecret(stored.encryptedDeployKey);

  if (encryptedDeployKey !== null) {
    return encryptedDeployKey;
  }

  if (typeof stored.plaintextDeployKey === "string") {
    return stored.plaintextDeployKey.trim();
  }

  const encryptedWriteKey = decodeStoredSecret(stored.encryptedWriteKey);

  if (encryptedWriteKey !== null) {
    return encryptedWriteKey;
  }

  if (typeof stored.plaintextWriteKey === "string") {
    return stored.plaintextWriteKey.trim();
  }

  return fallback;
}

function toRuntimeSettings(stored: StoredStudioSettings): StudioRuntimeSettings {
  const defaults = getEnvironmentDefaults();

  return {
    convexUrl: resolveStoredString(stored.convexUrl, defaults.convexUrl),
    publicSiteUrl: resolveStoredString(stored.publicSiteUrl, defaults.publicSiteUrl),
    opencodeCommand: resolveStoredString(stored.opencodeCommand, defaults.opencodeCommand),
    opencodeBaseUrl: resolveStoredString(stored.opencodeBaseUrl, defaults.opencodeBaseUrl),
    deployKey: decodeStoredDeployKey(stored, defaults.deployKey)
  };
}

function toPublicSettings(settings: StudioRuntimeSettings): StudioSettings {
  return {
    convexUrl: settings.convexUrl,
    publicSiteUrl: settings.publicSiteUrl,
    opencodeCommand: settings.opencodeCommand,
    opencodeBaseUrl: settings.opencodeBaseUrl
  };
}

function normalizeSavePayload(payload: SaveStudioSettingsPayload | null | undefined) {
  return payload && typeof payload === "object" ? payload : {};
}

function encodeDeployKey(deployKey: string) {
  if (!deployKey) {
    return {
      encryptedDeployKey: "",
      plaintextDeployKey: ""
    };
  }

  if (safeStorage.isEncryptionAvailable()) {
    return {
      encryptedDeployKey: safeStorage.encryptString(deployKey).toString("base64"),
      plaintextDeployKey: undefined
    };
  }

  return {
    encryptedDeployKey: undefined,
    plaintextDeployKey: deployKey
  };
}

export async function getStudioRuntimeSettings() {
  return toRuntimeSettings(await readStoredSettings());
}

export async function getStudioSettings() {
  return toPublicSettings(await getStudioRuntimeSettings());
}

export async function saveStudioSettings(payload: SaveStudioSettingsPayload) {
  const input = normalizeSavePayload(payload);
  const stored = await readStoredSettings();
  const current = toRuntimeSettings(stored);
  const nextDeployKey = input.clearDeployKey ? "" : typeof input.deployKey === "string" ? input.deployKey.trim() : current.deployKey;
  const encodedDeployKey = encodeDeployKey(nextDeployKey);

  const nextStored: StoredStudioSettings = {
    version: SETTINGS_VERSION,
    convexUrl: typeof input.convexUrl === "string" ? input.convexUrl.trim() : current.convexUrl,
    publicSiteUrl: typeof input.publicSiteUrl === "string" ? input.publicSiteUrl.trim() : current.publicSiteUrl,
    opencodeCommand: typeof input.opencodeCommand === "string" ? input.opencodeCommand.trim() : current.opencodeCommand,
    opencodeBaseUrl: typeof input.opencodeBaseUrl === "string" ? input.opencodeBaseUrl.trim() : current.opencodeBaseUrl,
    ...encodedDeployKey
  };

  await ensureStudioDirectories();
  await writeFile(getStudioPaths().settingsFile, `${JSON.stringify(nextStored, null, 2)}\n`, "utf8");

  return toPublicSettings({
    convexUrl: nextStored.convexUrl || "",
    publicSiteUrl: nextStored.publicSiteUrl || "",
    opencodeCommand: nextStored.opencodeCommand || "",
    opencodeBaseUrl: nextStored.opencodeBaseUrl || DEFAULT_OPENCODE_BASE_URL,
    deployKey: nextDeployKey
  });
}
