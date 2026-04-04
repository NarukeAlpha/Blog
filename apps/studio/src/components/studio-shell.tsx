import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookmarkPlus,
  BookOpenText,
  Database,
  FolderOpenDot,
  Globe2,
  HardDriveDownload,
  KeyRound,
  NotebookPen,
  Radio,
  RefreshCw,
  Settings2,
  Sparkles,
  Wifi,
  WifiOff
} from "lucide-react";

import { Badge } from "@studio/components/ui/badge";
import { Button } from "@studio/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@studio/components/ui/card";
import { Input } from "@studio/components/ui/input";
import { Textarea } from "@studio/components/ui/textarea";
import { cn } from "@studio/lib/utils";
import { formatDate } from "@shared/text";
import type {
  BookmarkPublishResult,
  PostPublishResult,
  SaveStudioSettingsPayload,
  StudioBootstrap,
  StudioBridge,
  StudioSettings,
  StudioStatus
} from "@shared/types";

type ViewKey = "dashboard" | "post" | "bookmarks" | "settings";
type NoticeTone = "neutral" | "success" | "warning" | "error";

interface NoticeState {
  title: string;
  detail: string;
  tone: NoticeTone;
}

interface SettingsDraft {
  convexUrl: string;
  publicSiteUrl: string;
  opencodeCommand: string;
  opencodeBaseUrl: string;
  opencodeProviderId: string;
  opencodeModelId: string;
  deployKey: string;
}

interface StudioShellProps {
  studio: StudioBridge;
  settings: StudioSettings;
  initialStatus: StudioStatus;
  onBootstrapChange: (next: StudioBootstrap) => void;
}

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Database }> = [
  { key: "dashboard", label: "Dashboard", icon: Database },
  { key: "post", label: "Post", icon: NotebookPen },
  { key: "bookmarks", label: "Bookmarks", icon: BookmarkPlus },
  { key: "settings", label: "Settings", icon: Settings2 }
];

const noticeToneClasses: Record<NoticeTone, string> = {
  neutral: "glass-subtle text-foreground",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  error: "border-destructive/20 bg-destructive/10 text-destructive"
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function shortenPath(filePath: string) {
  const parts = filePath.split(/[/\\]/).filter(Boolean);
  return parts.slice(-3).join("/");
}

function createSettingsDraft(settings: StudioSettings): SettingsDraft {
  return {
    convexUrl: settings.convexUrl,
    publicSiteUrl: settings.publicSiteUrl,
    opencodeCommand: settings.opencodeCommand,
    opencodeBaseUrl: settings.opencodeBaseUrl,
    opencodeProviderId: settings.opencodeProviderId,
    opencodeModelId: settings.opencodeModelId,
    deployKey: ""
  };
}

export function StudioShell({ studio, settings, initialStatus, onBootstrapChange }: StudioShellProps) {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [status, setStatus] = useState<StudioStatus>(initialStatus);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [busyView, setBusyView] = useState<ViewKey | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [postDraft, setPostDraft] = useState({ title: "", body: "" });
  const [bookmarkDraft, setBookmarkDraft] = useState({ url: "", note: "" });
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() => createSettingsDraft(settings));
  const [clearDeployKey, setClearDeployKey] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setSettingsDraft(createSettingsDraft(settings));
    setClearDeployKey(false);
  }, [settings]);

  const overview = status.overview;
  const overviewUnavailableMessage = useMemo(() => {
    if (loadingStatus) {
      return "Loading the live overview...";
    }

    if (status.overviewError) {
      return `Overview unavailable: ${status.overviewError}`;
    }

    if (!status.convexConfigured) {
      return "Save the Convex URL in Settings to load the live overview.";
    }

    if (!status.convexReachable) {
      return "Reconnect to the hosted Convex deployment to load the live overview.";
    }

    if (!status.deployKeyConfigured) {
      return "Save the studio write key in Settings to load the live overview.";
    }

    return null;
  }, [loadingStatus, status]);

  const showNotice = useCallback((title: string, detail: string, tone: NoticeTone = "neutral") => {
    setNotice({ title, detail, tone });
  }, []);

  const refreshStatus = useCallback(
    async (silent = true) => {
      setLoadingStatus(true);

      try {
        const next = await studio.getStatus();
        setStatus(next);
      } catch (error) {
        if (!silent) {
          showNotice("Status", getErrorMessage(error), "error");
        }
      } finally {
        setLoadingStatus(false);
      }
    },
    [showNotice, studio]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshStatus]);

  const metrics = useMemo(
    () => [
      {
        label: "Posts",
        value: loadingStatus ? "..." : status.postCount === null ? "Unavailable" : String(status.postCount),
        icon: BookOpenText
      },
      {
        label: "Bookmarks",
        value: loadingStatus ? "..." : status.bookmarkCount === null ? "Unavailable" : String(status.bookmarkCount),
        icon: BookmarkPlus
      },
      { label: "Convex", value: status.convexReachable ? "Live" : status.convexConfigured ? "Check link" : "Missing", icon: Database }
    ],
    [loadingStatus, status]
  );

  const canPublishPosts = status.convexConfigured && status.deployKeyConfigured;
  const canPublishBookmarks = canPublishPosts && status.opencodeConfigured;

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyView("post");

    try {
      const result = (await studio.publishPost(postDraft)) as PostPublishResult;
      showNotice("Post published", `${result.post.title} is now live through Convex and visible from the public site feed.`, "success");
      setPostDraft({ title: "", body: "" });
      setView("dashboard");
      await refreshStatus();
    } catch (error) {
      showNotice("Post failed", getErrorMessage(error), "error");
    } finally {
      setBusyView(null);
    }
  }

  async function handleBookmarkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyView("bookmarks");

    try {
      const result = (await studio.publishBookmark(bookmarkDraft)) as BookmarkPublishResult;
      showNotice(
        "Bookmark published",
        result.thumbnailCachePath
          ? `${result.bookmark.title} was saved to Convex and mirrored into ${result.thumbnailCachePath}.`
          : `${result.bookmark.title} was saved to Convex and added to the public reading list.`,
        "success"
      );

      setBookmarkDraft({ url: "", note: "" });
      setView("dashboard");
      await refreshStatus();
    } catch (error) {
      showNotice("Bookmark failed", getErrorMessage(error), "error");
    } finally {
      setBusyView(null);
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyView("settings");

    const payload: SaveStudioSettingsPayload = {
      convexUrl: settingsDraft.convexUrl,
      publicSiteUrl: settingsDraft.publicSiteUrl,
      opencodeCommand: settingsDraft.opencodeCommand,
      opencodeBaseUrl: settingsDraft.opencodeBaseUrl,
      opencodeProviderId: settingsDraft.opencodeProviderId,
      opencodeModelId: settingsDraft.opencodeModelId,
      clearDeployKey
    };

    if (settingsDraft.deployKey.trim()) {
      payload.deployKey = settingsDraft.deployKey;
    }

    try {
      const next = await studio.saveSettings(payload);
      onBootstrapChange(next);
      setStatus(next.status);
      setSettingsDraft(createSettingsDraft(next.settings));
      setClearDeployKey(false);
      showNotice("Settings saved", "Desktop settings were saved locally. Restarting the app is not required.", "success");
    } catch (error) {
      showNotice("Settings failed", getErrorMessage(error), "error");
    } finally {
      setBusyView(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-4 pt-12 text-foreground sm:px-6">
      <div className="stardust-overlay" />
      <div className="orb -left-32 -top-20 h-[340px] w-[340px] opacity-40" />
      <div className="orb orb-alt top-1/2 -right-24 h-[260px] w-[260px] opacity-30" />
      <div className="orb-glow bottom-20 left-1/3 h-[200px] w-[200px] opacity-25" />
      <div className="titlebar-drag fixed inset-x-0 top-0 z-50 h-12" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="titlebar-no-drag flex h-full flex-col xl:max-h-[calc(100vh-4rem)]">
          <CardHeader className="space-y-5 pb-4">
            <div className="grid gap-3">
              <Badge variant="secondary" className="w-fit gap-2 px-3 py-1">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Studio
              </Badge>
              <div>
                <CardTitle className="bg-[linear-gradient(135deg,#fff_0%,#c4b5fd_50%,#00d2e6_100%)] bg-clip-text text-2xl text-transparent">NarukeAlpha</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Local writing surface, hosted Convex sync.</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-5">
            <div className="neon-line" />
            <nav className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.key === view;

                return (
                  <Button
                    key={item.key}
                    variant={active ? "secondary" : "ghost"}
                    className={cn(
                      "justify-start",
                      active && "border-[rgba(120,80,255,0.45)] bg-[linear-gradient(135deg,rgba(120,80,255,0.22),rgba(0,210,230,0.10))] shadow-[0_0_16px_rgba(120,80,255,0.18)]"
                    )}
                    onClick={() => setView(item.key)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <div className="grid gap-3">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <div key={metric.label} className="glass-subtle rounded-[1.6rem] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-3 font-serif text-3xl text-foreground">{metric.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto grid gap-3 rounded-[1.8rem] px-4 py-4 text-xs text-muted-foreground glass-heavy">
              <div className="flex items-center gap-2">
                <FolderOpenDot className="h-4 w-4 shrink-0" />
                <span className="truncate">{shortenPath(status.appPath)}</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDriveDownload className="h-4 w-4 shrink-0" />
                <span className="truncate">{shortenPath(status.userDataDir)}</span>
              </div>
              <div className={cn("flex items-center gap-2", status.opencodeReady ? "text-success" : status.opencodeConfigured ? "text-warning" : "text-muted-foreground")}>
                {status.opencodeReady ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span>
                  {status.opencodeReady
                    ? "OpenCode ready"
                    : status.opencodeConfigured
                      ? "OpenCode starts on demand"
                      : "Bookmark research disabled"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <main className="titlebar-no-drag flex min-w-0 flex-col gap-4 fade-up">
          {notice ? (
            <div className={cn("rounded-[1.8rem] px-4 py-3 backdrop-blur-md", noticeToneClasses[notice.tone])}>
              <p className="text-sm font-medium">{notice.title}</p>
              <p className="mt-1 text-sm opacity-90">{notice.detail}</p>
            </div>
          ) : null}

          {view === "dashboard" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card>
                <CardHeader className="border-b border-[var(--glass-border-subtle)] pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="w-fit">Overview</Badge>
                      <CardTitle className="mt-3 bg-[linear-gradient(135deg,#fff,#c4b5fd)] bg-clip-text text-3xl text-transparent">The live publishing loop</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => void refreshStatus(false)} aria-label="Refresh studio status" disabled={loadingStatus}>
                        <RefreshCw className={cn("h-4 w-4", loadingStatus && "animate-spin")} />
                      </Button>
                      {status.publicSiteUrl ? (
                        <Button size="sm" onClick={() => void studio.openExternal(status.publicSiteUrl!)}>
                          <ArrowUpRight className="h-4 w-4" />
                          Open site
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 p-6">
                  <div className="glass-subtle rounded-[1.8rem] p-5">
                    <p className="text-sm leading-7 text-muted-foreground">
                      This desktop app keeps its own settings, studio write key, and cache under your local app data folder. Convex stays the shared source of truth, so you can move between machines without syncing the repo.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      {
                        label: "Hosted backend",
                        detail: status.convexReachable
                          ? "The desktop app is talking to the saved Convex deployment."
                          : status.convexConfigured
                            ? "A Convex URL is saved, but the deployment is not responding right now."
                            : "Save the Convex deployment URL in Settings before publishing.",
                        tone: status.convexReachable ? "success" : "warning"
                      },
                      {
                        label: "Studio auth",
                        detail: status.deployKeyConfigured
                          ? "Electron has the shared studio write key and can call the protected Convex functions used by the studio."
                          : "Save the studio write key locally before loading overview data or publishing content.",
                        tone: status.deployKeyConfigured ? "success" : "warning"
                      },
                      {
                        label: "Bookmark research",
                        detail: status.opencodeConfigured
                          ? "Bookmarks can start OpenCode from the saved command when needed."
                          : "Bookmarks are optional. Save an OpenCode command in Settings to enable enrichment.",
                        tone: status.opencodeConfigured ? "neutral" : "warning"
                      }
                    ].map((item) => (
                      <div key={item.label} className="glass-subtle rounded-[1.6rem] p-4 transition-all duration-200 hover:border-[rgba(120,80,255,0.3)] hover:bg-[rgba(120,80,255,0.08)]">
                        <Badge variant={item.tone === "success" ? "success" : item.tone === "warning" ? "warning" : "outline"} className="w-fit">
                          {item.label}
                        </Badge>
                        <p className="mt-3 font-mono text-sm leading-7 text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </div>

                  {!status.convexConfigured || !status.deployKeyConfigured ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                      <p>Publishing is blocked until the desktop app has a Convex URL and studio write key.</p>
                      <Button variant="outline" onClick={() => setView("settings")}>Open settings</Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <Badge variant="outline" className="w-fit">Recent posts</Badge>
                    <CardTitle className="bg-[linear-gradient(135deg,#fff,#c4b5fd)] bg-clip-text text-2xl text-transparent">Fresh posts</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {overview?.latestPosts?.length ? (
                      overview.latestPosts.map((post) => (
                        <div key={post.slug} className="glass-subtle rounded-[1.5rem] p-4 transition-all duration-200 hover:border-[rgba(120,80,255,0.3)] hover:bg-[rgba(120,80,255,0.08)]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-foreground">{post.title}</p>
                            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{post.readingTimeMinutes} min</span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                        </div>
                      ))
                    ) : overviewUnavailableMessage ? (
                      <p className="text-sm text-muted-foreground">{overviewUnavailableMessage}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {status.convexConfigured ? "No posts yet. The first publish will show up here." : "Save the Convex URL in Settings to load live post data."}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <Badge variant="outline" className="w-fit">Bookmarks</Badge>
                    <CardTitle className="bg-[linear-gradient(135deg,#fff,#c4b5fd)] bg-clip-text text-2xl text-transparent">Latest saves</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {overview?.latestBookmarks?.length ? (
                      overview.latestBookmarks.map((bookmark) => (
                        <div key={bookmark.url} className="glass-subtle rounded-[1.5rem] p-4 transition-all duration-200 hover:border-[rgba(120,80,255,0.3)] hover:bg-[rgba(120,80,255,0.08)]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-foreground">{bookmark.title}</p>
                            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{formatDate(bookmark.addedAt)}</span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{bookmark.description}</p>
                        </div>
                      ))
                    ) : overviewUnavailableMessage ? (
                      <p className="text-sm text-muted-foreground">{overviewUnavailableMessage}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {status.convexConfigured ? "Bookmark research results land here after a successful publish." : "Connect Convex in Settings before loading bookmark history."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {view === "post" ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="gap-2">
                    <NotebookPen className="h-3.5 w-3.5" />
                    Post
                  </Badge>
                  <CardTitle className="bg-[linear-gradient(135deg,#fff,#c4b5fd)] bg-clip-text text-3xl text-transparent">Ship a new post</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <form className="grid gap-4" onSubmit={handlePostSubmit}>
                  {!canPublishPosts ? (
                    <div className="rounded-[1.6rem] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                      Save a Convex URL and studio write key in Settings before publishing posts.
                    </div>
                  ) : null}

                  <Input
                    placeholder="Give the post a title"
                    value={postDraft.title}
                    onChange={(event) => setPostDraft((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                  <Textarea
                    placeholder="Markdown body"
                    className="min-h-[460px] resize-y"
                    value={postDraft.body}
                    onChange={(event) => setPostDraft((current) => ({ ...current, body: event.target.value }))}
                    required
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={busyView === "post" || !canPublishPosts} className="hover:shadow-[0_0_20px_rgba(0,210,230,0.25)]">
                      {busyView === "post" ? "Publishing..." : "Publish to Convex"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {view === "bookmarks" ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Bookmark
                  </Badge>
                  <CardTitle className="bg-[linear-gradient(135deg,#fff,#c4b5fd)] bg-clip-text text-3xl text-transparent">Research and publish a link</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <form className="grid gap-4" onSubmit={handleBookmarkSubmit}>
                  {!status.opencodeConfigured ? (
                    <div className="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                      Bookmark research is optional. Save an OpenCode command in Settings to enable this view.
                    </div>
                  ) : !canPublishPosts ? (
                    <div className="rounded-[1.6rem] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                      Save a Convex URL and studio write key in Settings before publishing bookmarks.
                    </div>
                  ) : null}

                  <Input
                    type="url"
                    placeholder="https://..."
                    value={bookmarkDraft.url}
                    onChange={(event) => setBookmarkDraft((current) => ({ ...current, url: event.target.value }))}
                    required
                  />
                  <Textarea
                    placeholder="Why this link matters"
                    className="min-h-[240px] resize-y"
                    value={bookmarkDraft.note}
                    onChange={(event) => setBookmarkDraft((current) => ({ ...current, note: event.target.value }))}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className="max-w-full truncate gap-2 px-3 py-1">
                      <Globe2 className="h-3.5 w-3.5" />
                      OpenCode enriches metadata, Convex keeps it synced
                    </Badge>
                    <Button type="submit" disabled={busyView === "bookmarks" || !canPublishBookmarks} className="hover:shadow-[0_0_20px_rgba(0,210,230,0.25)]">
                      {busyView === "bookmarks" ? "Publishing..." : "Publish bookmark"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {view === "settings" ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="gap-2">
                    <Settings2 className="h-3.5 w-3.5" />
                    Settings
                  </Badge>
                  <CardTitle className="bg-[linear-gradient(135deg,#fff,#c4b5fd)] bg-clip-text text-3xl text-transparent">Desktop runtime settings</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <form className="grid gap-5" onSubmit={handleSettingsSubmit}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">Convex deployment URL</label>
                      <Input
                        placeholder="https://your-team.convex.cloud"
                        value={settingsDraft.convexUrl}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, convexUrl: event.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">Public site URL</label>
                      <Input
                        placeholder="https://blog.example.com"
                        value={settingsDraft.publicSiteUrl}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, publicSiteUrl: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="grid gap-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <KeyRound className="h-4 w-4" />
                        Studio write key
                      </label>
                      <Input
                        type="password"
                        placeholder={status.deployKeyConfigured && !clearDeployKey ? "Saved locally. Enter a new key to replace it." : "Paste the studio write key"}
                        value={settingsDraft.deployKey}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, deployKey: event.target.value }))}
                      />
                    </div>

                    <div className="flex items-end">
                      <Button type="button" variant="outline" onClick={() => setClearDeployKey((current) => !current)}>
                        {clearDeployKey ? "Keep saved key" : "Clear saved key"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">OpenCode command</label>
                      <Input
                        placeholder="opencode"
                        value={settingsDraft.opencodeCommand}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, opencodeCommand: event.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Leave this blank to disable bookmark enrichment on this machine.</p>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">OpenCode base URL</label>
                      <Input
                        placeholder="http://127.0.0.1:4096"
                        value={settingsDraft.opencodeBaseUrl}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, opencodeBaseUrl: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">OpenCode provider ID</label>
                      <Input
                        placeholder="openai"
                        value={settingsDraft.opencodeProviderId}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, opencodeProviderId: event.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">OpenCode model ID</label>
                      <Input
                        placeholder="gpt-4"
                        value={settingsDraft.opencodeModelId}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, opencodeModelId: event.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Bookmark research always sends this provider/model pair explicitly, even if another OpenCode session picked a different default.</p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-[1.8rem] p-5 glass-subtle">
                    <p className="text-sm leading-7 text-muted-foreground">
                      Desktop settings are stored under <code>{status.userDataDir}</code>. The studio write key stays local to this installation, while Convex remains the shared content source across machines.
                    </p>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Cached bookmark thumbnails are mirrored into <code>{status.thumbnailsDir}</code> so the app never needs a writable copy of the repo.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={busyView === "settings"} className="hover:shadow-[0_0_20px_rgba(0,210,230,0.25)]">
                      {busyView === "settings" ? "Saving..." : "Save desktop settings"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </main>
      </div>
    </div>
  );
}
