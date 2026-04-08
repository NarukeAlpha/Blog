import { expect, test, vi } from "vitest";

const ConvexReactClient = vi.fn(function ConvexReactClientMock(this: { url: string }, url: string) {
  this.url = url;
});

vi.mock("convex/react", () => ({
  ConvexReactClient
}));

test("convex-client stays disabled when no public Convex URL is configured", async () => {
  vi.resetModules();
  ConvexReactClient.mockClear();
  vi.stubEnv("VITE_CONVEX_URL", "");
  vi.stubEnv("VITE_PUBLIC_SITE_URL", "");

  const clientModule = await import("../packages/shared/src/convex-client");

  expect(clientModule.convexUrl).toBe("");
  expect(clientModule.publicSiteUrl).toBe("");
  expect(clientModule.hasConvexConfig).toBe(false);
  expect(clientModule.convexClient).toBeNull();
  expect(ConvexReactClient).not.toHaveBeenCalled();
});

test("convex-client creates a React client when the public Convex URL is configured", async () => {
  vi.resetModules();
  ConvexReactClient.mockClear();
  vi.stubEnv("VITE_CONVEX_URL", "https://demo.convex.cloud");
  vi.stubEnv("VITE_PUBLIC_SITE_URL", "https://blog.example.com");

  const clientModule = await import("../packages/shared/src/convex-client");

  expect(clientModule.convexUrl).toBe("https://demo.convex.cloud");
  expect(clientModule.publicSiteUrl).toBe("https://blog.example.com");
  expect(clientModule.hasConvexConfig).toBe(true);
  expect(clientModule.convexClient).toMatchObject({ url: "https://demo.convex.cloud" });
  expect(ConvexReactClient).toHaveBeenCalledWith("https://demo.convex.cloud");
});
