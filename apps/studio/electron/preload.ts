import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("studio", {
  platform: process.platform,
  getBootstrap: () => ipcRenderer.invoke("studio:get-bootstrap"),
  getStatus: () => ipcRenderer.invoke("studio:get-status"),
  saveSettings: (payload: unknown) => ipcRenderer.invoke("studio:save-settings", payload),
  publishPost: (payload: unknown) => ipcRenderer.invoke("studio:publish-post", payload),
  publishBookmark: (payload: unknown) => ipcRenderer.invoke("studio:publish-bookmark", payload),
  openExternal: (url: string) => ipcRenderer.invoke("studio:open-external", url)
});
