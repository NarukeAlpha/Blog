import { render, screen, waitFor } from "@testing-library/react";

import { createStudioBridge } from "./studio-test-helpers";
import type { StudioBootstrap, StudioBridge } from "@shared/types";
import { expect, test, vi } from "vitest";

import App from "../apps/studio/src/app";

function setWindowStudio(studio: StudioBridge) {
  (window as Window & { studio?: StudioBridge }).studio = studio;
  return studio;
}

test("studio app blocks direct browser usage when the preload bridge is missing", () => {
  render(<App />);

  expect(screen.getByText(/Open the studio through Electron/i)).toBeInTheDocument();
  expect(screen.getByText(/npm run dev:studio/i)).toBeInTheDocument();
});

test("studio app shows the loading shell while bootstrap is pending", () => {
  const getBootstrap = vi.fn(() => new Promise<StudioBootstrap>(() => {}));

  setWindowStudio(
    createStudioBridge({
      getBootstrap
    })
  );

  render(<App />);

  expect(screen.getByText(/Loading studio settings/i)).toBeInTheDocument();
  expect(getBootstrap).toHaveBeenCalledTimes(1);
});

test("studio app surfaces bootstrap errors", async () => {
  const getBootstrap = vi.fn(async (): Promise<StudioBootstrap> => {
    throw new Error("Bootstrap failed");
  });

  setWindowStudio(
    createStudioBridge({
      getBootstrap
    })
  );

  render(<App />);

  await waitFor(() => {
    expect(getBootstrap).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Bootstrap failed")).toBeInTheDocument();
  });
});

test("studio app renders the studio shell after bootstrap succeeds", async () => {
  setWindowStudio(createStudioBridge());

  render(<App />);

  await waitFor(() => expect(screen.getByText(/The live publishing loop/i)).toBeInTheDocument());
});
