import { useLocation } from "wouter";
import { ArrowUpRight, NotebookPen, BookmarkPlus, RefreshCw } from "lucide-react";
import { Button } from "@studio/components/ui/button";
import { HealthStrip } from "@studio/components/dashboard/health-strip";
import { RecentPosts } from "@studio/components/dashboard/recent-posts";
import { RecentBookmarks } from "@studio/components/dashboard/recent-bookmarks";
import { useStudio } from "@studio/providers/studio-context";
import { cn } from "@studio/lib/utils";

export function DashboardPage() {
  const { status, isLoadingStatus, refreshStatus, bridge } = useStudio();
  const [, setLocation] = useLocation();

  const needsSetup = !status.convexConfigured || !status.deployKeyConfigured;

  return (
    <div className="mx-auto max-w-5xl space-y-6 fade-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">Overview of your writing studio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refreshStatus(false)}
            disabled={isLoadingStatus}
            aria-label="Refresh status"
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingStatus && "animate-spin")} />
          </Button>
          {status.publicSiteUrl ? (
            <Button variant="outline" size="sm" onClick={() => void bridge.openExternal(status.publicSiteUrl!)}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              Open site
            </Button>
          ) : null}
        </div>
      </div>

      <HealthStrip />

      {needsSetup ? (
        <div className="rounded-xl border border-warning/20 bg-warning/8 p-4">
          <p className="text-sm text-warning">
            Publishing is blocked. Add a Convex URL and studio write key in{" "}
            <button type="button" className="underline" onClick={() => setLocation("/settings")}>Settings</button>{" "}
            to get started.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentPosts />
        <RecentBookmarks />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setLocation("/post")} className="gap-2">
          <NotebookPen className="h-4 w-4" />
          New Post
        </Button>
        <Button variant="outline" onClick={() => setLocation("/bookmarks")} className="gap-2">
          <BookmarkPlus className="h-4 w-4" />
          New Bookmark
        </Button>
      </div>
    </div>
  );
}
