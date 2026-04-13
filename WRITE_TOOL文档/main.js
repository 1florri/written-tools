const { app, BrowserWindow, ipcMain, dialog, nativeImage, screen } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;
  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    resizable: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
}

ipcMain.handle("window:toggle-always-on-top", (_event, nextState) => {
  if (!mainWindow) {
    return false;
  }
  mainWindow.setAlwaysOnTop(Boolean(nextState), "screen-saver");
  return mainWindow.isAlwaysOnTop();
});

ipcMain.on("window:set-click-through", (_event, enabled) => {
  if (!mainWindow) {
    return;
  }
  mainWindow.setIgnoreMouseEvents(Boolean(enabled), { forward: true });
});

ipcMain.on("window:close", () => {
  if (!mainWindow) {
    return;
  }
  mainWindow.close();
});

ipcMain.handle("draft:save-image", async (_event, payload) => {
  if (!mainWindow || !payload || typeof payload.dataUrl !== "string") {
    return { ok: false, message: "无效的保存数据" };
  }

  const desktopDir = app.getPath("desktop");
  const defaultName = payload.defaultName || "桌面草稿.png";
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "保存草稿",
    defaultPath: path.join(desktopDir, defaultName),
    filters: [{ name: "PNG 图片", extensions: ["png"] }]
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }

  try {
    const image = nativeImage.createFromDataURL(payload.dataUrl);
    const pngBuffer = image.toPNG();
    fs.writeFileSync(result.filePath, pngBuffer);
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, message: error.message || "保存失败" };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
