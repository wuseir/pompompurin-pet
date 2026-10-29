import { app, BrowserWindow, screen, Tray, Menu, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

ipcMain.handle("get-screen-size", () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { width, height };
});

const require = createRequire(import.meta.url);

import type Win32KeyboardHook from "@lysyyds/win32-mouse-keyboard-hook";
const win32KeyboardHook: typeof Win32KeyboardHook = require("@lysyyds/win32-mouse-keyboard-hook");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createHook() {
  win32KeyboardHook.on("key", (eventType, keyCode) => {
    win?.webContents.send("global-keyboard-hook-event", eventType, keyCode);
  });
  win32KeyboardHook.on("mouse", (eventType, x, y) => {
    win?.webContents.send("global-mouse-hook-event", eventType, x, y);
  });
  win32KeyboardHook.start();
}

function createWindow() {
  win = new BrowserWindow({
    width: 306,
    height: 277,
    skipTaskbar: true,
    frame: false, // 无边框
    transparent: true, // 透明背景
    alwaysOnTop: true, // 置顶
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win.setPosition(width - 306, height - 277);

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  // win.webContents.openDevTools();
}

function createTray() {
  const icon = path.join(process.env.VITE_PUBLIC, "Chiikawa.png");
  const tray = new Tray(icon); // 你的托盘图标
  const contextMenu = Menu.buildFromTemplate([
    { label: "退出", click: () => app.quit() },
    {
      label: "切换角色",
      submenu: [
        {
          label: "BongoCat",
          click: () => win?.webContents.send("change-charator", "BongoCat"),
        },
        {
          label: "吉伊",
          click: () => win?.webContents.send("change-charator", "chii"),
        },
        {
          label: "小八",
          click: () => win?.webContents.send("change-charator", "hachiware"),
        },
        {
          label: "乌萨奇",
          click: () => win?.webContents.send("change-charator", "usagi"),
        },
      ],
    },
  ]);
  tray.setToolTip("chiikawa-pet");
  tray.setContextMenu(contextMenu);
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
    win32KeyboardHook.stop();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  createHook();
});
