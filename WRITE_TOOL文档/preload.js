const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopDraftAPI", {
  toggleAlwaysOnTop: (nextState) => ipcRenderer.invoke("window:toggle-always-on-top", nextState),
  saveImage: (dataUrl, defaultName) => ipcRenderer.invoke("draft:save-image", { dataUrl, defaultName }),
  setClickThrough: (enabled) => ipcRenderer.send("window:set-click-through", enabled),
  closeWindow: () => ipcRenderer.send("window:close")
});
