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
}

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

export interface SiteOverview {
  postCount: number;
  bookmarkCount: number;
  latestPosts: PostRecord[];
  latestBookmarks: BookmarkRecord[];
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
