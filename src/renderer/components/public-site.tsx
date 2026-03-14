import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpRight, BookOpenText, Layers3, Radio, Zap } from "lucide-react";
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
      {/* Color overlay on top of stardust background */}
      <div className="stardust-overlay" />

      {/* Floating twinkle particles */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              top: `${8 + (i * 7.3) % 85}%`,
              left: `${5 + (i * 8.7) % 90}%`,
              opacity: 0.3,
              animation: `twinkle ${2 + (i % 4) * 0.8}s ease-in-out ${i * 0.4}s infinite`,
              filter: i % 3 === 0 ? "drop-shadow(0 0 4px rgba(120,80,255,0.8))" : i % 3 === 1 ? "drop-shadow(0 0 4px rgba(0,210,230,0.7))" : "drop-shadow(0 0 3px rgba(255,255,255,0.6))",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <Card className="border-0 fade-up overflow-hidden">
            <CardContent className="relative p-8 sm:p-10">
              <div className="orb -left-12 top-0 h-40 w-40" />
              <div className="orb orb-alt -right-10 bottom-4 h-32 w-32" />
              <div className="orb-glow right-1/4 -top-8 h-48 w-48" />
              <div className="relative grid gap-6">
                <div className="flex items-center gap-3">
                  <Badge className="w-fit gap-2 px-3 py-1 border-purple-500/30 bg-purple-500/10 text-purple-300">
                    <Radio className="h-3.5 w-3.5 animate-pulse" />
                    Alpha Dev Ah-Jin
                  </Badge>
                </div>
                <div className="grid gap-4">
                  <h1 className="max-w-2xl font-serif text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(120,80,255,0.3)]">
                    Gabriel's Blog
                  </h1>
                  <p className="inline-block text-sm font-medium tracking-widest uppercase bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-[length:200%_auto] bg-clip-text text-transparent" style={{ animation: "shimmer 28s linear infinite" }}>
                    ✦ Thoughts about AI and general life philosophy ✦
                  </p>
                  <div className="neon-line mt-2 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Posts live", value: String(posts.length), icon: BookOpenText, color: "text-purple-400" },
              { label: "Bookmarks saved", value: String(bookmarks.length), icon: Layers3, color: "text-cyan-400" },
              { label: "Latest dispatch", value: latestPost ? formatDate(latestPost.publishedAt) : "Soon", icon: Zap, color: "text-amber-400" }
            ].map((metric) => {
              const Icon = metric.icon;

              return (
                <Card key={metric.label} className={`border-0 fade-up ${metric.label === "Latest dispatch" ? "sm:col-span-2" : ""}`}>
                  <CardContent className="flex items-center justify-between gap-4 p-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 font-serif text-3xl font-semibold text-foreground">{metric.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ${metric.color} shadow-neon border border-white/10`}>
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
            <CardHeader className="border-b border-white/10 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Badge variant="outline" className="w-fit border-purple-500/30 text-purple-300">Selected post</Badge>
                  <CardTitle className="mt-3 text-3xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">{activePost?.title ?? "Loading dispatch"}</CardTitle>
                </div>
                {activePost ? (
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDate(activePost.publishedAt)}</p>
                    <p className="text-cyan-400/70">{activePost.readingTimeMinutes} min read</p>
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
                <Badge variant="outline" className="w-fit border-cyan-500/30 text-cyan-300">Journal queue</Badge>
                <CardTitle className="text-2xl">Pick a dispatch</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {posts.length ? (
                  posts.map((post) => (
                    <button
                      key={post.slug}
                      type="button"
                      className={`rounded-[1.6rem] border p-4 text-left transition-all ${
                        post.slug === activePost?.slug
                          ? "border-purple-500/40 bg-purple-500/10 shadow-neon"
                          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/20"
                      }`}
                      onClick={() => {
                        setActiveSlug(post.slug);
                        window.history.replaceState(null, "", `#post/${post.slug}`);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{post.title}</p>
                        <span className="text-xs uppercase tracking-[0.18em] text-purple-400/70">{post.readingTimeMinutes} min</span>
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
                <Badge variant="outline" className="w-fit border-amber-500/30 text-amber-300">Reading list</Badge>
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
                      className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-purple-500/20 hover:shadow-neon"
                    >
                      {bookmark.thumbnailUrl ? (
                        <div className="aspect-[16/9] overflow-hidden border-b border-white/10 bg-black/30">
                          <img src={bookmark.thumbnailUrl} alt={bookmark.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] opacity-90 group-hover:opacity-100" />
                        </div>
                      ) : null}
                      <div className="grid gap-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{bookmark.title}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-cyan-400/60">{bookmark.source}</p>
                          </div>
                          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-purple-400/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-purple-400" />
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
