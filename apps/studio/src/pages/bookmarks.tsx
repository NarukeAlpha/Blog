import { FormEvent, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Check, Circle, Loader2 } from "lucide-react";
import { Input } from "@studio/components/ui/input";
import { Textarea } from "@studio/components/ui/textarea";
import { Button } from "@studio/components/ui/button";
import { useStudio } from "@studio/providers/studio-context";
import { cn } from "@studio/lib/utils";
import type { BookmarkPublishResult } from "@shared/types";

type StepStatus = "pending" | "active" | "done" | "error";

interface Step {
  label: string;
  status: StepStatus;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") return <Check className="h-3.5 w-3.5 text-success" />;
  if (status === "active") return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  if (status === "error") return <span className="h-3.5 w-3.5 text-destructive">✕</span>;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

export function BookmarksPage() {
  const { bridge, status, refreshStatus } = useStudio();
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const canPublish = status.convexConfigured && status.deployKeyConfigured;
  const envLabel = status.activeEnvironment === "prod" ? "Prod" : "Dev";

  const advanceStep = (index: number, status: StepStatus) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, status } : s)));

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!canPublish || !url.trim() || isBusy) return;

    const pipeline: Step[] = [
      { label: "URL validated", status: "pending" },
      { label: status.opencodeConfigured ? "Researching via OpenCode" : "Building metadata", status: "pending" },
      { label: "Saving to Convex", status: "pending" },
      { label: "Mirroring thumbnail", status: "pending" },
    ];
    setSteps(pipeline);
    setIsBusy(true);

    try {
      advanceStep(0, "active");
      new URL(url);
      advanceStep(0, "done");

      advanceStep(1, "active");
      advanceStep(1, "done");

      advanceStep(2, "active");
      const result: BookmarkPublishResult = await bridge.publishBookmark({ url: url.trim(), note: note.trim() });
      advanceStep(2, "done");

      advanceStep(3, "active");
      advanceStep(3, "done");

      toast.success("Bookmark saved", { description: result.bookmark.title });
      setUrl("");
      setNote("");
      void refreshStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error("Bookmark failed", { description: message });
      setSteps((prev) => prev.map((s) => (s.status === "active" ? { ...s, status: "error" } : s)));
    } finally {
      setIsBusy(false);
    }
  }, [canPublish, url, note, isBusy, bridge, status.opencodeConfigured, refreshStatus]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 fade-up">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">New Bookmark</h2>
        <p className="mt-1 text-sm text-muted-foreground">Save a link with AI-enriched metadata.</p>
      </div>

      {!canPublish ? (
        <div className="rounded-xl border border-warning/20 bg-warning/8 p-3 text-sm text-warning">
          Save a {envLabel} Convex URL and studio write key in{" "}
          <button type="button" className="underline" onClick={() => setLocation("/settings")}>Settings</button>{" "}
          before saving bookmarks.
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <Input
          type="url"
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          disabled={isBusy}
        />
        <Textarea
          placeholder="Why this link matters (optional)"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isBusy}
        />
        <Button type="submit" disabled={isBusy || !canPublish}>
          {isBusy ? "Publishing..." : "Publish Bookmark"}
        </Button>
      </form>

      {steps.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Processing</p>
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <StepIcon status={step.status} />
              <span className={cn(
                step.status === "done" ? "text-foreground" :
                step.status === "active" ? "text-primary" :
                step.status === "error" ? "text-destructive" :
                "text-muted-foreground/60"
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
