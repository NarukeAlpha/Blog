import { useLocation } from "wouter";
import {
  BookmarkPlus,
  Database,
  NotebookPen,
  Settings2,
} from "lucide-react";
import { Badge } from "@studio/components/ui/badge";
import { Button } from "@studio/components/ui/button";
import { cn } from "@studio/lib/utils";
import { useStudio } from "@studio/providers/studio-context";

const navItems = [
  { path: "/", label: "Dashboard", icon: Database, shortcut: "⌘1" },
  { path: "/post", label: "New Post", icon: NotebookPen, shortcut: "⌘2" },
  { path: "/bookmarks", label: "Bookmarks", icon: BookmarkPlus, shortcut: "⌘3" },
  { path: "/settings", label: "Settings", icon: Settings2, shortcut: "⌘4" },
] as const;

const envLabels = { dev: "Dev", prod: "Prod" } as const;

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { status } = useStudio();

  const envLabel = envLabels[status.activeEnvironment];

  return (
    <aside className="titlebar-no-drag flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-card/60 px-3 py-4">
      <div className="mb-5 px-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground/70">Workspace</p>
        <Badge variant="outline" className="mt-1.5 gap-1.5 text-[10px]">
          <span className={cn("h-1.5 w-1.5 rounded-full", status.convexReachable ? "bg-success" : "bg-destructive")} />
          {envLabel}
        </Badge>
      </div>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.path;

          return (
            <Button
              key={item.path}
              variant={active ? "secondary" : "ghost"}
              className={cn("justify-start gap-2.5 text-[13px]", active && "bg-accent/12 text-foreground")}
              onClick={() => setLocation(item.path)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              <span className="ml-auto text-[10px] text-muted-foreground/60">{item.shortcut}</span>
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", status.convexReachable ? "bg-success" : "bg-destructive")} />
          <span className="text-muted-foreground">Convex: {status.convexReachable ? "Live" : status.convexConfigured ? "Offline" : "Not set"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", status.opencodeReady ? "bg-success" : status.opencodeConfigured ? "bg-warning" : "bg-muted-foreground/40")} />
          <span className="text-muted-foreground">OpenCode: {status.opencodeReady ? "Ready" : status.opencodeConfigured ? "Idle" : "Off"}</span>
        </div>
        <div className="mt-1 flex gap-3 border-t border-border pt-2 text-muted-foreground/70">
          <span>posts: {status.postCount ?? "–"}</span>
          <span>saves: {status.bookmarkCount ?? "–"}</span>
        </div>
      </div>
    </aside>
  );
}
