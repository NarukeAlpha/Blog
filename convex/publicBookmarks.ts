type PublicBookmarkFields = {
  url: string;
  title: string;
  description: string;
  source: string;
  addedAt: number;
};

type BookmarkThumbnailFields<TStorageId extends string = string> = {
  thumbnailSourceUrl?: string;
  thumbnailStorageId?: TStorageId;
};

export function buildPublicBookmark(bookmark: PublicBookmarkFields, thumbnailUrl: string) {
  return {
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    source: bookmark.source,
    thumbnailUrl,
    addedAt: bookmark.addedAt
  };
}

export async function resolveBookmarkThumbnailUrl<TStorageId extends string>(
  getUrl: (storageId: TStorageId) => Promise<string | null>,
  bookmark: BookmarkThumbnailFields<TStorageId>
) {
  if (bookmark.thumbnailStorageId) {
    return (await getUrl(bookmark.thumbnailStorageId)) || bookmark.thumbnailSourceUrl || "";
  }

  return bookmark.thumbnailSourceUrl || "";
}

export async function serializePublicBookmark<TStorageId extends string>(
  bookmark: PublicBookmarkFields & BookmarkThumbnailFields<TStorageId>,
  getUrl: (storageId: TStorageId) => Promise<string | null>
) {
  return buildPublicBookmark(bookmark, await resolveBookmarkThumbnailUrl(getUrl, bookmark));
}
