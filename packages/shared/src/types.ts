export type StudioEnvironment = "dev" | "prod";

export interface StudioEnvironmentSettings {
  convexUrl: string;
  convexSiteUrl: string;
  publicSiteUrl: string;
  deployKeyConfigured: boolean;
}

export interface StudioSettings {
  selectedEnvironment: StudioEnvironment;
  environments: Record<StudioEnvironment, StudioEnvironmentSettings>;
  opencodeCommand: string;
  opencodeBaseUrl: string;
  opencodeProviderId: string;
  opencodeModelId: string;
}

export interface SaveStudioEnvironmentSettingsPayload {
  convexUrl?: string;
  convexSiteUrl?: string;
  publicSiteUrl?: string;
  deployKey?: string;
}

export interface SaveStudioSettingsPayload {
  selectedEnvironment?: StudioEnvironment;
  environments?: Partial<Record<StudioEnvironment, SaveStudioEnvironmentSettingsPayload>>;
  clearDeployKeys?: StudioEnvironment[];
  opencodeCommand?: string;
  opencodeBaseUrl?: string;
  opencodeProviderId?: string;
  opencodeModelId?: string;
}

export interface StudioStatus {
  activeEnvironment: StudioEnvironment;
  appPath: string;
  userDataDir: string;
  thumbnailsDir: string;
  convexUrl: string | null;
  convexSiteUrl: string | null;
  publicSiteUrl: string | null;
  convexConfigured: boolean;
  convexReachable: boolean;
  deployKeyConfigured: boolean;
  opencodeConfigured: boolean;
  opencodeReady: boolean;
  postCount: number | null;
  bookmarkCount: number | null;
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

export interface AiResearchSummaryRecord {
  slug: string;
  title: string;
  model: string;
  excerpt: string;
  publishedAt: number;
  readingTimeMinutes: number;
}

export interface AiResearchRecord extends AiResearchSummaryRecord {
  body: string;
  prompt: string;
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

export interface SiteCounts {
  postCount: number;
  bookmarkCount: number;
}

export interface SiteOverview extends SiteCounts {
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
