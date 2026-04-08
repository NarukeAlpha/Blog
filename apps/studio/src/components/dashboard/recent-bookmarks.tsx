import { useStudio } from "@studio/providers/studio-context";
import { Card, CardContent, CardHeader, CardTitle } from "@studio/components/ui/card";
import { formatDate } from "@shared/text";

export function RecentBookmarks() {
  const { status } = useStudio();
  const bookmarks = status.overview?.latestBookmarks;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Recent Bookmarks</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 max-h-[450px] overflow-y-auto">
        {bookmarks?.length ? (
          bookmarks.slice(0, 8).map((bookmark) => (
            <div key={bookmark.url} className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50 min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <p className="truncate text-sm font-medium text-foreground flex-1 min-w-0">{bookmark.title}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(bookmark.addedAt)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{bookmark.description}</p>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {status.convexConfigured ? "No bookmarks yet. Save your first link!" : "Connect Convex in Settings to see bookmarks."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
