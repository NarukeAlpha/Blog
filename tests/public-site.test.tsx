import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PostRecord, PublicBookmarkRecord } from "../packages/shared/src/types";
import { beforeEach, expect, test, vi } from "vitest";

const { useQuery } = vi.hoisted(() => ({
  useQuery: vi.fn()
}));

vi.mock("convex/react", () => ({
  useQuery
}));

import { PublicSite } from "../apps/site/src/components/public-site";

const posts: PostRecord[] = [
  {
    slug: "latest-post",
    title: "Latest Post",
    body: "## Latest heading\n\nThis is the **latest** post body.",
    excerpt: "Latest excerpt",
    publishedAt: Date.UTC(2026, 0, 5),
    readingTimeMinutes: 4
  },
  {
    slug: "older-post",
    title: "Older Post",
    body: "Older body copy.",
    excerpt: "Older excerpt",
    publishedAt: Date.UTC(2025, 11, 31),
    readingTimeMinutes: 2
  }
];

const bookmarks: PublicBookmarkRecord[] = [
  {
    url: "https://example.com/article",
    title: "Design Systems Article",
    description: "A practical article on design systems.",
    source: "Example",
    thumbnailUrl: "https://example.com/thumb.png",
    addedAt: Date.UTC(2026, 0, 6)
  },
  {
    url: "https://example.com/note",
    title: "Bookmark Without Thumb",
    description: "No image needed here.",
    source: "Example Notes",
    thumbnailUrl: "",
    addedAt: Date.UTC(2026, 0, 4)
  }
];

function mockQueries(nextPosts: PostRecord[] = posts, nextBookmarks: PublicBookmarkRecord[] = bookmarks) {
  let callIndex = 0;

  useQuery.mockImplementation(() => {
    callIndex += 1;
    return callIndex % 2 === 1 ? nextPosts : nextBookmarks;
  });
}

beforeEach(() => {
  useQuery.mockReset();
});

test("public site falls back to empty states when no content exists", async () => {
  mockQueries([], []);

  render(<PublicSite />);

  expect(screen.getByText(/No posts yet/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /reading list/i }));
  expect(screen.getByText(/No bookmarks yet/i)).toBeInTheDocument();
  await waitFor(() => expect(window.location.hash).toBe(""));
});

test("public site selects the first post and keeps the hash in sync", async () => {
  mockQueries();

  render(<PublicSite />);

  await waitFor(() => expect(window.location.hash).toBe("#post/latest-post"));
  expect(screen.getByRole("heading", { name: "Latest Post" })).toBeInTheDocument();
  expect(
    screen.getByText((_, element) => element?.textContent === "This is the latest post body.")
  ).toBeInTheDocument();
  expect(screen.getByText((_, element) => element?.textContent === "2 posts")).toBeInTheDocument();
  expect(screen.getByText((_, element) => element?.textContent === "2 bookmarks")).toBeInTheDocument();
  expect(screen.getByText(/4 min read/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Older Post/i }));

  await waitFor(() => expect(window.location.hash).toBe("#post/older-post"));
  expect(screen.getByRole("heading", { name: "Older Post" })).toBeInTheDocument();
});

test("public site replaces invalid hashes with the latest valid post", async () => {
  window.history.replaceState(null, "", "#post/missing-post");
  mockQueries();

  render(<PublicSite />);

  await waitFor(() => expect(window.location.hash).toBe("#post/latest-post"));
  expect(screen.getByRole("heading", { name: "Latest Post" })).toBeInTheDocument();
});

test("public site renders bookmark cards and optional thumbnails", () => {
  mockQueries();

  render(<PublicSite />);

  fireEvent.click(screen.getByRole("button", { name: /reading list/i }));

  const bookmarkLink = screen.getByRole("link", { name: /Design Systems Article/i });
  expect(bookmarkLink).toHaveAttribute("href", "https://example.com/article");
  expect(screen.getByAltText("Design Systems Article")).toHaveAttribute("src", "https://example.com/thumb.png");
  expect(screen.queryByAltText("Bookmark Without Thumb")).not.toBeInTheDocument();
  expect(screen.getByText("A practical article on design systems.")).toBeInTheDocument();
  expect(screen.getByText("Example Notes")).toBeInTheDocument();
});
