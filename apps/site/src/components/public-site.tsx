import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpRight, BookOpen, Bookmark, Brain, Github, Menu } from "lucide-react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const sidebarItems = activeTab === "journal"
      ? posts.map((p) => ({ key: p.slug, label: p.title, meta: `${p.readingTimeMinutes}m`, active: p.slug === activePost?.slug }))
      : activeTab === "research"
          ? aiResearchEntries.map((e) => ({ key: e.slug, label: e.title, meta: `${e.readingTimeMinutes}m`, active: e.slug === activeAiResearchSummary?.slug }))
          : [];

  const handleItemClick = (key: string) => {
    if (activeTab === "journal") {
      setActivePostSlug(key);
    } else if (activeTab === "research") {
      setActiveAiResearchSlug(key);
    }
    setMobileOpen(false);
  };

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

        {/* ── Mobile menu button ── */}
        <button
            type="button"
            className="pub-mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* ═══════════════ LAYOUT: SIDEBAR + MAIN ═══════════════ */}
        <div className="pub-layout">
          {/* ── Mobile overlay ── */}
          {mobileOpen && (
              <div
                  className="pub-mobile-overlay"
                  onClick={() => setMobileOpen(false)}
              />
          )}
          {/* ── SIDEBAR ── */}
          <aside className={`pub-sidebar ${sidebarCollapsed ? "pub-sidebar--collapsed" : ""} ${mobileOpen ? "pub-sidebar--mobile-open" : ""}`}>
            <div className="pub-sidebar-header">
              <h2 className="pub-sidebar-brand">Naruke Alpha</h2>
              <button
                  type="button"
                  className="pub-sidebar-toggle"
                  onClick={() => {
                    setSidebarCollapsed(!sidebarCollapsed);
                    if (!sidebarCollapsed) setMobileOpen(false);
                  }}
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? "▸" : "◂"}
              </button>
            </div>

            <nav className="pub-sidebar-nav">
              <button
                  type="button"
                  onClick={() => setActiveTab("journal")}
                  className={`pub-sidebar-tab ${activeTab === "journal" ? "pub-sidebar-tab--active" : ""}`}
              >
                <BookOpen size={16} className="pub-sidebar-tab-icon" />
                {!sidebarCollapsed && <span>journal entries</span>}
              </button>
              <button
                  type="button"
                  onClick={() => setActiveTab("research")}
                  className={`pub-sidebar-tab ${activeTab === "research" ? "pub-sidebar-tab--active" : ""}`}
              >
                <Brain size={16} className="pub-sidebar-tab-icon" />
                {!sidebarCollapsed && <span>ai research</span>}
              </button>
              <button
                  type="button"
                  onClick={() => setActiveTab("bookmarks")}
                  className={`pub-sidebar-tab ${activeTab === "bookmarks" ? "pub-sidebar-tab--active" : ""}`}
              >
                <Bookmark size={16} className="pub-sidebar-tab-icon" />
                {!sidebarCollapsed && <span>reading list</span>}
              </button>
            </nav>

            {/* ── Sidebar item list (for journal & research) ── */}
            {!sidebarCollapsed && (activeTab === "journal" || activeTab === "research") && (
                <div className="pub-sidebar-items">
                  <div className="pub-sidebar-items-divider" />
                  {sidebarItems.length > 0 ? (
                      <div className="pub-sidebar-items-scroll">
                        {sidebarItems.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => handleItemClick(item.key)}
                                className={`pub-sidebar-item ${item.active ? "pub-sidebar-item--active" : ""}`}
                            >
                              <span className="pub-sidebar-item-label">{item.label}</span>
                              <span className="pub-sidebar-item-meta">{item.meta}</span>
                            </button>
                        ))}
                      </div>
                  ) : (
                      <span className="pub-empty-text">
                  {activeTab === "journal"
                      ? "No posts yet — publish one from the studio."
                      : "No AI research files yet."}
                </span>
                  )}
                </div>
            )}
            
            {!sidebarCollapsed && (
                <div className="pub-sidebar-github">
                  <a
                      href="https://github.com/NarukeAlpha"
                      target="_blank"
                      rel="noreferrer"
                      className="pub-sidebar-item"
                      style={{ textDecoration: "none" }}
                  >
                    <span className="pub-sidebar-item-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Github size={14} className="pub-sidebar-tab-icon" />
                      <span
                          style={{
                            background: "linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #00d2e6 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                      >
                        github.com/NarukeAlpha
                      </span>
                    </span>
                    <span className="pub-sidebar-item-meta">open</span>
                  </a>
                </div>
            )}

            {/* ── Sidebar stats ── */}
            {!sidebarCollapsed && (
                <div className="pub-sidebar-stats">
                  <div className="pub-sidebar-stat">
                    <span className="pub-stat-value pub-stat-value--purple">{posts.length}</span>
                    <span className="pub-sidebar-stat-label">posts</span>
                  </div>
                  <div className="pub-sidebar-stat">
                    <span className="pub-stat-value pub-stat-value--cyan">{aiResearchEntries.length}</span>
                    <span className="pub-sidebar-stat-label">research</span>
                  </div>
                  <div className="pub-sidebar-stat">
                    <span className="pub-stat-value pub-stat-value--amber">{bookmarks.length}</span>
                    <span className="pub-sidebar-stat-label">links</span>
                  </div>
                </div>
            )}
          </aside>

          {/* ═══════════════ MAIN CONTENT ═══════════════ */}
          <div className="pub-main">
            {/* ── HERO / HEADER ── */}
            <header className="pub-reveal pub-hero">
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

            {/* ── CONTENT AREA ── */}
            <div className="pub-reveal pub-reveal-2 pub-content-section">
              {/* ── JOURNAL TAB ── */}
              {activeTab === "journal" && (
                  <div className="pub-tab-body">
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
      </div>
  );
}
