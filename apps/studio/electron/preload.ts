import { contextBridge, ipcRenderer } from "electron";
import type { BookmarkPublishPayload, PostPublishPayload, SaveStudioSettingsPayload, StudioBookmarkUpdatePayload, StudioBridge } from "@shared/types";
import { IPC_CHANNELS } from "@shared/types";

const studioBridge: StudioBridge = {
  platform: process.platform,
  getBootstrap: () => ipcRenderer.invoke(IPC_CHANNELS.GET_BOOTSTRAP),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS),
  saveSettings: (payload: SaveStudioSettingsPayload) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, payload),
  publishPost: (payload: PostPublishPayload) => ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_POST, payload),
  publishBookmark: (payload: BookmarkPublishPayload) => ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_BOOKMARK, payload),
  listBookmarks: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_BOOKMARKS),
  updateBookmark: (payload: StudioBookmarkUpdatePayload) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_BOOKMARK, payload),
  openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),
  isWindowFocused: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_VISIBILITY)
};

contextBridge.exposeInMainWorld("studio", studioBridge);
