export interface StudioStatus {
  rootDir: string;
  thumbnailsDir: string;
  publicSiteUrl: string | null;
  convexConfigured: boolean;
  convexReachable: boolean;
  writeKeyConfigured: boolean;
  opencodeReady: boolean;
  postCount: number;
  bookmarkCount: number;
  overview: SiteOverview | null;
}

export interface PostRecord {
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  publishedAt: number;
  readingTimeMinutes: number;
}

export interface PostSummaryRecord {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: number;
  readingTimeMinutes: number;
}

export interface PublicBookmarkRecord {
  url: string;
  title: string;
  description: string;
  source: string;
  thumbnailUrl: string;
  addedAt: number;
}

export interface BookmarkRecord extends PublicBookmarkRecord {
  note: string;
}

export interface SiteOverview {
  postCount: number;
  bookmarkCount: number;
  latestPosts: PostSummaryRecord[];
  latestBookmarks: PublicBookmarkRecord[];
}

export interface PostPublishPayload {
  title?: string;
  body?: string;
}

export interface BookmarkPublishPayload {
  url?: string;
  note?: string;
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

export interface StudioBridge {
  platform: string;
  getStatus: () => Promise<StudioStatus>;
  publishPost: (payload: { title: string; body: string }) => Promise<PostPublishResult>;
  publishBookmark: (payload: { url: string; note: string }) => Promise<BookmarkPublishResult>;
  openExternal: (url: string) => Promise<void>;
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
