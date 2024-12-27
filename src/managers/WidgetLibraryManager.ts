import { BrowserWindow, ipcMain, screen } from "electron";
import * as path from "path";
import config from "../config";
import { Widget } from "../models/Widget";

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
    this.libraryWindow.webContents.once("did-finish-load", () => {
      this.libraryWindow?.webContents.send("update-widgets", config.allWidgets);
    });

    
    ipcMain.on("close-window", () => {
      this.libraryWindow?.close();
    });
    
    ipcMain.on(
      "update-widget-data",
      (_event, widget: Widget) => {
        this.updateWidget(widget);
      }
    );
  }

  public toggleLibraryWindow() {
    if (this.libraryWindow) {
        this.libraryWindow.close();
    } else {
        this.createLibraryWindow();
    }
  }

  private updateWidget(widget: Widget) {
    config.saveWidget(widget);
    this.libraryWindow?.webContents.send("update-widgets", config.allWidgets);
  }
}
