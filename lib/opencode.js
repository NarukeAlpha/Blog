import { spawn } from "node:child_process";

import { createOpencodeClient } from "@opencode-ai/sdk";

import { OPENCODE_BASE_URL, OPENCODE_PORT, ROOT_DIR } from "./paths.js";

let opencodeProcess = null;
let startupPromise = null;

const client = createOpencodeClient({
  baseUrl: OPENCODE_BASE_URL,
  throwOnError: true
});

function unwrap(response) {
  if (response && typeof response === "object" && "data" in response && response.data) {
    return response.data;
  }

  return response;
}

async function getHealth() {
  const response = await fetch(`${OPENCODE_BASE_URL}/global/health`);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function isOpencodeHealthy() {
  try {
    const health = await getHealth();
    return Boolean(health?.healthy);
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isOpencodeHealthy()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  throw new Error("OpenCode server did not become healthy in time.");
}

export async function ensureOpencodeServer() {
  if (await isOpencodeHealthy()) {
    return {
      endpoint: OPENCODE_BASE_URL,
      startedByApp: false
    };
  }

  if (startupPromise) {
    return startupPromise;
  }

  startupPromise = new Promise((resolve, reject) => {
    opencodeProcess = spawn("opencode", ["serve", "--port", String(OPENCODE_PORT), "--hostname", "127.0.0.1"], {
      cwd: ROOT_DIR,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    opencodeProcess.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    opencodeProcess.on("error", (error) => {
      opencodeProcess = null;
      fail(error);
    });

    opencodeProcess.on("exit", (code) => {
      if (!settled && code !== 0) {
        fail(new Error(stderr.trim() || `OpenCode exited with code ${code}.`));
      }

      opencodeProcess = null;
    });

    waitForServer()
      .then(() => {
        if (settled) {
          return;
        }

        settled = true;
        resolve({
          endpoint: OPENCODE_BASE_URL,
          startedByApp: true
        });
      })
      .catch((error) => {
        fail(new Error(stderr.trim() ? `${error.message} ${stderr.trim()}` : error.message));
      });
  });

  try {
    return await startupPromise;
  } finally {
    startupPromise = null;
  }
}

function buildBookmarkPrompt(url, note) {
  const noteBlock = note ? `\nAdditional context from the user: ${note}\n` : "\n";

  return `Investigate this bookmark for a personal reading queue.${noteBlock}
URL: ${url}

Return accurate metadata only. Prefer the page's canonical title and site/source name. If the page exposes an image, prefer the absolute Open Graph image URL. Keep the description to one or two concise sentences and do not invent unavailable details.`;
}

export async function researchBookmark(url, note = "") {
  const server = await ensureOpencodeServer();
  const createdSession = unwrap(
    await client.session.create({
      body: {
        title: `Bookmark research: ${url}`
      }
    })
  );

  const response = unwrap(
    await client.session.prompt({
      path: { id: createdSession.id },
      body: {
        parts: [{ type: "text", text: buildBookmarkPrompt(url, note) }],
        format: {
          type: "json_schema",
          retryCount: 2,
          schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Human-readable page title for the bookmark"
              },
              description: {
                type: "string",
                description: "One or two concise sentences that explain why the link is worth reading"
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
          }
        }
      }
    })
  );

  if (response?.info?.error) {
    throw new Error(response.info.error.message || "OpenCode could not generate bookmark metadata.");
  }

  const structured = response?.info?.structured_output;

  if (!structured) {
    throw new Error("OpenCode did not return structured bookmark metadata.");
  }

  let hostname = "bookmark";

  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // noop
  }

  const title = String(structured.title || hostname).trim();
  const description = String(structured.description || `A saved link from ${hostname}.`).trim();
  const source = String(structured.source || hostname).trim();
  const thumbnailUrl = /^https?:\/\//.test(String(structured.thumbnailUrl || "").trim())
    ? String(structured.thumbnailUrl).trim()
    : "";

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
