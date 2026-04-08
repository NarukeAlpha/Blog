import { render, screen, waitFor } from "@testing-library/react";

import { createStudioBridge } from "./studio-test-helpers";
import type { StudioBootstrap, StudioBridge } from "@shared/types";
import { beforeEach, expect, test, vi } from "vitest";

import App from "../apps/studio/src/app";

function installStudioBridge(overrides: Partial<StudioBridge> = {}) {
  const studio = createStudioBridge(overrides);
  (window as Window & { studio?: StudioBridge }).studio = studio;
  return studio;
}

beforeEach(() => {
  delete (window as Window & { studio?: StudioBridge }).studio;
  window.history.replaceState(null, "", "/");
});

test("studio app blocks direct browser usage when the preload bridge is missing", () => {
  render(<App />);

  expect(screen.getByText(/Open the studio through Electron/i)).toBeInTheDocument();
  expect(screen.getByText(/npm run dev:studio/i)).toBeInTheDocument();
});

test("studio app shows the loading shell while bootstrap is pending", () => {
  const getBootstrap = vi.fn(() => new Promise<StudioBootstrap>(() => {}));

  installStudioBridge({ getBootstrap });

  render(<App />);

  expect(screen.getByText(/^Loading studio$/i)).toBeInTheDocument();
  return waitFor(() => expect(getBootstrap).toHaveBeenCalledTimes(1));
});

test("studio app surfaces bootstrap errors", async () => {
  const getBootstrap = vi.fn(async (): Promise<StudioBootstrap> => {
    throw new Error("Bootstrap failed");
  });

  installStudioBridge({ getBootstrap });

  render(<App />);

  expect(await screen.findByText("Bootstrap failed")).toBeInTheDocument();
  expect(getBootstrap).toHaveBeenCalledTimes(1);
});

test("studio app renders the studio shell after bootstrap succeeds", async () => {
  const studio = installStudioBridge();

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Writer Studio" })).toBeInTheDocument();
  await waitFor(() => expect(studio.getBootstrap).toHaveBeenCalledTimes(1));
});
