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

    ipcMain.on("toggle-devtools", (event) => {
      if (this.mainWindow.webContents.isDevToolsOpened()) {
        this.mainWindow.webContents.closeDevTools();
      } else {
        this.mainWindow.webContents.openDevTools({ mode: "detach" });
      }
      event.reply("devtools-status", this.mainWindow.webContents.isDevToolsOpened());
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

  public getMainWindow() {
    return this.mainWindow;
  }
}
