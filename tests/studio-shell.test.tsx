import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createBootstrap, createStudioBridge, createStudioSettings, createStudioStatus } from "./studio-test-helpers";
import { expect, test, vi } from "vitest";

import { StudioShell } from "../apps/studio/src/components/studio-shell";

function renderShell(options: {
  studio?: ReturnType<typeof createStudioBridge>;
  settings?: ReturnType<typeof createStudioSettings>;
  status?: ReturnType<typeof createStudioStatus>;
  onBootstrapChange?: (next: ReturnType<typeof createBootstrap>) => void;
} = {}) {
  const status = options.status ?? createStudioStatus();
  const settings = options.settings ?? createStudioSettings();
  const studio = options.studio ?? createStudioBridge({ getStatus: vi.fn(async () => status) });
  const onBootstrapChange = options.onBootstrapChange ?? vi.fn();

  render(
    <StudioShell
      studio={studio}
      settings={settings}
      initialStatus={status}
      onBootstrapChange={onBootstrapChange}
    />
  );

  return { studio, status, settings, onBootstrapChange };
}

test("studio shell shows dashboard fallbacks for missing Convex configuration", () => {
  renderShell({
    status: createStudioStatus({
      convexConfigured: false,
      convexReachable: false,
      deployKeyConfigured: false,
      opencodeConfigured: false,
      opencodeReady: false,
      postCount: null,
      bookmarkCount: null,
      overview: null
    })
  });

  expect(screen.getAllByText(/Save the Convex URL in Settings to load the live overview/i)).toHaveLength(2);
  expect(screen.getAllByText("Unavailable")).toHaveLength(2);
  expect(screen.getByText("Missing")).toBeInTheDocument();
});

test("studio shell blocks post publishing until Convex and the write key are configured", () => {
  renderShell({
    status: createStudioStatus({
      convexConfigured: false,
      deployKeyConfigured: false
    })
  });

  fireEvent.click(screen.getByRole("button", { name: "Post" }));

  expect(screen.getByText(/Save a Convex URL and studio write key in Settings before publishing posts/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Publish to Convex/i })).toBeDisabled();
});

test("studio shell publishes posts, resets the draft, and refreshes status", async () => {
  const studio = createStudioBridge();

  renderShell({ studio });

  fireEvent.click(screen.getByRole("button", { name: "Post" }));
  fireEvent.change(screen.getByPlaceholderText(/Give the post a title/i), { target: { value: "Shipping Notes" } });
  fireEvent.change(screen.getByPlaceholderText(/Markdown body/i), { target: { value: "Body copy" } });
  fireEvent.click(screen.getByRole("button", { name: /Publish to Convex/i }));

  await waitFor(() => expect(studio.publishPost).toHaveBeenCalledWith({ title: "Shipping Notes", body: "Body copy" }));
  await waitFor(() => expect(screen.getByText("Post published")).toBeInTheDocument());
  await waitFor(() => expect(studio.getStatus).toHaveBeenCalled());

  fireEvent.click(screen.getByRole("button", { name: "Post" }));
  expect(screen.getByPlaceholderText(/Give the post a title/i)).toHaveValue("");
  expect(screen.getByPlaceholderText(/Markdown body/i)).toHaveValue("");
});

test("studio shell blocks bookmark publishing when OpenCode is disabled", () => {
  renderShell({
    status: createStudioStatus({
      opencodeConfigured: false,
      opencodeReady: false
    })
  });

  fireEvent.click(screen.getByRole("button", { name: "Bookmarks" }));

  expect(screen.getByText(/Bookmark research is optional. Save an OpenCode command in Settings to enable this view/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Publish bookmark/i })).toBeDisabled();
});

test("studio shell publishes bookmarks and distinguishes mirrored thumbnail notices", async () => {
  const studio = createStudioBridge({
    publishBookmark: vi.fn(async () => ({
      ok: true,
      bookmark: {
        url: "https://example.com/bookmark",
        title: "Design Systems Article",
        description: "Bookmark description",
        source: "Example",
        thumbnailUrl: "",
        note: "",
        addedAt: Date.UTC(2026, 0, 6)
      },
      thumbnailCachePath: "/tmp/bookmark-thumb.png"
    }))
  });

  renderShell({ studio });

  fireEvent.click(screen.getByRole("button", { name: "Bookmarks" }));
  fireEvent.change(screen.getByPlaceholderText("https://..."), { target: { value: "https://example.com/bookmark" } });
  fireEvent.change(screen.getByPlaceholderText(/Why this link matters/i), { target: { value: "Worth saving" } });
  fireEvent.click(screen.getByRole("button", { name: /Publish bookmark/i }));

  await waitFor(() => expect(studio.publishBookmark).toHaveBeenCalledWith({
    url: "https://example.com/bookmark",
    note: "Worth saving"
  }));
  await waitFor(() => expect(screen.getByText("Bookmark published")).toBeInTheDocument());
  expect(screen.getByText(/mirrored into \/tmp\/bookmark-thumb.png/i)).toBeInTheDocument();
});

test("studio shell saves settings and forwards clear-key behavior", async () => {
  const studio = createStudioBridge();
  const onBootstrapChange = vi.fn();

  renderShell({ studio, onBootstrapChange });

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.change(screen.getByPlaceholderText("https://your-team.convex.cloud"), { target: { value: "https://next-team.convex.cloud" } });
  fireEvent.click(screen.getByRole("button", { name: /Clear saved key/i }));
  fireEvent.click(screen.getByRole("button", { name: /Save desktop settings/i }));

  await waitFor(() => expect(studio.saveSettings).toHaveBeenCalled());

  expect(studio.saveSettings).toHaveBeenCalledWith({
    convexUrl: "https://next-team.convex.cloud",
    publicSiteUrl: "https://blog.example.com",
    opencodeCommand: "opencode",
    opencodeBaseUrl: "http://127.0.0.1:4096",
    opencodeProviderId: "openai",
    opencodeModelId: "gpt-4",
    clearDeployKey: true
  });
  expect(onBootstrapChange).toHaveBeenCalled();
  expect(screen.getByText("Settings saved")).toBeInTheDocument();
});

test("studio shell refreshes status on the polling interval", async () => {
  vi.useFakeTimers();
  const studio = createStudioBridge();

  renderShell({ studio });

  await vi.advanceTimersByTimeAsync(15000);

  expect(studio.getStatus).toHaveBeenCalledTimes(1);
});
