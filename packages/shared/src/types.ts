export const IPC_CHANNELS = {
  GET_BOOTSTRAP: "studio:get-bootstrap",
  GET_STATUS: "studio:get-status",
  SAVE_SETTINGS: "studio:save-settings",
  PUBLISH_POST: "studio:publish-post",
  PUBLISH_BOOKMARK: "studio:publish-bookmark",
  OPEN_EXTERNAL: "studio:open-external",
  WINDOW_VISIBILITY: "studio:window-visibility"
} as const;

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
  title: string;
  body: string;
}

export interface AiResearchPublishPayload {
  title: string;
  body: string;
  model: string;
  prompt: string;
}

export interface BookmarkPublishPayload {
  url: string;
  note: string;
}

export interface StudioBookmarkPublishRequest extends BookmarkPublishPayload {
  title: string;
  description: string;
  source: string;
  thumbnailSourceUrl?: string;
}

export interface StudioErrorResponse {
  error: string;
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
  publishPost: (payload: PostPublishPayload) => Promise<PostPublishResult>;
  publishBookmark: (payload: BookmarkPublishPayload) => Promise<BookmarkPublishResult>;
  openExternal: (url: string) => Promise<void>;
  isWindowFocused: () => Promise<boolean>;
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
