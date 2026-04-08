import { useStudio } from "@studio/providers/studio-context";
import { Card, CardContent, CardHeader, CardTitle } from "@studio/components/ui/card";

export function RecentPosts() {
  const { status } = useStudio();
  const posts = status.overview?.latestPosts;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Recent Posts</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 max-h-[450px] overflow-y-auto">
        {posts?.length ? (
          posts.slice(0, 8).map((post) => (
            <div key={post.slug} className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50 min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <p className="truncate text-sm font-medium text-foreground flex-1 min-w-0">{post.title}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{post.readingTimeMinutes} min</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.excerpt}</p>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {status.convexConfigured ? "No posts yet. Write your first one!" : "Connect Convex in Settings to see posts."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
