import { BrowserWindow, ipcMain } from "electron";
import * as path from "path";

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  public createMainWindow(bounds: Electron.Rectangle) {
    this.mainWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      icon: "./src/assets/logo.ico",
      transparent: true,
      skipTaskbar: true,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: true,
        preload: path.join(__dirname, "../preload.js"),
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

    // Handle pass through when clicking on transparent parts of the window (called by preload.ts)
    ipcMain.on("set-click-through", (_event, shouldPassThrough: boolean) => {
      if (this.mainWindow) {
        if (shouldPassThrough) {
          this.mainWindow.setIgnoreMouseEvents(true, { forward: true });
        } else {
          this.mainWindow.setIgnoreMouseEvents(false);
        }
      }
    });
  }

  public moveWindow(bounds: Electron.Rectangle) {
    this.mainWindow.setBounds(bounds)
  }

  public getMainWindow() {
    return this.mainWindow;
  }
}
