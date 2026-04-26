import type {
  BookmarkPublishResult,
  PostPublishResult,
  SaveStudioEnvironmentSettingsPayload,
  SaveStudioSettingsPayload,
  StudioBootstrap,
  StudioBridge,
  StudioEnvironment,
  StudioEnvironmentSettings,
  StudioSettings,
  StudioStatus
} from "@shared/types";
import { vi } from "vitest";

function createEnvironmentSettings(overrides: Partial<StudioEnvironmentSettings> = {}): StudioEnvironmentSettings {
  return {
    convexUrl: "https://demo.convex.cloud",
    convexSiteUrl: "https://demo.convex.site",
    publicSiteUrl: "https://blog.example.com",
    deployKeyConfigured: true,
    ...overrides
  };
}

type StudioSettingsOverrides = Omit<Partial<StudioSettings>, "environments"> & {
  environments?: Partial<Record<StudioEnvironment, Partial<StudioEnvironmentSettings>>>;
};

export function createStudioSettings(overrides: StudioSettingsOverrides = {}): StudioSettings {
  const { environments: environmentOverrides, ...restOverrides } = overrides;
  const baseEnvironments = {
    dev: createEnvironmentSettings({
      convexUrl: "https://dev.demo.convex.cloud",
      convexSiteUrl: "https://dev.demo.convex.site",
      publicSiteUrl: "https://dev.blog.example.com"
    }),
    prod: createEnvironmentSettings()
  };

  return {
    selectedEnvironment: "prod",
    environments: {
      dev: {
        ...baseEnvironments.dev,
        ...environmentOverrides?.dev
      },
      prod: {
        ...baseEnvironments.prod,
        ...environmentOverrides?.prod
      }
    },
    opencodeCommand: "opencode",
    opencodeBaseUrl: "http://127.0.0.1:4096",
    opencodeProviderId: "openai",
    opencodeModelId: "gpt-4",
    ...restOverrides
  };
}

export function createStudioStatus(overrides: Partial<StudioStatus> = {}): StudioStatus {
  return {
    activeEnvironment: "prod",
    appPath: "/Applications/NarukeAlpha",
    userDataDir: "/Users/test/Library/Application Support/NarukeAlpha",
    thumbnailsDir: "/Users/test/Library/Application Support/NarukeAlpha/cache/thumbnails",
    convexUrl: "https://demo.convex.cloud",
    convexSiteUrl: "https://demo.convex.site",
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

function applySettingsPayload(current: StudioSettings, payload: SaveStudioSettingsPayload): StudioSettings {
  const clearDeployKeys = new Set(payload.clearDeployKeys ?? []);

  return {
    selectedEnvironment: payload.selectedEnvironment ?? current.selectedEnvironment,
    environments: {
      dev: applyEnvironmentPatch(current.environments.dev, payload.environments?.dev, clearDeployKeys, "dev"),
      prod: applyEnvironmentPatch(current.environments.prod, payload.environments?.prod, clearDeployKeys, "prod")
    },
    opencodeCommand: payload.opencodeCommand ?? current.opencodeCommand,
    opencodeBaseUrl: payload.opencodeBaseUrl ?? current.opencodeBaseUrl,
    opencodeProviderId: payload.opencodeProviderId ?? current.opencodeProviderId,
    opencodeModelId: payload.opencodeModelId ?? current.opencodeModelId
  };
}

function applyEnvironmentPatch(
  current: StudioEnvironmentSettings,
  patch: SaveStudioEnvironmentSettingsPayload | undefined,
  clearDeployKeys: Set<StudioEnvironment>,
  environment: StudioEnvironment
): StudioEnvironmentSettings {
  return {
    convexUrl: patch?.convexUrl ?? current.convexUrl,
    convexSiteUrl: patch?.convexSiteUrl ?? current.convexSiteUrl,
    publicSiteUrl: patch?.publicSiteUrl ?? current.publicSiteUrl,
    deployKeyConfigured: clearDeployKeys.has(environment) ? false : patch?.deployKey ? true : current.deployKeyConfigured
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
  let bootstrap = createBootstrap();
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

  const saveSettings = vi.fn(async (payload: SaveStudioSettingsPayload) => {
    const settings = applySettingsPayload(bootstrap.settings, payload);
    const activeSettings = settings.environments[settings.selectedEnvironment];

    bootstrap = {
      settings,
      status: {
        ...bootstrap.status,
        activeEnvironment: settings.selectedEnvironment,
        convexUrl: activeSettings.convexUrl || null,
        convexSiteUrl: activeSettings.convexSiteUrl || null,
        publicSiteUrl: activeSettings.publicSiteUrl || null,
        deployKeyConfigured: activeSettings.deployKeyConfigured,
        opencodeConfigured: Boolean(settings.opencodeCommand),
        opencodeReady: Boolean(settings.opencodeCommand)
      }
    };

    return bootstrap;
  });

  return {
    platform: process.platform,
    getBootstrap: vi.fn(async () => bootstrap),
    getStatus: vi.fn(async () => bootstrap.status),
    saveSettings,
    publishPost: vi.fn(async () => postResult),
    publishBookmark: vi.fn(async () => bookmarkResult),
    openExternal: vi.fn(async () => {}),
    isWindowFocused: vi.fn(async () => true),
    ...overrides
  };
}
