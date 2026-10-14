const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("helixDesktop", {
  isElectron: true,
  openFile: (filePath) => ipcRenderer.invoke("helix:open-file", filePath),
  showInFolder: (filePath) => ipcRenderer.invoke("helix:show-in-folder", filePath),
});
