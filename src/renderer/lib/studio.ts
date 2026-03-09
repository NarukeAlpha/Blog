export interface StudioStatus {
  rootDir: string;
  writersideDir: string;
  gitReady: boolean;
  opencodeReady: boolean;
  postCount: number;
  bookmarkCount: number;
}

export interface GitPublishResult {
  branch: string;
  commitMessage: string;
  commitOutput: string;
  pushOutput: string;
}

export interface PostRecord {
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  publishedAt: string;
  topicPath: string;
}

export interface BookmarkRecord {
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  source: string;
  note: string;
  addedAt: string;
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

export interface StudioBridge {
  platform: string;
  getStatus: () => Promise<StudioStatus>;
  publishPost: (payload: { title: string; summary: string; tags: string; body: string }) => Promise<PostPublishResult>;
  publishBookmark: (payload: { url: string; note: string }) => Promise<BookmarkPublishResult>;
  openExternal: (url: string) => Promise<void>;
}
