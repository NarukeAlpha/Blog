import { spawn, type ChildProcess } from "node:child_process";

import { createOpencodeClient, type Part } from "@opencode-ai/sdk/v2/client";

import { DEFAULT_OPENCODE_BASE_URL, getStudioPaths } from "./paths";
import { getStudioRuntimeSettings } from "./settings";
import { isRecord } from "@shared/lib";
import type { BookmarkResearchResult, OpencodeServerStatus } from "@shared/types";

interface HealthResponse {
  healthy?: boolean;
}

interface SessionInfoResponse {
  id: string;
}

interface SessionStatusResponse {
  type?: string;
}

interface PromptErrorResponse {
  message?: string;
  data?: {
    message?: string;
  };
}

interface BookmarkStructuredOutput {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  source?: string;
}

interface PromptResponse {
  info?: {
    role?: string;
    error?: PromptErrorResponse;
    structured?: unknown;
    structured_output?: unknown;
  };
  parts?: Array<Part | unknown>;
}

interface SessionMessageRecord extends PromptResponse {
  info?: PromptResponse["info"] & {
    role?: string;
  };
}

let opencodeProcess: ChildProcess | null = null;
let startupPromise: Promise<OpencodeServerStatus> | null = null;

const BOOKMARK_DESCRIPTION_MAX_LENGTH = 50;
const BOOKMARK_WEBFETCH_TIMEOUT_SECONDS = 30;
const BOOKMARK_RESPONSE_POLL_INTERVAL_MS = 1000;
const BOOKMARK_RESPONSE_TIMEOUT_MS = 60000;

const BOOKMARK_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Human-readable page title for the bookmark"
    },
    description: {
      type: "string",
      maxLength: BOOKMARK_DESCRIPTION_MAX_LENGTH,
      description: "Plain-text description of what the link is, 50 characters or fewer"
    },
    thumbnailUrl: {
      type: "string",
      description: "Absolute URL for a representative thumbnail image. Use an empty string if none is available"
    },
    source: {
      type: "string",
      description: "Publication, product, or site name"
    }
  },
  required: ["title", "description", "thumbnailUrl", "source"]
};

async function getOpencodeConfig() {
  const settings = await getStudioRuntimeSettings();

  return {
    baseUrl: settings.opencodeBaseUrl || DEFAULT_OPENCODE_BASE_URL,
    command: settings.opencodeCommand.trim(),
    providerID: settings.opencodeProviderId.trim(),
    modelID: settings.opencodeModelId.trim()
  };
}

function getOpencodeClient(baseUrl: string) {
  return createOpencodeClient({
    baseUrl,
    throwOnError: true
  });
}

function getServerArguments(baseUrl: string) {
  try {
    const { hostname, port, protocol } = new URL(baseUrl);

    return [
      "serve",
      "--port",
      String(Number(port || (protocol === "https:" ? 443 : 80)) || 4096),
      "--hostname",
      hostname || "127.0.0.1"
    ];
  } catch {
    return ["serve", "--port", "4096", "--hostname", "127.0.0.1"];
  }
}

function unwrapResponseData(response: unknown) {
  if (isRecord(response) && "data" in response) {
    return response.data;
  }

  return response;
}

function parseHealthResponse(value: unknown): HealthResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.healthy !== "boolean" && typeof value.healthy !== "undefined") {
    return null;
  }

  return {
    healthy: value.healthy
  };
}

function parseSessionInfoResponse(value: unknown): SessionInfoResponse | null {
  const response = unwrapResponseData(value);

  if (!isRecord(response) || typeof response.id !== "string") {
    return null;
  }

  return {
    id: response.id
  };
}

function parseSessionStatusMap(value: unknown) {
  const response = unwrapResponseData(value);

  if (!isRecord(response)) {
    return {};
  }

  const statusMap: Record<string, SessionStatusResponse> = {};

  for (const [sessionID, entry] of Object.entries(response)) {
    if (!isRecord(entry)) {
      continue;
    }

    if (typeof entry.type === "string" || typeof entry.type === "undefined") {
      statusMap[sessionID] = { type: entry.type };
    }
  }

  return statusMap;
}

function isSessionMessageRecord(value: unknown): value is SessionMessageRecord {
  return isRecord(value);
}

function parseSessionMessages(value: unknown) {
  const response = unwrapResponseData(value);
  return Array.isArray(response) ? response.filter(isSessionMessageRecord) : [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeInlineText(value: string) {
  return String(value).replace(/\s+/g, " ").trim();
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "bookmark";
  }
}

export function truncateBookmarkDescription(value: string, maxLength = BOOKMARK_DESCRIPTION_MAX_LENGTH) {
  const normalized = normalizeInlineText(value);

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const clipped = lastSpace >= Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced.slice(0, maxLength);

  return clipped.trim().replace(/[\s.,;:!?-]+$/g, "");
}

function getDefaultBookmarkDescription(hostname: string) {
  return truncateBookmarkDescription(`Saved link from ${hostname}`);
}

function getPromptErrorMessage(error: unknown) {
  if (!isRecord(error)) {
    return "";
  }

  const directMessage = typeof error.message === "string" ? error.message.trim() : "";

  if (directMessage) {
    return directMessage;
  }

  if (isRecord(error.data) && typeof error.data.message === "string") {
    return error.data.message.trim();
  }

  return "";
}

function parseStructuredBookmarkMetadata(value: unknown): BookmarkStructuredOutput | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title : undefined;
  const description = typeof value.description === "string" ? value.description : undefined;
  const thumbnailUrl = typeof value.thumbnailUrl === "string" ? value.thumbnailUrl : undefined;
  const source = typeof value.source === "string" ? value.source : undefined;

  if (!title && !description && !thumbnailUrl && !source) {
    return null;
  }

  return {
    title,
    description,
    thumbnailUrl,
    source
  };
}

function parseJsonObject(text: string) {
  const normalized = text.trim();

  if (!normalized) {
    return null;
  }

  const withoutFence = normalized
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const objectStart = withoutFence.indexOf("{");
    const objectEnd = withoutFence.lastIndexOf("}");

    if (objectStart === -1 || objectEnd <= objectStart) {
      return null;
    }

    try {
      return JSON.parse(withoutFence.slice(objectStart, objectEnd + 1));
    } catch {
      return null;
    }
  }
}

function parseBookmarkMetadataFromParts(parts: Array<Part | unknown> | undefined) {
  if (!parts?.length) {
    return null;
  }

  const text = parts
    .map((part) => {
      if (!isRecord(part) || part.type !== "text" || typeof part.text !== "string") {
        return "";
      }

      return part.text;
    })
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    return null;
  }

  return parseStructuredBookmarkMetadata(parseJsonObject(text));
}

export function extractBookmarkStructuredMetadata(response: PromptResponse | null | undefined) {
  const info = response?.info;

  return (
    parseStructuredBookmarkMetadata(info?.structured) ||
    parseStructuredBookmarkMetadata(info?.structured_output) ||
    parseBookmarkMetadataFromParts(response?.parts)
  );
}

export function normalizeBookmarkMetadata(url: string, metadata: BookmarkStructuredOutput | null | undefined) {
  const hostname = getHostname(url);
  const title = normalizeInlineText(String(metadata?.title || hostname)) || hostname;
  const source = normalizeInlineText(String(metadata?.source || hostname)) || hostname;
  const description =
    truncateBookmarkDescription(String(metadata?.description || "")) || getDefaultBookmarkDescription(hostname);
  const thumbnailCandidate = normalizeInlineText(String(metadata?.thumbnailUrl || ""));
  const thumbnailUrl = /^https?:\/\//.test(thumbnailCandidate) ? thumbnailCandidate : "";

  return {
    title,
    description,
    source,
    thumbnailUrl
  };
}

async function getHealth(baseUrl: string) {
  const response = await fetch(`${baseUrl}/global/health`);

  if (!response.ok) {
    return null;
  }

  return parseHealthResponse(await response.json().catch(() => null));
}

export async function isOpencodeConfigured() {
  return Boolean((await getOpencodeConfig()).command);
}

export async function isOpencodeHealthy() {
  try {
    const { baseUrl } = await getOpencodeConfig();
    const health = await getHealth(baseUrl);
    return Boolean(health?.healthy);
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl: string, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if ((await getHealth(baseUrl))?.healthy) {
        return true;
      }
    } catch {
      // The server is still starting up.
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  throw new Error("OpenCode server did not become healthy in time.");
}

export async function ensureOpencodeServer(): Promise<OpencodeServerStatus> {
  const { baseUrl, command } = await getOpencodeConfig();

  if (!command) {
    throw new Error("Bookmark research is disabled. Save an OpenCode command in Settings to enable it.");
  }

  if (await isOpencodeHealthy()) {
    return {
      endpoint: baseUrl,
      startedByApp: false
    };
  }

  if (startupPromise) {
    return startupPromise;
  }

  startupPromise = new Promise<OpencodeServerStatus>((resolve, reject) => {
    opencodeProcess = spawn(command, getServerArguments(baseUrl), {
      cwd: getStudioPaths().userDataDir,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    let settled = false;

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    opencodeProcess.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    opencodeProcess.on("error", (error) => {
      opencodeProcess = null;

      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        fail(new Error("Bookmark research needs the OpenCode CLI. Install it or point Settings at the executable."));
        return;
      }

      fail(error);
    });

    opencodeProcess.on("exit", (code) => {
      if (!settled && code !== 0) {
        fail(new Error(stderr.trim() || `OpenCode exited with code ${code}.`));
      }

      opencodeProcess = null;
    });

    void waitForServer(baseUrl)
      .then(() => {
        if (settled) {
          return;
        }

        settled = true;
        resolve({
          endpoint: baseUrl,
          startedByApp: true
        });
      })
      .catch((error: Error) => {
        fail(new Error(stderr.trim() ? `${error.message} ${stderr.trim()}` : error.message));
      });
  });

  try {
    return await startupPromise;
  } finally {
    startupPromise = null;
  }
}

export function buildBookmarkPrompt(url: string, note: string) {
  const noteBlock = note ? `\nAdditional context from the user: ${note}\n` : "\n";

  return `Investigate this bookmark for a personal reading queue.${noteBlock}
URL: ${url}

Use the webfetch tool exactly once on the URL above before answering. Base the result on the fetched page, not prior knowledge.

Return accurate structured metadata only.
Rules:
- Fetch the exact URL above with webfetch before answering.
- Set webfetch format to html.
- Set webfetch timeout to ${BOOKMARK_WEBFETCH_TIMEOUT_SECONDS} seconds.
- Prefer the page's canonical title.
- Use the site, publication, or product name for source.
- If the page exposes an image, prefer an absolute Open Graph image URL.
- The description must be plain text, describe what the link is, and stay within ${BOOKMARK_DESCRIPTION_MAX_LENGTH} characters.
- Use an empty string for thumbnailUrl when no suitable absolute image URL is available.
- Do not invent unavailable details or include extra prose outside the structured response.`;
}

async function resolveBookmarkMetadata(sessionID: string, baseUrl: string) {
  const client = getOpencodeClient(baseUrl);
  const startedAt = Date.now();
  let lastAssistantError = "";

  while (Date.now() - startedAt < BOOKMARK_RESPONSE_TIMEOUT_MS) {
    const messages = parseSessionMessages(await client.session.messages({ sessionID, limit: 20 }));

    const assistantMessages = messages.filter((message) => message.info?.role === "assistant");

    for (const message of assistantMessages.slice().reverse()) {
      const assistantError = getPromptErrorMessage(message.info?.error);

      if (assistantError) {
        lastAssistantError = assistantError;
        continue;
      }

      const structured = extractBookmarkStructuredMetadata(message);

      if (structured) {
        return structured;
      }
    }

    if (lastAssistantError) {
      throw new Error(lastAssistantError);
    }

    const statusMap = parseSessionStatusMap(await client.session.status({}));
    const sessionStatus = statusMap[sessionID];

    if (sessionStatus?.type === "idle" && assistantMessages.length > 0) {
      break;
    }

    await sleep(BOOKMARK_RESPONSE_POLL_INTERVAL_MS);
  }

  return null;
}

export async function researchBookmark(url: string, note = ""): Promise<BookmarkResearchResult> {
  const server = await ensureOpencodeServer();
  const { providerID, modelID } = await getOpencodeConfig();
  const client = getOpencodeClient(server.endpoint);
  const createdSession = parseSessionInfoResponse(await client.session.create({ title: `Bookmark research: ${url}` }));

  if (!createdSession?.id) {
    throw new Error("OpenCode could not create a bookmark session.");
  }

  await client.session.promptAsync({
    sessionID: createdSession.id,
    agent: "build",
    model: {
      providerID,
      modelID
    },
    parts: [{ type: "text", text: buildBookmarkPrompt(url, note) }],
    format: {
      type: "json_schema",
      retryCount: 2,
      schema: BOOKMARK_RESPONSE_SCHEMA
    }
  });

  const structured = await resolveBookmarkMetadata(createdSession.id, server.endpoint);

  if (!structured) {
    throw new Error("OpenCode did not return bookmark metadata before timing out.");
  }

  const { title, description, source, thumbnailUrl } = normalizeBookmarkMetadata(url, structured);

  return {
    ...server,
    title,
    description,
    source,
    thumbnailUrl
  };
}

export function shutdownOpencodeServer() {
  if (opencodeProcess && !opencodeProcess.killed) {
    opencodeProcess.kill();
  }

  opencodeProcess = null;
}
