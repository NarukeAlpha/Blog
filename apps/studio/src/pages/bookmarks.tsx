import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Check, Circle, Loader2, Plus, X } from "lucide-react";

import { Button } from "@studio/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@studio/components/ui/card";
import { Input } from "@studio/components/ui/input";
import { Textarea } from "@studio/components/ui/textarea";
import { cn } from "@studio/lib/utils";
import { useStudio } from "@studio/providers/studio-context";
import { formatDate } from "@shared/text";
import type { BookmarkPublishResult, StudioBookmarkRecord } from "@shared/types";

type StepStatus = "pending" | "active" | "done" | "error";
type ModalMode = "new" | "edit" | null;

interface Step {
  label: string;
  status: StepStatus;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") return <Check className="h-3.5 w-3.5 text-success" />;
  if (status === "active") return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  if (status === "error") return <span className="h-3.5 w-3.5 text-destructive">x</span>;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

function cloneBookmark(bookmark: StudioBookmarkRecord) {
  return { ...bookmark };
}

function formatDateTimeLocal(value: number) {
  const date = new Date(value);
  const pad = (entry: number) => String(entry).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocal(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function BookmarksPage() {
  const { bridge, status, refreshStatus } = useStudio();
  const [, setLocation] = useLocation();
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [bookmarks, setBookmarks] = useState<StudioBookmarkRecord[]>([]);
  const [openedBookmarkId, setOpenedBookmarkId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StudioBookmarkRecord | null>(null);
  const [draftAddedAtInput, setDraftAddedAtInput] = useState("");
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [listError, setListError] = useState("");
  const [editorError, setEditorError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const canManage = status.convexConfigured && status.deployKeyConfigured;
  const envLabel = status.activeEnvironment === "prod" ? "Prod" : "Dev";

  const resetCreateForm = useCallback(() => {
    setUrl("");
    setNote("");
    setSteps([]);
  }, []);

  const resetModalState = useCallback(() => {
    setModalMode(null);
    setEditorError("");
    setDraft(null);
    setDraftAddedAtInput("");
    resetCreateForm();
  }, [resetCreateForm]);

  const closeModal = useCallback(() => {
    if (isPublishing || isUpdating) {
      return;
    }

    resetModalState();
  }, [isPublishing, isUpdating, resetModalState]);

  useEffect(() => {
    if (!modalMode) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, modalMode]);

  const loadBookmarks = useCallback(async () => {
    if (!canManage) {
      setBookmarks([]);
      setListError("");
      return [];
    }

    setIsLoadingBookmarks(true);
    setListError("");

    try {
      const nextBookmarks = await bridge.listBookmarks();
      setBookmarks(nextBookmarks);
      return nextBookmarks;
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Failed to load bookmarks.");
      return [];
    } finally {
      setIsLoadingBookmarks(false);
    }
  }, [bridge, canManage]);

  useEffect(() => {
    if (!canManage) {
      setBookmarks([]);
      setListError("");
      setModalMode(null);
      setDraft(null);
      setDraftAddedAtInput("");
      setOpenedBookmarkId(null);
      resetCreateForm();
      return;
    }

    void loadBookmarks();
  }, [canManage, loadBookmarks, resetCreateForm, status.activeEnvironment, status.convexUrl]);

  const advanceStep = (index: number, nextStatus: StepStatus) =>
    setSteps((prev) => prev.map((step, stepIndex) => (stepIndex === index ? { ...step, status: nextStatus } : step)));

  const handleOpenNew = useCallback(() => {
    resetCreateForm();
    setEditorError("");
    setModalMode("new");
  }, [resetCreateForm]);

  const handleOpenEdit = useCallback((bookmark: StudioBookmarkRecord) => {
    setOpenedBookmarkId(bookmark.id);
    setDraft(cloneBookmark(bookmark));
    setDraftAddedAtInput(formatDateTimeLocal(bookmark.addedAt));
    setEditorError("");
    setModalMode("edit");
  }, []);

  const handlePublish = useCallback(async (event: FormEvent) => {
    event.preventDefault();

    if (!canManage || !url.trim() || isPublishing) {
      return;
    }

    const pipeline: Step[] = [
      { label: "URL validated", status: "pending" },
      { label: status.opencodeConfigured ? "Researching via OpenCode" : "Building metadata", status: "pending" },
      { label: "Saving to Convex", status: "pending" },
      { label: "Mirroring thumbnail", status: "pending" }
    ];

    setSteps(pipeline);
    setIsPublishing(true);

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
      setOpenedBookmarkId(result.bookmark.id);
      resetModalState();
      await loadBookmarks();
      void refreshStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";

      toast.error("Bookmark failed", { description: message });
      setSteps((prev) => prev.map((step) => (step.status === "active" ? { ...step, status: "error" } : step)));
    } finally {
      setIsPublishing(false);
    }
  }, [bridge, canManage, loadBookmarks, note, refreshStatus, resetModalState, status.opencodeConfigured, url, isPublishing]);

  const handleDraftChange = useCallback(
    (field: keyof Pick<StudioBookmarkRecord, "url" | "title" | "description" | "source" | "note" | "thumbnailSourceUrl">, value: string) => {
      setDraft((current) => (current ? { ...current, [field]: value } : current));
    },
    []
  );

  const handleAddedAtChange = useCallback((value: string) => {
    setDraftAddedAtInput(value);
    const nextTimestamp = parseDateTimeLocal(value);

    if (nextTimestamp === null) {
      return;
    }

    setDraft((current) => (current ? { ...current, addedAt: nextTimestamp } : current));
  }, []);

  const handleUpdate = useCallback(async (event: FormEvent) => {
    event.preventDefault();

    if (!canManage || !draft || isUpdating) {
      return;
    }

    const addedAt = parseDateTimeLocal(draftAddedAtInput);

    if (addedAt === null) {
      setEditorError("Choose a valid saved-at date and time.");
      return;
    }

    setIsUpdating(true);
    setEditorError("");

    try {
      const updatedBookmark = await bridge.updateBookmark({
        id: draft.id,
        url: draft.url.trim(),
        title: draft.title,
        description: draft.description,
        source: draft.source,
        note: draft.note,
        addedAt,
        thumbnailSourceUrl: draft.thumbnailSourceUrl.trim()
      });

      toast.success("Bookmark updated", { description: updatedBookmark.title });
      setOpenedBookmarkId(updatedBookmark.id);
      resetModalState();
      await loadBookmarks();
      void refreshStatus();
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : "Failed to update bookmark.");
    } finally {
      setIsUpdating(false);
    }
  }, [bridge, canManage, draft, draftAddedAtInput, isUpdating, loadBookmarks, refreshStatus, resetModalState]);

  return (
    <>
      <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6 fade-up">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-foreground">Bookmarks</h2>
            <p className="mt-1 text-sm text-muted-foreground">Compact list view with modal-based create and edit flows.</p>
          </div>
          <Button type="button" className="shrink-0" onClick={handleOpenNew} disabled={!canManage}>
            <Plus className="h-4 w-4" />
            New Bookmark
          </Button>
        </div>

        {!canManage ? (
          <div className="rounded-xl border border-warning/20 bg-warning/8 p-3 text-sm text-warning">
            Save a {envLabel} Convex URL and studio write key in{" "}
            <button type="button" className="underline" onClick={() => setLocation("/settings")}>Settings</button>{" "}
            before saving bookmarks.
          </div>
        ) : null}

        <Card className="border border-border bg-card/80">
          <CardHeader>
            <CardTitle>Saved Bookmarks</CardTitle>
            <CardDescription>Double-click a row or use Open to edit a bookmark in a modal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {listError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {listError}
              </div>
            ) : null}

            {isLoadingBookmarks ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Loading bookmarks...
              </div>
            ) : null}

            {!isLoadingBookmarks && !bookmarks.length ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                No bookmarks saved yet.
              </div>
            ) : null}

            {!isLoadingBookmarks && bookmarks.length ? (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => {
                  const isOpened = bookmark.id === openedBookmarkId;

                  return (
                    <div
                      key={bookmark.id}
                      onDoubleClick={() => handleOpenEdit(bookmark)}
                      className={cn(
                        "rounded-2xl border bg-card/72 p-3.5 transition-colors",
                        isOpened ? "border-primary/40 bg-card/88" : "border-border hover:bg-card/82"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-3">
                            <p className="truncate text-sm font-medium text-foreground">{bookmark.title}</p>
                            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              {bookmark.source}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{bookmark.url}</p>
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{bookmark.description}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="hidden text-[11px] text-muted-foreground sm:block">{formatDate(bookmark.addedAt)}</span>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleOpenEdit(bookmark)}>
                            Open
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-40 bg-background/70 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full w-full max-w-4xl items-start justify-center">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="bookmark-modal-title"
              className="titlebar-no-drag glass-heavy flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card/90"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div className="min-w-0">
                  <h3 id="bookmark-modal-title" className="text-xl font-semibold text-foreground">
                    {modalMode === "new" ? "New Bookmark" : "Edit Bookmark"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {modalMode === "new"
                      ? "Save a new link into your bookmark collection."
                      : "Adjust the saved bookmark fields without blowing out the page layout."}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={closeModal} disabled={isPublishing || isUpdating} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                {modalMode === "new" ? (
                  <form onSubmit={(event) => void handlePublish(event)} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="new-bookmark-url" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">URL</label>
                      <Input
                        id="new-bookmark-url"
                        type="url"
                        placeholder="https://example.com/article"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        required
                        disabled={isPublishing}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="new-bookmark-note" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note</label>
                      <Textarea
                        id="new-bookmark-note"
                        placeholder="Why this link matters (optional)"
                        rows={8}
                        className="min-h-[200px]"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        disabled={isPublishing}
                      />
                    </div>

                    {steps.length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Processing</p>
                        {steps.map((step, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
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
                    ) : null}

                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="ghost" onClick={closeModal} disabled={isPublishing}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isPublishing || !canManage}>
                        {isPublishing ? "Publishing..." : "Publish Bookmark"}
                      </Button>
                    </div>
                  </form>
                ) : draft ? (
                  <form onSubmit={(event) => void handleUpdate(event)} className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="bookmark-url" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">URL</label>
                        <Input
                          id="bookmark-url"
                          type="url"
                          value={draft.url}
                          onChange={(event) => handleDraftChange("url", event.target.value)}
                          disabled={isUpdating}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="bookmark-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</label>
                        <Input
                          id="bookmark-title"
                          value={draft.title}
                          onChange={(event) => handleDraftChange("title", event.target.value)}
                          disabled={isUpdating}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="bookmark-description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</label>
                        <Textarea
                          id="bookmark-description"
                          rows={5}
                          value={draft.description}
                          onChange={(event) => handleDraftChange("description", event.target.value)}
                          disabled={isUpdating}
                          required
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="bookmark-source" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source</label>
                          <Input
                            id="bookmark-source"
                            value={draft.source}
                            onChange={(event) => handleDraftChange("source", event.target.value)}
                            disabled={isUpdating}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="bookmark-added-at" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Saved At</label>
                          <Input
                            id="bookmark-added-at"
                            type="datetime-local"
                            value={draftAddedAtInput}
                            onChange={(event) => handleAddedAtChange(event.target.value)}
                            disabled={isUpdating}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="bookmark-note" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note</label>
                        <Textarea
                          id="bookmark-note"
                          rows={7}
                          value={draft.note}
                          onChange={(event) => handleDraftChange("note", event.target.value)}
                          disabled={isUpdating}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="bookmark-thumbnail-source" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Thumbnail Source URL</label>
                        <Input
                          id="bookmark-thumbnail-source"
                          type="url"
                          value={draft.thumbnailSourceUrl}
                          onChange={(event) => handleDraftChange("thumbnailSourceUrl", event.target.value)}
                          disabled={isUpdating}
                          placeholder="https://example.com/thumbnail.png"
                        />
                      </div>

                      {editorError ? (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                          {editorError}
                        </div>
                      ) : null}

                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={closeModal} disabled={isUpdating}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isUpdating || !canManage}>
                          {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2 rounded-2xl border border-border bg-card/72 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bookmark Id</p>
                        <p className="break-all text-sm text-foreground">{draft.id}</p>
                      </div>

                      <div className="space-y-2 rounded-2xl border border-border bg-card/72 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Thumbnail Storage Id</p>
                        <Input value={draft.thumbnailStorageId || "Not stored"} readOnly />
                      </div>

                      <div className="space-y-3 rounded-2xl border border-border bg-card/72 p-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Thumbnail Preview</p>
                          <p className="mt-1 text-xs text-muted-foreground">Shows the saved preview URL that Studio will render.</p>
                        </div>

                        {draft.thumbnailUrl ? (
                          <div className="space-y-3">
                            <img
                              src={draft.thumbnailUrl}
                              alt={draft.title}
                              className="max-h-56 w-full rounded-2xl border border-border object-cover"
                            />
                            <Input value={draft.thumbnailUrl} readOnly />
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                            No thumbnail preview is currently available.
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
