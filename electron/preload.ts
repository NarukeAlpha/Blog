import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("studio", {
  platform: process.platform,
  getStatus: () => ipcRenderer.invoke("studio:get-status"),
  publishPost: (payload: unknown) => ipcRenderer.invoke("studio:publish-post", payload),
  publishBookmark: (payload: unknown) => ipcRenderer.invoke("studio:publish-bookmark", payload),
  openExternal: (url: string) => ipcRenderer.invoke("studio:open-external", url)
});
