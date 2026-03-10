import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpRight, BookOpenText,  Layers3,  Radio, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { api } from "../../../convex/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookmarkRecord, PostRecord } from "@/lib/studio";
import { formatDate } from "../../../lib/text";

function useActiveSlug(slugs: string[]) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const syncFromHash = () => {
      const normalizedHash = window.location.hash.replace(/^#/, "");
      const hashSlug = normalizedHash.startsWith("post/") ? normalizedHash.slice(5) : normalizedHash;
      setActiveSlug(hashSlug || null);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

  useEffect(() => {
    if (!slugs.length) {
      setActiveSlug(null);
      return;
    }

    if (!activeSlug || !slugs.includes(activeSlug)) {
      setActiveSlug(slugs[0]);
      window.history.replaceState(null, "", `#post/${slugs[0]}`);
    }
  }, [activeSlug, slugs]);

  return [activeSlug, setActiveSlug] as const;
}

export function PublicSite() {
  const posts = (useQuery(api.posts.list, {}) ?? []) as PostRecord[];
  const bookmarks = (useQuery(api.bookmarks.list, {}) ?? []) as BookmarkRecord[];
  const [activeSlug, setActiveSlug] = useActiveSlug(posts.map((post) => post.slug));

  const activePost = useMemo(() => posts.find((post) => post.slug === activeSlug) ?? posts[0] ?? null, [activeSlug, posts]);

  const highlightedBookmarks = bookmarks.slice(0, 4);
  const latestPost = posts[0] ?? null;

  return (
    <div className="site-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <Card className="border-0 fade-up overflow-hidden">
            <CardContent className="relative p-8 sm:p-10">
              <div className="orb -left-12 top-0 h-40 w-40" />
              <div className="orb orb-alt -right-10 bottom-4 h-32 w-32" />
              <div className="relative grid gap-6">
                <Badge className="w-fit gap-2 px-3 py-1">
                  <Radio className="h-3.5 w-3.5" />
                  Alpha Dev Ah-Jin
                </Badge>
                <div className="grid gap-4">
                  <h1 className="max-w-3xl font-serif text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
                    Gabriel's Blog
                  </h1>
                  <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                    Thoughts about AI and general life philosofy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Posts live", value: String(posts.length), icon: BookOpenText },
              { label: "Bookmarks saved", value: String(bookmarks.length), icon: Layers3 },
              { label: "Latest dispatch", value: latestPost ? formatDate(latestPost.publishedAt) : "Soon", icon: Zap }
            ].map((metric) => {
              const Icon = metric.icon;

              return (
                <Card key={metric.label} className={`border-0 fade-up ${metric.label === "Latest dispatch" ? "sm:col-span-2" : ""}`}>
                  <CardContent className="flex items-center justify-between gap-4 p-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 font-serif text-3xl text-foreground">{metric.value}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-foreground shadow-panel">
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
          <Card id="journal" className="border-0 fade-up overflow-hidden">
            <CardHeader className="border-b border-white/35 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Badge variant="outline" className="w-fit">Selected post</Badge>
                  <CardTitle className="mt-3 text-3xl">{activePost?.title ?? "Loading dispatch"}</CardTitle>
                </div>
                {activePost ? (
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDate(activePost.publishedAt)}</p>
                    <p>{activePost.readingTimeMinutes} min read</p>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              {activePost ? (
                <article className="ink-prose max-w-none text-base leading-8 text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activePost.body}</ReactMarkdown>
                </article>
              ) : (
                <p className="text-muted-foreground">Waiting for the first post to land.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-0 fade-up">
              <CardHeader className="pb-3">
                <Badge variant="outline" className="w-fit">Journal queue</Badge>
                <CardTitle className="text-2xl">Pick a dispatch</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {posts.length ? (
                  posts.map((post) => (
                    <button
                      key={post.slug}
                      type="button"
                      className={`rounded-[1.6rem] border p-4 text-left transition-all ${
                        post.slug === activePost?.slug ? "border-white/60 bg-white/70 shadow-panel" : "border-white/30 bg-white/40 hover:bg-white/60"
                      }`}
                      onClick={() => {
                        setActiveSlug(post.slug);
                        window.history.replaceState(null, "", `#post/${post.slug}`);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{post.title}</p>
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{post.readingTimeMinutes} min</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No posts yet. Publish the first one from the studio.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 fade-up">
              <CardHeader className="pb-3">
                <Badge variant="outline" className="w-fit">Reading list</Badge>
                <CardTitle className="text-2xl">Fresh bookmarks</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {highlightedBookmarks.length ? (
                  highlightedBookmarks.map((bookmark) => (
                    <a
                      key={bookmark.url}
                      href={bookmark.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-[1.6rem] border border-white/30 bg-white/45 transition-all hover:bg-white/65"
                    >
                      {bookmark.thumbnailUrl ? (
                        <div className="aspect-[16/9] overflow-hidden border-b border-white/35 bg-stone-200/80">
                          <img src={bookmark.thumbnailUrl} alt={bookmark.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        </div>
                      ) : null}
                      <div className="grid gap-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{bookmark.title}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{bookmark.source}</p>
                          </div>
                          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </div>
                        <p className="text-sm text-muted-foreground">{bookmark.description}</p>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Bookmarks show up here as soon as the studio researches and saves them.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
