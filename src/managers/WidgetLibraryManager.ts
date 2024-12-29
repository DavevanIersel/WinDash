import { BrowserWindow, ipcMain, screen } from "electron";
import * as path from "path";
import { Widget } from "../models/Widget";
import WidgetFileSystemService from "../services/WidgetFileSystemService";

export class WidgetLibraryManager {
  private libraryWindow: BrowserWindow | null = null;
  private widgetFileSystemService: WidgetFileSystemService;

  constructor(
    widgetFileSystemService: WidgetFileSystemService
  ) {
    this.widgetFileSystemService = widgetFileSystemService;

    ipcMain.on("toggle-library", () => {
      if (this.libraryWindow) {
        this.libraryWindow.close();
      } else {
        this.createLibraryWindow();
      }
    });
  }

  public createLibraryWindow() {
    const displays = screen.getAllDisplays();
    const secondDisplay = displays[2];
    const { x, y } = secondDisplay.bounds;

    this.libraryWindow = new BrowserWindow({
      width: 1200,
      height: 800,
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

    this.libraryWindow.setAlwaysOnTop(true, "floating");
    this.loadLibrary();

    this.libraryWindow.on("closed", (): void => (this.libraryWindow = null));

    this.widgetFileSystemService.on("reload-widget", (_widget: Widget) => {
      this.reloadWidgets();
    });

    this.widgetFileSystemService.on("reload-widgets", (_widgets: Widget[]) => {
      this.reloadWidgets();
    });

    ipcMain.on(
      "toggle-edit-widget-view",
      (_event, enable: boolean, widget?: Widget) => {
        if (enable) {
          this.libraryWindow.loadFile(
            path.join(__dirname, "../views/edit-widget.html")
          );
          this.libraryWindow.webContents.once("did-finish-load", () => {
            this.libraryWindow?.webContents.send("load-widget-for-edit", widget);
          });
        } else {
          this.loadLibrary();
        }
      }
    );
    
    ipcMain.on("close-window", this.cleanupListeners);
  }

  public loadLibrary() {
    this.libraryWindow.loadFile(path.join(__dirname, "../views/library.html"));
    this.libraryWindow.webContents.once("did-finish-load", () => {
      this.reloadWidgets();
    });
  }

  public reloadWidgets() {
    this.libraryWindow?.webContents.send(
      "update-widgets",
      this.widgetFileSystemService.getWidgets(true)
    );
  }

  private cleanupListeners() {
    this.libraryWindow?.close();
    this.widgetFileSystemService.removeListener("reload-widget", this.reloadWidgets);
    this.widgetFileSystemService.removeListener("reload-widgets", this.reloadWidgets);
    
    ipcMain.removeListener("close-window", this.cleanupListeners);
  }
}
