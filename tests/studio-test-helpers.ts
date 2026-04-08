import type {
  BookmarkPublishResult,
  PostPublishResult,
  SaveStudioSettingsPayload,
  StudioBootstrap,
  StudioBridge,
  StudioSettings,
  StudioStatus
} from "@shared/types";
import { vi } from "vitest";

export function createStudioSettings(overrides: Partial<StudioSettings> = {}): StudioSettings {
  return {
    convexUrl: "https://demo.convex.cloud",
    publicSiteUrl: "https://blog.example.com",
    opencodeCommand: "opencode",
    opencodeBaseUrl: "http://127.0.0.1:4096",
    opencodeProviderId: "openai",
    opencodeModelId: "gpt-4",
    ...overrides
  };
}

export function createStudioStatus(overrides: Partial<StudioStatus> = {}): StudioStatus {
  return {
    appPath: "/Applications/NarukeAlpha",
    userDataDir: "/Users/test/Library/Application Support/NarukeAlpha",
    thumbnailsDir: "/Users/test/Library/Application Support/NarukeAlpha/cache/thumbnails",
    publicSiteUrl: "https://blog.example.com",
    convexConfigured: true,
    convexReachable: true,
    deployKeyConfigured: true,
    opencodeConfigured: true,
    opencodeReady: true,
    postCount: 3,
    bookmarkCount: 2,
    overview: {
      postCount: 3,
      bookmarkCount: 2,
      latestPosts: [
        {
          slug: "latest-post",
          title: "Latest Post",
          excerpt: "Latest excerpt",
          publishedAt: Date.UTC(2026, 0, 5),
          readingTimeMinutes: 4
        }
      ],
      latestBookmarks: [
        {
          url: "https://example.com/bookmark",
          title: "Latest Bookmark",
          description: "Latest bookmark description",
          source: "Example",
          thumbnailUrl: "",
          addedAt: Date.UTC(2026, 0, 6)
        }
      ]
    },
    overviewError: null,
    ...overrides
  };
}

export function createBootstrap(overrides: Partial<StudioBootstrap> = {}): StudioBootstrap {
  const settings = overrides.settings ?? createStudioSettings();
  const status = overrides.status ?? createStudioStatus();

  return {
    settings,
    status
  };
}

export function createStudioBridge(overrides: Partial<StudioBridge> = {}): StudioBridge {
  const bootstrap = createBootstrap();
  const status = bootstrap.status;
  const postResult: PostPublishResult = {
    ok: true,
    post: {
      slug: "latest-post",
      title: "Latest Post",
      body: "Body",
      excerpt: "Excerpt",
      publishedAt: Date.UTC(2026, 0, 5),
      readingTimeMinutes: 4
    }
  };
  const bookmarkResult: BookmarkPublishResult = {
    ok: true,
    bookmark: {
      url: "https://example.com/bookmark",
      title: "Latest Bookmark",
      description: "Latest bookmark description",
      source: "Example",
      thumbnailUrl: "",
      note: "",
      addedAt: Date.UTC(2026, 0, 6)
    },
    thumbnailCachePath: null
  };

  return {
    platform: process.platform,
    getBootstrap: vi.fn(async () => bootstrap),
    getStatus: vi.fn(async () => status),
    saveSettings: vi.fn(async (payload: SaveStudioSettingsPayload) => ({
      settings: createStudioSettings({
        convexUrl: payload.convexUrl ?? bootstrap.settings.convexUrl,
        publicSiteUrl: payload.publicSiteUrl ?? bootstrap.settings.publicSiteUrl,
        opencodeCommand: payload.opencodeCommand ?? bootstrap.settings.opencodeCommand,
        opencodeBaseUrl: payload.opencodeBaseUrl ?? bootstrap.settings.opencodeBaseUrl,
        opencodeProviderId: payload.opencodeProviderId ?? bootstrap.settings.opencodeProviderId,
        opencodeModelId: payload.opencodeModelId ?? bootstrap.settings.opencodeModelId
      }),
      status
    })),
    publishPost: vi.fn(async () => postResult),
    publishBookmark: vi.fn(async () => bookmarkResult),
    openExternal: vi.fn(async () => {}),
    ...overrides
  };
}
