import { contextBridge, ipcRenderer } from "electron";
import type { BookmarkPublishPayload, PostPublishPayload, SaveStudioSettingsPayload, StudioBookmarkUpdatePayload, StudioBridge } from "@shared/types";

const studioBridge: StudioBridge = {
  platform: process.platform,
  getBootstrap: () => ipcRenderer.invoke("studio:get-bootstrap"),
  getStatus: () => ipcRenderer.invoke("studio:get-status"),
  saveSettings: (payload: SaveStudioSettingsPayload) => ipcRenderer.invoke("studio:save-settings", payload),
  publishPost: (payload: PostPublishPayload) => ipcRenderer.invoke("studio:publish-post", payload),
  publishBookmark: (payload: BookmarkPublishPayload) => ipcRenderer.invoke("studio:publish-bookmark", payload),
  listBookmarks: () => ipcRenderer.invoke("studio:list-bookmarks"),
  updateBookmark: (payload: StudioBookmarkUpdatePayload) => ipcRenderer.invoke("studio:update-bookmark", payload),
  openExternal: (url: string) => ipcRenderer.invoke("studio:open-external", url)
};

contextBridge.exposeInMainWorld("studio", studioBridge);
