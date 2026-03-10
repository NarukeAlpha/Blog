export interface PostRecord {
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  publishedAt: number;
  readingTimeMinutes: number;
}

export interface BookmarkRecord {
  url: string;
  title: string;
  description: string;
  source: string;
  thumbnailUrl: string;
  note: string;
  addedAt: number;
}

export interface PostPublishPayload {
  title?: string;
  body?: string;
}

export interface BookmarkPublishPayload {
  url?: string;
  note?: string;
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
  post: PostRecord;
}

export interface BookmarkPublishResult {
  ok: boolean;
  bookmark: BookmarkRecord;
  thumbnailCachePath?: string | null;
}

export interface StudioStatusResult {
  rootDir: string;
  thumbnailsDir: string;
  publicSiteUrl: string | null;
  convexConfigured: boolean;
  convexReachable: boolean;
  writeKeyConfigured: boolean;
  opencodeReady: boolean;
  postCount: number;
  bookmarkCount: number;
}
