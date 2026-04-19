import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@studio/components/ui/badge";
import { cn } from "@studio/lib/utils";
import { useStudio } from "@studio/providers/studio-context";

const routeMeta: Record<string, { label: string; detail: string }> = {
  "/": { label: "Dashboard", detail: "Overview, status, and recent activity" },
  "/post": { label: "New Post", detail: "Draft and publish long-form writing" },
  "/bookmarks": { label: "Bookmarks", detail: "Save links and edit them in place" },
  "/settings": { label: "Settings", detail: "Connections, keys, and local tooling" }
};

function getPlatformPadding() {
  if (typeof navigator === "undefined") {
    return "px-5";
  }

  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent ??
    "";
  return /mac/i.test(platform) ? "pl-20 pr-5" : "pl-5 pr-36";
}

export function Titlebar() {
  const [location] = useLocation();
  const { status, isLoadingStatus } = useStudio();
  const route = routeMeta[location] ?? routeMeta["/"];
  const edgePadding = getPlatformPadding();

  return (
    <header className="titlebar-drag glass-heavy relative z-20 border-b border-border/80">
      <div className={cn("flex h-14 items-center justify-between gap-4", edgePadding)}>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold uppercase tracking-[0.28em] text-foreground">Writer Studio</h1>
          <p className="truncate text-xs text-muted-foreground">
            {route.label}
            <span className="mx-2 text-muted-foreground/45">/</span>
            {route.detail}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", status.activeEnvironment === "prod" ? "bg-primary" : "bg-warning")} />
            {status.activeEnvironment === "prod" ? "Prod" : "Dev"}
          </Badge>
          <Badge variant={status.convexReachable ? "success" : status.convexConfigured ? "warning" : "outline"} className="gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", status.convexReachable ? "bg-success" : status.convexConfigured ? "bg-warning" : "bg-muted-foreground/40")} />
            {status.convexReachable ? "Convex Live" : status.convexConfigured ? "Convex Offline" : "Convex Unset"}
          </Badge>
          {isLoadingStatus ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/25 px-2.5 py-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
