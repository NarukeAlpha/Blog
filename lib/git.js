import path from "node:path";

import { ROOT_DIR } from "./paths.js";
import { runCommand } from "./exec.js";

function toRepoRelative(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
}

async function runGit(args) {
  return runCommand("git", args, { cwd: ROOT_DIR });
}

export async function isGitRepository() {
  try {
    const result = await runGit(["rev-parse", "--is-inside-work-tree"]);
    return result.stdout.trim() === "true";
  } catch {
    return false;
  }
}

async function hasUpstreamBranch() {
  try {
    await runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    return true;
  } catch {
    return false;
  }
}

async function getCurrentBranch() {
  const result = await runGit(["branch", "--show-current"]);
  return result.stdout.trim();
}

export async function publishFiles(filePaths, commitMessage) {
  if (!(await isGitRepository())) {
    throw new Error("This folder is not a git repository yet. Initialize git, add a GitHub remote, and try again.");
  }

  const relativeFiles = [...new Set(filePaths.map(toRepoRelative))];

  await runGit(["add", "--", ...relativeFiles]);

  const commitResult = await runGit(["commit", "-m", commitMessage, "--", ...relativeFiles]);
  const branch = await getCurrentBranch();
  const pushArgs = (await hasUpstreamBranch())
    ? ["push"]
    : ["push", "-u", "origin", branch || "HEAD"];
  const pushResult = await runGit(pushArgs);

  return {
    branch: branch || "HEAD",
    commitMessage,
    commitOutput: (commitResult.stdout || commitResult.stderr).trim(),
    pushOutput: (pushResult.stdout || pushResult.stderr).trim()
  };
}
