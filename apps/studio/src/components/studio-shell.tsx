import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpRight, BookmarkPlus, BookOpenText, Database, FolderOpenDot, Globe2, HardDriveDownload, NotebookPen, Radio, RefreshCw, Sparkles, Wifi, WifiOff } from "lucide-react";

import { api } from "@convex/api";
import { Badge } from "@studio/components/ui/badge";
import { Button } from "@studio/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@studio/components/ui/card";
import { Input } from "@studio/components/ui/input";
import { Textarea } from "@studio/components/ui/textarea";
import { cn } from "@studio/lib/utils";
import { formatDate } from "@shared/text";
import type { BookmarkPublishResult, PostPublishResult, SiteOverview, StudioBridge, StudioStatus } from "@shared/types";

type ViewKey = "dashboard" | "post" | "bookmarks";
type NoticeTone = "neutral" | "success" | "warning" | "error";

interface NoticeState {
  title: string;
  detail: string;
  tone: NoticeTone;
}

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Database }> = [
  { key: "dashboard", label: "Dashboard", icon: Database },
  { key: "post", label: "Post", icon: NotebookPen },
  { key: "bookmarks", label: "Bookmarks", icon: BookmarkPlus }
];

const noticeToneClasses: Record<NoticeTone, string> = {
  neutral: "border-white/35 bg-white/55 text-foreground",
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

export function StudioShell({ studio }: { studio: StudioBridge }) {
  const overview = useQuery(api.site.overview, {}) as SiteOverview | undefined;
  const [view, setView] = useState<ViewKey>("dashboard");
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busyView, setBusyView] = useState<ViewKey | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [postDraft, setPostDraft] = useState({ title: "", body: "" });
  const [bookmarkDraft, setBookmarkDraft] = useState({ url: "", note: "" });

  const showNotice = useCallback((title: string, detail: string, tone: NoticeTone = "neutral") => {
    setNotice({ title, detail, tone });
  }, []);

  const refreshStatus = useCallback(
    async (silent = true) => {
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
    void refreshStatus(false);

    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshStatus]);

  const metrics = useMemo(
    () => [
      { label: "Posts", value: String(overview?.postCount ?? status?.postCount ?? 0), icon: BookOpenText },
      { label: "Bookmarks", value: String(overview?.bookmarkCount ?? status?.bookmarkCount ?? 0), icon: BookmarkPlus },
      { label: "Convex", value: status?.convexReachable ? "Live" : status?.convexConfigured ? "Check link" : "Missing", icon: Database }
    ],
    [overview, status]
  );

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

  return (
    <div className="min-h-screen px-4 pb-4 pt-12 text-foreground sm:px-6">
      <div className="titlebar-drag fixed inset-x-0 top-0 z-50 h-12" />

      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="titlebar-no-drag flex h-full flex-col border-0 xl:max-h-[calc(100vh-4rem)]">
          <CardHeader className="space-y-5 pb-4">
            <div className="grid gap-3">
              <Badge variant="secondary" className="w-fit gap-2 px-3 py-1">
                <Radio className="h-3.5 w-3.5" />
                Studio
              </Badge>
              <div>
                <CardTitle className="text-2xl">NarukeAlpha</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Local writing surface, hosted Convex sync.</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-5">
            <nav className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.key === view;

                return (
                  <Button
                    key={item.key}
                    variant={active ? "secondary" : "ghost"}
                    className={cn("justify-start", active && "bg-white/55")}
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
                  <div key={metric.label} className="rounded-[1.6rem] border border-white/30 bg-white/45 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-3 font-serif text-3xl text-foreground">{metric.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto grid gap-3 rounded-[1.8rem] border border-white/30 bg-white/45 px-4 py-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <FolderOpenDot className="h-4 w-4 shrink-0" />
                <span className="truncate">{status ? shortenPath(status.rootDir) : loadingStatus ? "Loading workspace" : "Unavailable"}</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDriveDownload className="h-4 w-4 shrink-0" />
                <span className="truncate">{status ? shortenPath(status.thumbnailsDir) : "Waiting for cache path"}</span>
              </div>
              <div className={cn("flex items-center gap-2", status?.opencodeReady ? "text-success" : "text-warning")}>
                {status?.opencodeReady ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span>{status?.opencodeReady ? "OpenCode ready" : "OpenCode spins up on demand"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <main className="titlebar-no-drag flex min-w-0 flex-col gap-4">
          {notice ? (
            <div className={cn("rounded-[1.8rem] border px-4 py-3", noticeToneClasses[notice.tone])}>
              <p className="text-sm font-medium">{notice.title}</p>
              <p className="mt-1 text-sm opacity-90">{notice.detail}</p>
            </div>
          ) : null}

          {view === "dashboard" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card className="border-0">
                <CardHeader className="border-b border-white/35 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="w-fit">Overview</Badge>
                      <CardTitle className="mt-3 text-3xl">The live publishing loop</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => void refreshStatus(false)} aria-label="Refresh studio status">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      {status?.publicSiteUrl ? (
                        <Button size="sm" onClick={() => void studio.openExternal(status.publicSiteUrl!)}>
                          <ArrowUpRight className="h-4 w-4" />
                          Open site
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 p-6">
                  <div className="rounded-[1.8rem] border border-white/30 bg-white/55 p-5">
                    <p className="text-sm leading-7 text-muted-foreground">
                      Write on the MacBook, hit publish, and Convex becomes the source of truth. The site reads the same deployment live, so the Windows box only has to serve the frontend bundle.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      {
                        label: "Hosted backend",
                        detail: status?.convexReachable
                          ? "Renderer and desktop app are talking to the same Convex deployment."
                          : status?.convexConfigured
                            ? "Convex URL is set, but the deployment is not responding right now."
                            : "Add the Convex URL to .env.local before publishing.",
                        tone: status?.convexReachable ? "success" : status?.convexConfigured ? "warning" : "warning"
                      },
                      {
                        label: "Write access",
                        detail: status?.writeKeyConfigured
                          ? "The studio has a write key and can create posts and bookmarks."
                          : "Set STUDIO_WRITE_KEY locally and in Convex before sending mutations.",
                        tone: status?.writeKeyConfigured ? "success" : "warning"
                      },
                      {
                        label: "Serving plan",
                        detail: "Cloudflare + Windows firewall notes live in docs/serve-on-windows.md.",
                        tone: "neutral"
                      }
                    ].map((item) => (
                      <div key={item.label} className="rounded-[1.6rem] border border-white/30 bg-white/45 p-4">
                        <Badge variant={item.tone === "success" ? "success" : item.tone === "warning" ? "warning" : "outline"} className="w-fit">
                          {item.label}
                        </Badge>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card className="border-0">
                  <CardHeader className="pb-3">
                    <Badge variant="outline" className="w-fit">Recent posts</Badge>
                    <CardTitle className="text-2xl">Fresh posts</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {overview?.latestPosts?.length ? (
                      overview.latestPosts.map((post) => (
                        <div key={post.slug} className="rounded-[1.5rem] border border-white/30 bg-white/45 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-foreground">{post.title}</p>
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{post.readingTimeMinutes} min</span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No posts yet. The first publish will show up here.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0">
                  <CardHeader className="pb-3">
                    <Badge variant="outline" className="w-fit">Bookmarks</Badge>
                    <CardTitle className="text-2xl">Latest saves</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {overview?.latestBookmarks?.length ? (
                      overview.latestBookmarks.map((bookmark) => (
                        <div key={bookmark.url} className="rounded-[1.5rem] border border-white/30 bg-white/45 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-foreground">{bookmark.title}</p>
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{formatDate(bookmark.addedAt)}</span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{bookmark.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Bookmark research results land here after OpenCode enriches them.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {view === "post" ? (
            <Card className="border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="gap-2">
                    <NotebookPen className="h-3.5 w-3.5" />
                    Post
                  </Badge>
                  <CardTitle className="text-3xl">Ship a new post</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <form className="grid gap-4" onSubmit={handlePostSubmit}>
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
                    <Button type="submit" disabled={busyView === "post"}>
                      {busyView === "post" ? "Publishing..." : "Publish to Convex"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {view === "bookmarks" ? (
            <Card className="border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Bookmark
                  </Badge>
                  <CardTitle className="text-3xl">Research and publish a link</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <form className="grid gap-4" onSubmit={handleBookmarkSubmit}>
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
                    <Button type="submit" disabled={busyView === "bookmarks"}>
                      {busyView === "bookmarks" ? "Publishing..." : "Publish bookmark"}
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
