import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

import type { SaveStudioSettingsPayload, StudioEnvironment, StudioSettings } from "@shared/types";
import {
  DEFAULT_OPENCODE_BASE_URL,
  DEFAULT_OPENCODE_COMMAND,
  DEFAULT_OPENCODE_MODEL_ID,
  DEFAULT_OPENCODE_PROVIDER_ID,
  getStudioPaths
} from "./paths";
import { ensureStudioDirectories } from "./workspace";

const require = createRequire(import.meta.url);

interface StoredStudioEnvironmentSettings {
  convexUrl?: string;
  convexSiteUrl?: string;
  publicSiteUrl?: string;
  encryptedDeployKey?: string;
  plaintextDeployKey?: string;
}

interface StoredStudioSettings {
  version: number;
  selectedEnvironment?: StudioEnvironment;
  environments?: Partial<Record<StudioEnvironment, StoredStudioEnvironmentSettings>>;
  opencodeCommand?: string;
  opencodeBaseUrl?: string;
  opencodeProviderId?: string;
  opencodeModelId?: string;
  convexUrl?: string;
  publicSiteUrl?: string;
  encryptedDeployKey?: string;
  plaintextDeployKey?: string;
  encryptedWriteKey?: string;
  plaintextWriteKey?: string;
}

interface StudioRuntimeEnvironmentSettings {
  convexUrl: string;
  convexSiteUrl: string;
  publicSiteUrl: string;
  deployKey: string;
}

export interface StudioRuntimeSettings {
  selectedEnvironment: StudioEnvironment;
  environments: Record<StudioEnvironment, StudioRuntimeEnvironmentSettings>;
  opencodeCommand: string;
  opencodeBaseUrl: string;
  opencodeProviderId: string;
  opencodeModelId: string;
}

interface EnvironmentDefaults {
  convexUrl: string;
  convexSiteUrl: string;
  publicSiteUrl: string;
  deployKey: string;
}

const SETTINGS_VERSION = 2;
const STUDIO_ENVIRONMENTS: StudioEnvironment[] = ["dev", "prod"];

function getSafeStorage() {
  try {
    const electronModule = require("electron") as {
      safeStorage?: {
        isEncryptionAvailable: () => boolean;
        encryptString: (value: string) => Buffer;
        decryptString: (value: Buffer) => string;
      };
    };

    return electronModule.safeStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEnvironment(value: unknown): StudioEnvironment | null {
  return value === "dev" || value === "prod" ? value : null;
}

function readEnvironmentVariable(name: string) {
  return normalizeString(process.env[name]);
}

function getEnvironmentPrefix(environment: StudioEnvironment) {
  return environment === "dev" ? "STUDIO_DEV" : "STUDIO_PROD";
}

function readEnvironmentDefaults(environment: StudioEnvironment): EnvironmentDefaults {
  const prefix = getEnvironmentPrefix(environment);

  return {
    convexUrl: readEnvironmentVariable(`${prefix}_CONVEX_URL`),
    convexSiteUrl: readEnvironmentVariable(`${prefix}_CONVEX_SITE_URL`),
    publicSiteUrl: readEnvironmentVariable(`${prefix}_PUBLIC_SITE_URL`),
    deployKey: readEnvironmentVariable(`${prefix}_WRITE_KEY`)
  };
}

function hasConfiguredEnvironment(defaults: EnvironmentDefaults) {
  return Boolean(defaults.convexUrl || defaults.convexSiteUrl || defaults.publicSiteUrl || defaults.deployKey);
}

function getEnvironmentDefaults() {
  const legacyProdDefaults: EnvironmentDefaults = {
    convexUrl: normalizeString(process.env.CONVEX_URL || process.env.VITE_CONVEX_URL),
    convexSiteUrl: normalizeString(process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_SITE_URL),
    publicSiteUrl: normalizeString(process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL),
    deployKey: normalizeString(process.env.STUDIO_WRITE_KEY || process.env.CONVEX_DEPLOY_KEY)
  };
  const prodDefaults = readEnvironmentDefaults("prod");
  const defaults = {
    environments: {
      dev: readEnvironmentDefaults("dev"),
      prod: {
        convexUrl: prodDefaults.convexUrl || legacyProdDefaults.convexUrl,
        convexSiteUrl: prodDefaults.convexSiteUrl || legacyProdDefaults.convexSiteUrl,
        publicSiteUrl: prodDefaults.publicSiteUrl || legacyProdDefaults.publicSiteUrl,
        deployKey: prodDefaults.deployKey || legacyProdDefaults.deployKey
      }
    },
    opencodeCommand: normalizeString(process.env.OPENCODE_COMMAND) || DEFAULT_OPENCODE_COMMAND,
    opencodeBaseUrl: normalizeString(process.env.OPENCODE_BASE_URL) || DEFAULT_OPENCODE_BASE_URL,
    opencodeProviderId: normalizeString(process.env.OPENCODE_PROVIDER_ID) || DEFAULT_OPENCODE_PROVIDER_ID,
    opencodeModelId: normalizeString(process.env.OPENCODE_MODEL_ID) || DEFAULT_OPENCODE_MODEL_ID
  };
  const configuredEnvironment = normalizeEnvironment(process.env.STUDIO_ENVIRONMENT);

  return {
    ...defaults,
    selectedEnvironment:
      configuredEnvironment
      || (hasConfiguredEnvironment(defaults.environments.dev)
        ? "dev"
        : hasConfiguredEnvironment(defaults.environments.prod)
          ? "prod"
          : "dev")
  };
}

async function readStoredSettings() {
  const { settingsFile } = getStudioPaths();

  try {
    const raw = await readFile(settingsFile, "utf8");
    const parsed = JSON.parse(raw) as StoredStudioSettings;

    return isRecord(parsed) ? parsed : { version: SETTINGS_VERSION };
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

function resolveRequiredString(storedValue: unknown, fallback: string) {
  const resolved = resolveStoredString(storedValue, fallback);
  return resolved || fallback;
}

function decodeStoredSecret(storedValue: string | undefined) {
  const safeStorage = getSafeStorage();

  if (typeof storedValue !== "string") {
    return null;
  }

  if (!storedValue) {
    return "";
  }

  try {
    if (safeStorage?.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(storedValue, "base64")).trim();
    }
  } catch {
    return "";
  }

  return null;
}

function getStoredEnvironmentSettings(stored: StoredStudioSettings, environment: StudioEnvironment) {
  const environments = isRecord(stored.environments) ? stored.environments : null;
  const entry = environments?.[environment];
  return isRecord(entry) ? (entry as StoredStudioEnvironmentSettings) : null;
}

function decodeLegacyDeployKey(stored: StoredStudioSettings, fallback: string) {
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

function decodeStoredDeployKey(stored: StoredStudioSettings, environment: StudioEnvironment, fallback: string) {
  const entry = getStoredEnvironmentSettings(stored, environment);
  const encryptedDeployKey = decodeStoredSecret(entry?.encryptedDeployKey);

  if (encryptedDeployKey !== null) {
    return encryptedDeployKey;
  }

  if (typeof entry?.plaintextDeployKey === "string") {
    return entry.plaintextDeployKey.trim();
  }

  if (environment === "prod") {
    return decodeLegacyDeployKey(stored, fallback);
  }

  return fallback;
}

function toRuntimeSettings(stored: StoredStudioSettings): StudioRuntimeSettings {
  const defaults = getEnvironmentDefaults();
  const hasLegacyProductionSettings = Boolean(stored.convexUrl || stored.publicSiteUrl || stored.encryptedDeployKey || stored.plaintextDeployKey || stored.encryptedWriteKey || stored.plaintextWriteKey);

  return {
    selectedEnvironment: normalizeEnvironment(stored.selectedEnvironment) || (hasLegacyProductionSettings ? "prod" : defaults.selectedEnvironment),
    environments: {
      dev: {
        convexUrl: resolveStoredString(getStoredEnvironmentSettings(stored, "dev")?.convexUrl, defaults.environments.dev.convexUrl),
        convexSiteUrl: resolveStoredString(getStoredEnvironmentSettings(stored, "dev")?.convexSiteUrl, defaults.environments.dev.convexSiteUrl),
        publicSiteUrl: resolveStoredString(getStoredEnvironmentSettings(stored, "dev")?.publicSiteUrl, defaults.environments.dev.publicSiteUrl),
        deployKey: decodeStoredDeployKey(stored, "dev", defaults.environments.dev.deployKey)
      },
      prod: {
        convexUrl: resolveStoredString(getStoredEnvironmentSettings(stored, "prod")?.convexUrl ?? stored.convexUrl, defaults.environments.prod.convexUrl),
        convexSiteUrl: resolveStoredString(getStoredEnvironmentSettings(stored, "prod")?.convexSiteUrl, defaults.environments.prod.convexSiteUrl),
        publicSiteUrl: resolveStoredString(getStoredEnvironmentSettings(stored, "prod")?.publicSiteUrl ?? stored.publicSiteUrl, defaults.environments.prod.publicSiteUrl),
        deployKey: decodeStoredDeployKey(stored, "prod", defaults.environments.prod.deployKey)
      }
    },
    opencodeCommand: resolveStoredString(stored.opencodeCommand, defaults.opencodeCommand),
    opencodeBaseUrl: resolveStoredString(stored.opencodeBaseUrl, defaults.opencodeBaseUrl),
    opencodeProviderId: resolveRequiredString(stored.opencodeProviderId, defaults.opencodeProviderId),
    opencodeModelId: resolveRequiredString(stored.opencodeModelId, defaults.opencodeModelId)
  };
}

function toPublicSettings(settings: StudioRuntimeSettings): StudioSettings {
  return {
    selectedEnvironment: settings.selectedEnvironment,
    environments: {
      dev: {
        convexUrl: settings.environments.dev.convexUrl,
        convexSiteUrl: settings.environments.dev.convexSiteUrl,
        publicSiteUrl: settings.environments.dev.publicSiteUrl,
        deployKeyConfigured: Boolean(settings.environments.dev.deployKey)
      },
      prod: {
        convexUrl: settings.environments.prod.convexUrl,
        convexSiteUrl: settings.environments.prod.convexSiteUrl,
        publicSiteUrl: settings.environments.prod.publicSiteUrl,
        deployKeyConfigured: Boolean(settings.environments.prod.deployKey)
      }
    },
    opencodeCommand: settings.opencodeCommand,
    opencodeBaseUrl: settings.opencodeBaseUrl,
    opencodeProviderId: settings.opencodeProviderId,
    opencodeModelId: settings.opencodeModelId
  };
}

function normalizeSavePayload(payload: SaveStudioSettingsPayload | null | undefined) {
  return payload && typeof payload === "object" ? payload : {};
}

function normalizeClearDeployKeys(clearDeployKeys: unknown) {
  if (!Array.isArray(clearDeployKeys)) {
    return new Set<StudioEnvironment>();
  }

  return new Set(clearDeployKeys.map((entry) => normalizeEnvironment(entry)).filter((entry): entry is StudioEnvironment => entry !== null));
}

function getEnvironmentPayload(payload: SaveStudioSettingsPayload, environment: StudioEnvironment) {
  if (!isRecord(payload.environments)) {
    return null;
  }

  const entry = payload.environments[environment];
  return isRecord(entry) ? entry : null;
}

function encodeDeployKey(deployKey: string) {
  const safeStorage = getSafeStorage();

  if (!deployKey) {
    return {
      encryptedDeployKey: "",
      plaintextDeployKey: ""
    };
  }

  if (safeStorage?.isEncryptionAvailable()) {
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

export async function getActiveStudioRuntimeSettings() {
  const settings = await getStudioRuntimeSettings();
  return {
    environment: settings.selectedEnvironment,
    ...settings.environments[settings.selectedEnvironment]
  };
}

export async function getStudioSettings() {
  return toPublicSettings(await getStudioRuntimeSettings());
}

export async function saveStudioSettings(payload: SaveStudioSettingsPayload) {
  const input = normalizeSavePayload(payload);
  const current = await getStudioRuntimeSettings();
  const clearDeployKeys = normalizeClearDeployKeys(input.clearDeployKeys);
  const nextSettings: StudioRuntimeSettings = {
    selectedEnvironment: normalizeEnvironment(input.selectedEnvironment) || current.selectedEnvironment,
    environments: {
      dev: { ...current.environments.dev },
      prod: { ...current.environments.prod }
    },
    opencodeCommand: typeof input.opencodeCommand === "string" ? input.opencodeCommand.trim() : current.opencodeCommand,
    opencodeBaseUrl: typeof input.opencodeBaseUrl === "string" ? input.opencodeBaseUrl.trim() : current.opencodeBaseUrl,
    opencodeProviderId: typeof input.opencodeProviderId === "string" ? input.opencodeProviderId.trim() : current.opencodeProviderId,
    opencodeModelId: typeof input.opencodeModelId === "string" ? input.opencodeModelId.trim() : current.opencodeModelId
  };

  for (const environment of STUDIO_ENVIRONMENTS) {
    const currentEnvironment = current.environments[environment];
    const environmentInput = getEnvironmentPayload(input, environment);
    const providedDeployKey = typeof environmentInput?.deployKey === "string" ? environmentInput.deployKey.trim() : "";

    nextSettings.environments[environment] = {
      convexUrl: typeof environmentInput?.convexUrl === "string" ? environmentInput.convexUrl.trim() : currentEnvironment.convexUrl,
      convexSiteUrl: typeof environmentInput?.convexSiteUrl === "string" ? environmentInput.convexSiteUrl.trim() : currentEnvironment.convexSiteUrl,
      publicSiteUrl: typeof environmentInput?.publicSiteUrl === "string" ? environmentInput.publicSiteUrl.trim() : currentEnvironment.publicSiteUrl,
      deployKey: clearDeployKeys.has(environment)
        ? ""
        : providedDeployKey || currentEnvironment.deployKey
    };
  }

  const nextStored: StoredStudioSettings = {
    version: SETTINGS_VERSION,
    selectedEnvironment: nextSettings.selectedEnvironment,
    environments: {
      dev: {
        convexUrl: nextSettings.environments.dev.convexUrl,
        convexSiteUrl: nextSettings.environments.dev.convexSiteUrl,
        publicSiteUrl: nextSettings.environments.dev.publicSiteUrl,
        ...encodeDeployKey(nextSettings.environments.dev.deployKey)
      },
      prod: {
        convexUrl: nextSettings.environments.prod.convexUrl,
        convexSiteUrl: nextSettings.environments.prod.convexSiteUrl,
        publicSiteUrl: nextSettings.environments.prod.publicSiteUrl,
        ...encodeDeployKey(nextSettings.environments.prod.deployKey)
      }
    },
    opencodeCommand: nextSettings.opencodeCommand,
    opencodeBaseUrl: nextSettings.opencodeBaseUrl,
    opencodeProviderId: nextSettings.opencodeProviderId,
    opencodeModelId: nextSettings.opencodeModelId
  };

  await ensureStudioDirectories();
  await writeFile(getStudioPaths().settingsFile, `${JSON.stringify(nextStored, null, 2)}\n`, "utf8");

  return toPublicSettings(nextSettings);
}
