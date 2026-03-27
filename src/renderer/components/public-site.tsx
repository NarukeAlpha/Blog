import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { api } from "../../../convex/api";
import type { BookmarkRecord, PostRecord } from "@/lib/studio";
import { formatDate } from "../../../lib/text";
import "./public-site.css";

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

type ContentTab = "journal" | "bookmarks";

export function PublicSite() {
  const posts = (useQuery(api.posts.list, {}) ?? []) as PostRecord[];
  const bookmarks = (useQuery(api.bookmarks.list, {}) ?? []) as BookmarkRecord[];
  const [activeSlug, setActiveSlug] = useActiveSlug(posts.map((post) => post.slug));
  const activePost = useMemo(() => posts.find((post) => post.slug === activeSlug) ?? posts[0] ?? null, [activeSlug, posts]);
  const highlightedBookmarks = bookmarks.slice(0, 4);
  const latest = posts[0] ?? null;

  const [activeTab, setActiveTab] = useState<ContentTab>("journal");

  return (
    <div className="site-shell pub-shell">
      <div className="stardust-overlay" />

      {/* ── floating twinkle particles ── */}
      <div className="pub-twinkle-layer" aria-hidden>
        {[...Array(14)].map((_, i) => (
          <span
            key={i}
            className="pub-twinkle"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              top: `${8 + (i * 7.3) % 85}%`,
              left: `${5 + (i * 8.7) % 90}%`,
              animation: `twinkle ${2 + (i % 4) * 0.8}s ease-in-out ${i * 0.4}s infinite`,
              filter:
                i % 3 === 0
                  ? "drop-shadow(0 0 4px rgba(120,80,255,0.8))"
                  : i % 3 === 1
                    ? "drop-shadow(0 0 4px rgba(0,210,230,0.7))"
                    : "drop-shadow(0 0 3px rgba(255,255,255,0.6))",
            }}
          />
        ))}
      </div>

      {/* ═══════════════ MAIN COLUMN ═══════════════ */}
      <div className="pub-main">
        {/* ── HERO / HEADER ── */}
        <header className="pub-reveal pub-hero pub-panel">
          <h1 className="pub-title">Naruke Alpha</h1>
          <p className="pub-subtitle">
            <span className="pub-subtitle-prefix">~/</span>ADA
            <span className="pub-cursor">▌</span>
          </p>

          <div className="pub-divider" />

          <div className="pub-reveal pub-reveal-1 pub-stats">
            <span><strong className="pub-stat-value pub-stat-value--purple">{posts.length}</strong> posts</span>
            <span><strong className="pub-stat-value pub-stat-value--cyan">{bookmarks.length}</strong> bookmarks</span>
            <span>
              <strong className="pub-stat-value pub-stat-value--amber">
                {latest ? formatDate(latest.publishedAt) : "—"}
              </strong>{" "}
              latest
            </span>
          </div>
        </header>

        {/* ── CONTENT TAB SWITCHER ── */}
        <div className="pub-reveal pub-reveal-2 pub-panel pub-content-section">
          <div className="pub-tab-bar">
            <button
              type="button"
              onClick={() => setActiveTab("journal")}
              className={`pub-content-tab ${activeTab === "journal" ? "pub-content-tab--active" : ""}`}
            >
              <span className="pub-label-icon--cyan">▸</span> journal entries
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bookmarks")}
              className={`pub-content-tab ${activeTab === "bookmarks" ? "pub-content-tab--active" : ""}`}
            >
              <span className="pub-label-icon--amber">◆</span> reading list
            </button>
          </div>

          {/* ── JOURNAL TAB ── */}
          {activeTab === "journal" && (
            <div className="pub-tab-body">
              {/* post navigation pills */}
              <div className="pub-nav-scroll">
                {posts.length ? (
                  posts.map((post) => {
                    const isActive = post.slug === activePost?.slug;
                    return (
                      <button
                        key={post.slug}
                        type="button"
                        onClick={() => {
                          setActiveSlug(post.slug);
                          window.history.replaceState(null, "", `#post/${post.slug}`);
                        }}
                        className={`pub-nav-tab ${isActive ? "pub-nav-tab--active" : ""}`}
                      >
                        {post.title}
                        <span className={`pub-tab-time ${isActive ? "pub-tab-time--active" : ""}`}>
                          {post.readingTimeMinutes}m
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <span className="pub-empty-text">
                    No posts yet — publish one from the studio.
                  </span>
                )}
              </div>

              {/* active post reading pane */}
              <article className="pub-article" id="journal">
                {activePost ? (
                  <>
                    <div className="pub-article-header">
                      <p className="pub-article-meta">
                        {formatDate(activePost.publishedAt)} · {activePost.readingTimeMinutes} min read
                      </p>
                      <h2 className="pub-article-title">{activePost.title}</h2>
                    </div>
                    <div className="ink-prose pub-article-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{activePost.body}</ReactMarkdown>
                    </div>
                  </>
                ) : (
                  <p className="pub-article-empty">Waiting for the first post to land…</p>
                )}
              </article>
            </div>
          )}

          {/* ── BOOKMARKS TAB ── */}
          {activeTab === "bookmarks" && (
            <div className="pub-tab-body">
              {highlightedBookmarks.length > 0 ? (
                <div className="pub-timeline">
                  <div className="pub-timeline-line" />

                  {highlightedBookmarks.map((bm) => (
                    <a
                      key={bm.url}
                      href={bm.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`pub-bookmark ${bm.thumbnailUrl ? "pub-bookmark--with-thumb" : ""}`}
                    >
                      <div className="pub-timeline-dot" />

                      {bm.thumbnailUrl && (
                        <img
                          src={bm.thumbnailUrl}
                          alt={bm.title}
                          className="pub-bookmark-thumb"
                        />
                      )}
                      <div>
                        <div className="pub-bookmark-header">
                          <div>
                            <p className="pub-bookmark-title">{bm.title}</p>
                            <p className="pub-bookmark-source">{bm.source}</p>
                          </div>
                          <ArrowUpRight size={14} className="pub-bookmark-arrow" />
                        </div>
                        <p className="pub-bookmark-desc">{bm.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="pub-empty-text">No bookmarks yet.</p>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="pub-footer">
          why are you reading this
        </footer>
      </div>
    </div>
  );
}
