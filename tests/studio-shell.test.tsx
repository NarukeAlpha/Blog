import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { StudioBridge } from "@shared/types";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("react-resizable-panels", () => ({
  Group: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  Panel: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  Separator: () => <div />
}));

import App from "../apps/studio/src/app";
import { createBootstrap, createStudioBridge, createStudioSettings, createStudioStatus } from "./studio-test-helpers";

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
  fireEvent.change(screen.getByPlaceholderText("https://example.com/article"), { target: { value: "https://example.com/bookmark" } });
  fireEvent.change(screen.getByPlaceholderText(/Why this link matters/i), { target: { value: "Worth saving" } });
  fireEvent.click(screen.getByRole("button", { name: /Publish Bookmark/i }));

  await waitFor(() => expect(studio.publishBookmark).toHaveBeenCalledWith({
    url: "https://example.com/bookmark",
    note: "Worth saving"
  }));
  expect(await screen.findByText("Bookmark saved")).toBeInTheDocument();
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
