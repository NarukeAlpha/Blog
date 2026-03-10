export interface PostRecord {
  slug: string;
  title: string;
  body: string;
  publishedAt: string;
  topicPath: string;
}

export interface BookmarkRecord {
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  source: string;
  note?: string;
  addedAt: string;
}

export interface CreatePostRecordInput {
  title: string;
  body: string;
  slug: string;
  publishedAt: string;
}

export interface PostPublishPayload {
  title?: string;
  body?: string;
}

export interface BookmarkPublishPayload {
  url?: string;
  note?: string;
}

export interface CommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface CommandFailure extends Error {
  code?: number | null;
  stdout?: string;
  stderr?: string;
}

export interface GitPublishResult {
  branch: string;
  commitMessage: string;
  commitOutput: string;
  pushOutput: string;
}

export interface OpencodeServerStatus {
  endpoint: string;
  startedByApp: boolean;
}

export interface BookmarkResearchResult extends OpencodeServerStatus {
  title: string;
  description: string;
  source: string;
  thumbnailUrl: string;
}

export interface PostPublishResult {
  ok: boolean;
  savedLocal: boolean;
  pushed: boolean;
  files: string[];
  post: PostRecord;
  git?: GitPublishResult;
  warning?: string;
}

export interface BookmarkPublishResult {
  ok: boolean;
  savedLocal: boolean;
  pushed: boolean;
  files: string[];
  bookmark: BookmarkRecord;
  git?: GitPublishResult;
  warning?: string;
}
