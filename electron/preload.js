import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("studio", {
  getStatus: () => ipcRenderer.invoke("studio:get-status"),
  publishPost: (payload) => ipcRenderer.invoke("studio:publish-post", payload),
  publishBookmark: (payload) => ipcRenderer.invoke("studio:publish-bookmark", payload)
});
