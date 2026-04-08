import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

let hasConvexConfig = false;

vi.mock("@shared/convex-client", () => ({
  get hasConvexConfig() {
    return hasConvexConfig;
  }
}));

vi.mock("@site/components/public-site", () => ({
  PublicSite: () => <div>Public site shell</div>
}));

import App from "../apps/site/src/app";

test("site app renders the missing configuration shell when Convex is absent", () => {
  hasConvexConfig = false;

  render(<App />);

  expect(screen.getByText(/Point the site at Convex before serving it/i)).toBeInTheDocument();
  expect(screen.getByText(/VITE_CONVEX_URL/i)).toBeInTheDocument();
});

test("site app renders the public site when Convex is configured", () => {
  hasConvexConfig = true;

  render(<App />);

  expect(screen.getByText("Public site shell")).toBeInTheDocument();
});
