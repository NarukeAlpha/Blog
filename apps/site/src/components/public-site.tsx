import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { api } from "@convex/_generated/api";
import type { AiResearchSummaryRecord, PostRecord, PublicBookmarkRecord } from "@shared/types";
import { formatDate } from "@shared/text";
import "./public-site.css";

type ContentTab = "journal" | "research" | "bookmarks";

function parseHash() {
  const normalizedHash = window.location.hash.replace(/^#/, "");

  if (normalizedHash.startsWith("research/")) {
    return { tab: "research" as const, slug: normalizedHash.slice("research/".length) || null };
  }

  if (normalizedHash === "bookmarks") {
    return { tab: "bookmarks" as const, slug: null };
  }

  if (normalizedHash.startsWith("post/")) {
    return { tab: "journal" as const, slug: normalizedHash.slice("post/".length) || null };
  }

  return { tab: "journal" as const, slug: null };
}

function useActiveSlug(slugs: string[], hashPrefix: "post" | "research") {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const syncFromHash = () => {
      const normalizedHash = window.location.hash.replace(/^#/, "");
      const hashSlug = normalizedHash.startsWith(`${hashPrefix}/`) ? normalizedHash.slice(hashPrefix.length + 1) : null;

      if (hashSlug !== null) {
        setActiveSlug(hashSlug || null);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [hashPrefix]);

  useEffect(() => {
    if (!slugs.length) {
      setActiveSlug(null);
      return;
    }

    if (!activeSlug || !slugs.includes(activeSlug)) {
      setActiveSlug(slugs[0]);
    }
  }, [activeSlug, slugs]);

  return [activeSlug, setActiveSlug] as const;
}

export function PublicSite() {
  const posts: PostRecord[] = useQuery(api.public.listPosts, {}) ?? [];
  const aiResearchEntries: AiResearchSummaryRecord[] = useQuery(api.public.listAiResearch, {}) ?? [];
  const bookmarks: PublicBookmarkRecord[] = useQuery(api.public.listBookmarks, {}) ?? [];
  const [activePostSlug, setActivePostSlug] = useActiveSlug(posts.map((post) => post.slug), "post");
  const [activeAiResearchSlug, setActiveAiResearchSlug] = useActiveSlug(aiResearchEntries.map((entry) => entry.slug), "research");
  const activePost = useMemo(() => posts.find((post) => post.slug === activePostSlug) ?? posts[0] ?? null, [activePostSlug, posts]);
  const activeAiResearchSummary = useMemo(
    () => aiResearchEntries.find((entry) => entry.slug === activeAiResearchSlug) ?? aiResearchEntries[0] ?? null,
    [activeAiResearchSlug, aiResearchEntries]
  );
  const activeAiResearch = useQuery(
    api.public.getAiResearchBySlug,
    activeAiResearchSlug ? { slug: activeAiResearchSlug } : "skip"
  );
  const isAiResearchLoading = activeAiResearchSlug !== null && activeAiResearch === undefined;
  const isAiResearchMissing = activeAiResearchSlug !== null && activeAiResearch === null;
  const highlightedBookmarks = bookmarks.slice(0, 4);
  const latest = posts[0] ?? null;

  const [activeTab, setActiveTab] = useState<ContentTab>(() => parseHash().tab);

  useEffect(() => {
    const syncTabFromHash = () => {
      setActiveTab(parseHash().tab);
    };

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);

    return () => {
      window.removeEventListener("hashchange", syncTabFromHash);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "journal" && activePostSlug) {
      window.history.replaceState(null, "", `#post/${activePostSlug}`);
      return;
    }

    if (activeTab === "research" && activeAiResearchSlug) {
      window.history.replaceState(null, "", `#research/${activeAiResearchSlug}`);
      return;
    }

    if (activeTab === "bookmarks") {
      window.history.replaceState(null, "", "#bookmarks");
    }
  }, [activeAiResearchSlug, activePostSlug, activeTab]);

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
            <span><strong className="pub-stat-value pub-stat-value--cyan">{aiResearchEntries.length}</strong> research files</span>
            <span><strong className="pub-stat-value pub-stat-value--amber">{bookmarks.length}</strong> bookmarks</span>
            <span>
              <strong className="pub-stat-value pub-stat-value--purple">
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
              onClick={() => setActiveTab("research")}
              className={`pub-content-tab ${activeTab === "research" ? "pub-content-tab--active" : ""}`}
            >
              <span className="pub-label-icon--purple">◈</span> ai research
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
                          setActivePostSlug(post.slug);
                          setActiveTab("journal");
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

          {/* ── AI RESEARCH TAB ── */}
          {activeTab === "research" && (
            <div className="pub-tab-body">
              <div className="pub-nav-scroll">
                {aiResearchEntries.length ? (
                  aiResearchEntries.map((entry) => {
                    const isActive = entry.slug === activeAiResearchSummary?.slug;
                    return (
                      <button
                        key={entry.slug}
                        type="button"
                        onClick={() => {
                          setActiveAiResearchSlug(entry.slug);
                          setActiveTab("research");
                        }}
                        className={`pub-nav-tab ${isActive ? "pub-nav-tab--active" : ""}`}
                      >
                        {entry.title}
                        <span className={`pub-tab-time ${isActive ? "pub-tab-time--active" : ""}`}>
                          {entry.readingTimeMinutes}m
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <span className="pub-empty-text">No AI research files yet.</span>
                )}
              </div>

              <article className="pub-article" id="research">
                {activeAiResearch !== undefined && activeAiResearch !== null ? (
                  <>
                    <div className="pub-article-header">
                      <p className="pub-article-meta">
                        {formatDate(activeAiResearch.publishedAt)} · {activeAiResearch.readingTimeMinutes} min read · {activeAiResearch.model}
                      </p>
                      <h2 className="pub-article-title">{activeAiResearch.title}</h2>
                    </div>
                    <section className="pub-research-prompt">
                      <p className="pub-research-prompt-label">Prompt</p>
                      <p className="pub-research-prompt-body">{activeAiResearch.prompt}</p>
                    </section>
                    <div className="ink-prose pub-article-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeAiResearch.body}</ReactMarkdown>
                    </div>
                  </>
                ) : isAiResearchLoading ? (
                  <p className="pub-article-empty">Loading AI research file...</p>
                ) : isAiResearchMissing ? (
                  <p className="pub-article-empty">AI research file not found.</p>
                ) : (
                  <p className="pub-article-empty">Waiting for the first AI research file to land...</p>
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
