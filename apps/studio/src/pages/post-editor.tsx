import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Input } from "@studio/components/ui/input";
import { Button } from "@studio/components/ui/button";
import { MarkdownEditor } from "@studio/components/editor/markdown-editor";
import { useStudio } from "@studio/providers/studio-context";
import { usePublish } from "@studio/hooks/use-publish";
import type { PostPublishResult } from "@shared/types";

const DRAFT_KEY = "studio:post-draft";

interface Draft {
  title: string;
  body: string;
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Draft;
      if (parsed.title || parsed.body) return parsed;
    }
  } catch { /* ignore */ }
  return { title: "", body: "" };
}

function saveDraft(draft: Draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function PostEditorPage() {
  const { bridge, status, refreshStatus } = useStudio();
  const [, setLocation] = useLocation();
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const canPublish = status.convexConfigured && status.deployKeyConfigured;
  const envLabel = status.activeEnvironment === "prod" ? "Prod" : "Dev";

  const { execute, isBusy } = usePublish<Draft, PostPublishResult>(
    (payload) => bridge.publishPost(payload),
    {
      successTitle: "Post published",
      errorTitle: "Post failed",
      onSuccess: (result) => {
        toast.success(`${result.post.title} is live on ${envLabel}`);
        clearDraft();
        setDraft({ title: "", body: "" });
        setLocation("/");
        void refreshStatus();
      },
    }
  );

  useEffect(() => {
    const id = window.setInterval(() => saveDraft(draftRef.current), 10_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (canPublish && draft.title.trim() && draft.body.trim() && !isBusy) {
          void execute(draft);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPublish, draft, isBusy, execute]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!canPublish) return;
    void execute(draft);
  }, [canPublish, draft, execute]);

  return (
    <div className="flex h-full flex-col gap-4 fade-up">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">New Post</h2>
        <p className="mt-1 text-sm text-muted-foreground">Write in Markdown. Draft auto-saves every 10 seconds.</p>
      </div>

      {!canPublish ? (
        <div className="rounded-xl border border-warning/20 bg-warning/8 p-3 text-sm text-warning">
          Save a {envLabel} Convex URL and studio write key in Settings before publishing.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3 overflow-hidden">
        <Input
          placeholder="Post title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          required
        />

        <MarkdownEditor
          value={draft.body}
          onChange={(body) => setDraft((d) => ({ ...d, body }))}
        />

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">⌘↵ to publish</p>
          <Button type="submit" disabled={isBusy || !canPublish}>
            {isBusy ? "Publishing..." : "Publish to Convex"}
          </Button>
        </div>
      </form>
    </div>
  );
}
