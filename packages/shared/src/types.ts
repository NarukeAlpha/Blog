export interface StudioSettings {
  convexUrl: string;
  publicSiteUrl: string;
  opencodeCommand: string;
  opencodeBaseUrl: string;
}

export interface SaveStudioSettingsPayload {
  convexUrl?: string;
  publicSiteUrl?: string;
  opencodeCommand?: string;
  opencodeBaseUrl?: string;
  deployKey?: string;
  clearDeployKey?: boolean;
}

export interface StudioStatus {
  appPath: string;
  userDataDir: string;
  thumbnailsDir: string;
  publicSiteUrl: string | null;
  convexConfigured: boolean;
  convexReachable: boolean;
  deployKeyConfigured: boolean;
  opencodeConfigured: boolean;
  opencodeReady: boolean;
  postCount: number;
  bookmarkCount: number;
  overview: SiteOverview | null;
  overviewError: string | null;
}

export interface StudioBootstrap {
  settings: StudioSettings;
  status: StudioStatus;
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
  getBootstrap: () => Promise<StudioBootstrap>;
  getStatus: () => Promise<StudioStatus>;
  saveSettings: (payload: SaveStudioSettingsPayload) => Promise<StudioBootstrap>;
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
