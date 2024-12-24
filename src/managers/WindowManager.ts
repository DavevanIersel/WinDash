import { BrowserWindow, ipcMain, screen } from "electron";
import * as path from "path";

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  public createMainWindow() {
    const displays = screen.getAllDisplays();
    const secondDisplay = displays[2];
    const { x, y } = secondDisplay.bounds;

    this.mainWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      x,
      y,
      icon: "./src/assets/WinDash-logo.png",
      transparent: true,
      skipTaskbar: true,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: true,
        preload: path.join(__dirname, "preload.js"),
        autoplayPolicy: "no-user-gesture-required",
        allowRunningInsecureContent: false,
        experimentalFeatures: true,
        partition: "persist:session",
      },
    });

    this.mainWindow.maximize();
    this.mainWindow.on("closed", (): void => (this.mainWindow = null));
    this.mainWindow.loadFile(path.join(__dirname, "../main.html"));

    ipcMain.on("close-window", () => {
      this.mainWindow?.close();
    });
    this.mainWindow.webContents.openDevTools({ mode: "detach" });
    ipcMain.on("toggle-devtools", (event, isOpen: boolean) => {
      if (!this.mainWindow) {
        return;
      }
      if (isOpen) {
        this.mainWindow.webContents.openDevTools({ mode: "detach" });
      } else {
        this.mainWindow.webContents.closeDevTools();
      }
    });
  }

  public getMainWindow() {
    return this.mainWindow;
  }
}
