import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BookmarkPlus,
  ExternalLink,
  FolderGit2,
  Globe,
  PenSquare,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { StudioBridge, StudioStatus } from "@/lib/studio";
import { cn } from "@/lib/utils";

const BLOG_URL = "https://narukealpha.github.io/Blog/";

type ViewKey = "dashboard" | "post" | "bookmarks";
type ActivityTone = "neutral" | "success" | "warning" | "error";

interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  tone: ActivityTone;
  at: string;
}


const navItems: Array<{ key: ViewKey; label: string; icon: typeof Globe }> = [
  { key: "dashboard", label: "Dashboard", icon: Globe },
  { key: "post", label: "Post", icon: PenSquare },
  { key: "bookmarks", label: "Bookmarks", icon: BookmarkPlus }
];

const activityToneClasses: Record<ActivityTone, string> = {
  neutral: "bg-muted-foreground/40",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive"
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(iso));
}

function shortenPath(filePath: string) {
  const parts = filePath.split(/[/\\]/).filter(Boolean);
  return parts.slice(-3).join("/");
}


function App() {
  const studio = (window.studio as StudioBridge | undefined) ?? undefined;
  const [view, setView] = useState<ViewKey>("dashboard");
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busyView, setBusyView] = useState<ViewKey | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [postDraft, setPostDraft] = useState({ title: "", summary: "", tags: "", body: "" });
  const [bookmarkDraft, setBookmarkDraft] = useState({ url: "", note: "" });

  const pushActivity = useCallback((title: string, detail: string, tone: ActivityTone = "neutral") => {
    setActivity((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        detail,
        tone,
        at: new Date().toISOString()
      },
      ...current
    ].slice(0, 14));
  }, []);

  const refreshStatus = useCallback(
    async (silent = true) => {
      try {
        if (!studio) {
          throw new Error("Studio bridge is unavailable.");
        }

        const next = await studio.getStatus();
        setStatus(next);

        if (!silent) {
          pushActivity("Ready", `${next.postCount} posts · ${next.bookmarkCount} bookmarks`);
        }
      } catch (error) {
        if (!silent) {
          pushActivity("Status", getErrorMessage(error), "error");
        }
      } finally {
        setLoadingStatus(false);
      }
    },
    [pushActivity]
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
      { label: "Posts", value: String(status?.postCount ?? 0) },
      { label: "Bookmarks", value: String(status?.bookmarkCount ?? 0) }
    ],
    [status]
  );

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyView("post");
    pushActivity("Post", "Publishing");

    try {
      if (!studio) {
        throw new Error("Studio bridge is unavailable.");
      }

      const result = await studio.publishPost(postDraft);
      pushActivity(result.pushed ? "Post pushed" : "Post saved", result.post.title, result.pushed ? "success" : "warning");

      if (result.warning) {
        pushActivity("Git", result.warning, "warning");
      }

      setPostDraft({ title: "", summary: "", tags: "", body: "" });
      setView("dashboard");
      setFrameKey((current) => current + 1);
      await refreshStatus();
    } catch (error) {
      const message = getErrorMessage(error);
      pushActivity("Post failed", message, "error");
    } finally {
      setBusyView(null);
    }
  }

  async function handleBookmarkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyView("bookmarks");
    pushActivity("Bookmark", "Researching");

    try {
      if (!studio) {
        throw new Error("Studio bridge is unavailable.");
      }

      const result = await studio.publishBookmark(bookmarkDraft);
      pushActivity(
        result.pushed ? "Bookmark pushed" : "Bookmark saved",
        result.bookmark.title,
        result.pushed ? "success" : "warning"
      );

      if (result.warning) {
        pushActivity("Git", result.warning, "warning");
      }

      setBookmarkDraft({ url: "", note: "" });
      setView("dashboard");
      setFrameKey((current) => current + 1);
      await refreshStatus();
    } catch (error) {
      const message = getErrorMessage(error);
      pushActivity("Bookmark failed", message, "error");
    } finally {
      setBusyView(null);
    }
  }

  return (
    <div className="min-h-screen text-foreground">
      {/* Titlebar drag region */}
      <div className="titlebar-drag fixed inset-x-0 top-0 z-50 h-12" />

      <div className="grid min-h-screen grid-cols-1 gap-4 p-4 pt-12 xl:grid-cols-[240px_minmax(0,1fr)_220px]">
        {/* Sidebar */}
        <Card className="titlebar-no-drag flex h-full flex-col glass-heavy xl:max-h-[calc(100vh-4rem)]">
          <CardHeader className="space-y-4 pb-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">Studio</Badge>
              <div>
                <CardTitle className="text-xl">NarukeAlpha</CardTitle>
                <p className="text-sm text-muted-foreground">Blog control</p>
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
                    className={cn("justify-start", active && "bg-white/40")}
                    onClick={() => setView(item.key)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <Separator className="bg-white/30" />

            <div className="grid gap-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="glass-subtle rounded-2xl px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 font-serif text-2xl">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto glass-subtle rounded-2xl px-4 py-3 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center gap-2">
                <FolderGit2 className="h-4 w-4" />
                <span className="truncate">{status ? shortenPath(status.rootDir) : loadingStatus ? "Loading" : "Unavailable"}</span>
              </div>
              <div className={cn("flex items-center gap-2", status?.opencodeReady ? "text-green-600" : "text-amber-600")} style={{ opacity: 1 }}>
                {status?.opencodeReady ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span className="font-medium">{status?.opencodeReady ? "Agent online" : "Agent offline"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content */}
        <main className="titlebar-no-drag min-w-0 xl:max-h-[calc(100vh-4rem)]">
          {view === "dashboard" ? (
            <Card className="flex h-full min-h-[70vh] flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-white/20 pb-4">
                <div>
                  <CardTitle className="text-xl">Dashboard</CardTitle>
                  <p className="text-sm text-muted-foreground">narukealpha.github.io/Blog</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setFrameKey((current) => current + 1)} aria-label="Reload blog view">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => void studio?.openExternal(BLOG_URL)}>
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="min-h-0 flex-1 p-3">
                <div className="h-full overflow-hidden rounded-[1.4rem] border border-white/25 bg-white/50">
                  <iframe
                    key={frameKey}
                    src={BLOG_URL}
                    title="NarukeAlpha Blog"
                    className="h-full min-h-[64vh] w-full"
                    sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {view === "post" ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Badge>Post</Badge>
                  <CardTitle className="text-xl">Compose</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <form className="grid gap-4" onSubmit={handlePostSubmit}>
                  <Input
                    placeholder="Title"
                    value={postDraft.title}
                    onChange={(event) => setPostDraft((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Summary"
                    value={postDraft.summary}
                    onChange={(event) => setPostDraft((current) => ({ ...current, summary: event.target.value }))}
                  />
                  <Input
                    placeholder="Tags"
                    value={postDraft.tags}
                    onChange={(event) => setPostDraft((current) => ({ ...current, tags: event.target.value }))}
                  />
                  <Textarea
                    placeholder="Markdown"
                    className="min-h-[420px] resize-y"
                    value={postDraft.body}
                    onChange={(event) => setPostDraft((current) => ({ ...current, body: event.target.value }))}
                    required
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={busyView === "post"}>
                      {busyView === "post" ? "Publishing..." : "Publish"}
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
                  <Badge>Bookmarks</Badge>
                  <CardTitle className="text-xl">Queue</CardTitle>
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
                    placeholder="Note"
                    className="min-h-[220px] resize-y"
                    value={bookmarkDraft.note}
                    onChange={(event) => setBookmarkDraft((current) => ({ ...current, note: event.target.value }))}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className="max-w-full truncate">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      OpenCode fills the card
                    </Badge>
                    <Button type="submit" disabled={busyView === "bookmarks"}>
                      {busyView === "bookmarks" ? "Publishing..." : "Publish"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </main>

        {/* Right sidebar */}
        <aside className="titlebar-no-drag flex min-h-0 flex-col gap-4 xl:max-h-[calc(100vh-4rem)]">
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto pr-2">
              <div className="grid gap-3">
                {activity.length ? (
                  activity.map((item) => (
                    <div key={item.id} className="glass-subtle rounded-2xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", activityToneClasses[item.tone])} />
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                        <span className="ml-auto text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{formatTime(item.at)}</span>
                      </div>
                      <p className="mt-2 break-words text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Waiting.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default App;
