import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { StudioBridge } from "@shared/types";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("react-resizable-panels", () => ({
  Group: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  Panel: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  Separator: () => <div />
}));

import App from "../apps/studio/src/app";
import { createBootstrap, createStudioBookmark, createStudioBridge, createStudioSettings, createStudioStatus } from "./studio-test-helpers";

function installStudioBridge(overrides: Partial<StudioBridge> = {}) {
  const studio = createStudioBridge(overrides);
  (window as Window & { studio?: StudioBridge }).studio = studio;
  return studio;
}

async function renderStudioApp(overrides: Partial<StudioBridge> = {}) {
  const studio = installStudioBridge(overrides);
  render(<App />);
  await screen.findByRole("heading", { name: "Dashboard" });
  return studio;
}

beforeEach(() => {
  delete (window as Window & { studio?: StudioBridge }).studio;
  window.history.replaceState(null, "", "/");
});

test("studio routes block post publishing until Convex and the write key are configured", async () => {
  const status = createStudioStatus({
    convexConfigured: false,
    convexReachable: false,
    deployKeyConfigured: false,
    opencodeConfigured: false,
    opencodeReady: false,
    postCount: null,
    bookmarkCount: null,
    overview: null
  });

  await renderStudioApp({
    getBootstrap: vi.fn(async () => createBootstrap({ status })),
    getStatus: vi.fn(async () => status)
  });

  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: /New Post/i }));

  expect(await screen.findByText(/Save a Prod Convex URL and studio write key in Settings before publishing/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Publish to Convex/i })).toBeDisabled();
});

test("studio routes publish posts from the redesigned editor", async () => {
  const studio = await renderStudioApp();

  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: /New Post/i }));
  fireEvent.change(screen.getByPlaceholderText("Post title"), { target: { value: "Shipping Notes" } });
  fireEvent.change(screen.getByPlaceholderText("Write your post in Markdown..."), { target: { value: "Body copy" } });
  fireEvent.click(screen.getByRole("button", { name: /Publish to Convex/i }));

  await waitFor(() => expect(studio.publishPost).toHaveBeenCalledWith({ title: "Shipping Notes", body: "Body copy" }));
  expect(await screen.findByText("Post published")).toBeInTheDocument();
});

test("studio routes publish bookmarks and refresh status", async () => {
  const studio = await renderStudioApp();

  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: /Bookmarks/i }));
  await waitFor(() => expect(studio.listBookmarks).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: /New Bookmark/i }));

  const dialog = await screen.findByRole("dialog", { name: /New Bookmark/i });
  fireEvent.change(within(dialog).getByLabelText("URL"), { target: { value: "https://example.com/bookmark" } });
  fireEvent.change(within(dialog).getByLabelText("Note"), { target: { value: "Worth saving" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /Publish Bookmark/i }));

  await waitFor(() => expect(studio.publishBookmark).toHaveBeenCalledWith({
    url: "https://example.com/bookmark",
    note: "Worth saving"
  }));
  expect(await screen.findByText("Bookmark saved")).toBeInTheDocument();
  await waitFor(() => expect(studio.listBookmarks).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(studio.getStatus).toHaveBeenCalled());
});

test("studio bookmark management loads existing bookmarks and saves edits", async () => {
  const bookmarks = [
    createStudioBookmark(),
    createStudioBookmark({
      id: "bookmark-2",
      url: "https://example.com/another-bookmark",
      title: "Another Bookmark",
      description: "Another bookmark description",
      source: "Another Example",
      note: "Second bookmark note",
      addedAt: Date.UTC(2026, 0, 4),
      thumbnailSourceUrl: "https://example.com/another-bookmark.png",
      thumbnailStorageId: "storage-id",
      thumbnailUrl: "https://cdn.example.com/another-bookmark.png"
    })
  ];
  const updatedBookmark = createStudioBookmark({
    id: "bookmark-2",
    url: "https://example.com/another-bookmark",
    title: "Updated Bookmark",
    description: "Updated bookmark description",
    source: "Another Example",
    note: "Updated note",
    addedAt: new Date("2026-01-08T09:30").getTime(),
    thumbnailSourceUrl: "",
    thumbnailStorageId: null,
    thumbnailUrl: ""
  });
  const listBookmarks = vi.fn(async () => bookmarks);
  const updateBookmark = vi.fn(async () => updatedBookmark);
  const studio = await renderStudioApp({
    listBookmarks,
    updateBookmark
  });

  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: /Bookmarks/i }));

  await waitFor(() => expect(listBookmarks).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("Latest Bookmark")).toBeInTheDocument();

  fireEvent.doubleClick(screen.getByText("Another Bookmark"));

  const dialog = await screen.findByRole("dialog", { name: /Edit Bookmark/i });
  expect(within(dialog).getByDisplayValue("Another Bookmark")).toBeInTheDocument();
  expect(within(dialog).getByDisplayValue("Second bookmark note")).toBeInTheDocument();
  expect(within(dialog).getByDisplayValue("storage-id")).toBeInTheDocument();

  fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "Updated Bookmark" } });
  fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "Updated bookmark description" } });
  fireEvent.change(within(dialog).getByLabelText("Note"), { target: { value: "Updated note" } });
  fireEvent.change(within(dialog).getByLabelText("Saved At"), { target: { value: "2026-01-08T09:30" } });
  fireEvent.change(within(dialog).getByLabelText("Thumbnail Source URL"), { target: { value: "" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /Save Changes/i }));

  await waitFor(() => expect(updateBookmark).toHaveBeenCalledWith({
    id: "bookmark-2",
    url: "https://example.com/another-bookmark",
    title: "Updated Bookmark",
    description: "Updated bookmark description",
    source: "Another Example",
    note: "Updated note",
    addedAt: new Date("2026-01-08T09:30").getTime(),
    thumbnailSourceUrl: ""
  }));
  expect(await screen.findByText("Bookmark updated")).toBeInTheDocument();
  await waitFor(() => expect(listBookmarks).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(studio.getStatus).toHaveBeenCalled());
});

test("studio routes save nested environment settings and clear deploy keys", async () => {
  const settings = createStudioSettings({
    environments: {
      dev: { deployKeyConfigured: false },
      prod: { deployKeyConfigured: true }
    }
  });
  const bootstrap = createBootstrap({ settings });
  const saveSettings = vi.fn(async () => bootstrap);

  await renderStudioApp({
    getBootstrap: vi.fn(async () => bootstrap),
    saveSettings
  });

  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: /Settings/i }));

  fireEvent.change(screen.getAllByPlaceholderText("https://your-deployment.convex.cloud")[1], {
    target: { value: "https://next-team.convex.cloud" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  fireEvent.click(screen.getByRole("button", { name: /Save Settings/i }));

  await waitFor(() => expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({
    selectedEnvironment: "prod",
    environments: expect.objectContaining({
      prod: expect.objectContaining({ convexUrl: "https://next-team.convex.cloud" })
    }),
    clearDeployKeys: ["prod"],
    opencodeCommand: "opencode",
    opencodeBaseUrl: "http://127.0.0.1:4096",
    opencodeProviderId: "openai",
    opencodeModelId: "gpt-4"
  })));
  expect(await screen.findByText("Settings saved")).toBeInTheDocument();
});
