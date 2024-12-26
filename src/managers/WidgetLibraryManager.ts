import { BrowserWindow, ipcMain, screen } from "electron";
import * as path from "path";

export class WidgetLibraryManager {
  private libraryWindow: BrowserWindow | null = null;

  public createLibraryWindow() {
    const displays = screen.getAllDisplays();
    const secondDisplay = displays[2];
    const { x, y } = secondDisplay.bounds;

    this.libraryWindow = new BrowserWindow({
      width: 600,
      height: 400,
      x,
      y,
      skipTaskbar: true,
      frame: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: true,
        autoplayPolicy: "no-user-gesture-required",
        experimentalFeatures: true,
        partition: "persist:session",
      },
    });
    this.libraryWindow.setAlwaysOnTop(true)
    this.libraryWindow.on("closed", (): void => (this.libraryWindow = null));
    this.libraryWindow.loadFile(path.join(__dirname, "../views/library.html"));

    ipcMain.on("close-window", () => {
      this.libraryWindow?.close();
    });
  }

  public closeLibraryWindow() {
    this.libraryWindow.close();
  }
}
