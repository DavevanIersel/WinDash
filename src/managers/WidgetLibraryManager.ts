import { BrowserWindow, ipcMain, screen } from "electron";
import * as path from "path";
import { Widget } from "../models/Widget";
import WidgetFileSystemService from "../services/WidgetFileSystemService";
import { WidgetManager } from "./WidgetManager";

export class WidgetLibraryManager {
  private libraryWindow: BrowserWindow | null = null;
  private widgetFileSystemService: WidgetFileSystemService;
  private widgetManager: WidgetManager;

  constructor(
    widgetFileSystemService: WidgetFileSystemService,
    widgetManager: WidgetManager
  ) {
    this.widgetFileSystemService = widgetFileSystemService;
    this.widgetManager = widgetManager;
    this.addCreateOrEditWidgetListener();
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
    this.libraryWindow.on("closed", (): void => (this.libraryWindow = null));
    this.loadLibrary();
    ipcMain.on("close-window", () => {
      this.libraryWindow?.close();
    });

    ipcMain.on("update-widget-data", (_event, widget: Widget) => {
      this.updateWidget(widget);
    });

    ipcMain.on(
      "toggle-edit-widget-view",
      (_event, enable: boolean, widget?: Widget) => {
        if (enable) {
          this.libraryWindow.loadFile(
            path.join(__dirname, "../views/edit-widget.html")
          );
          this.libraryWindow.webContents.once("did-finish-load", () => {
            this.libraryWindow?.webContents.send("load-widget", widget);
          });
        } else {
          this.loadLibrary();
        }
      }
    );
  }

  public loadLibrary() {
    this.libraryWindow.loadFile(path.join(__dirname, "../views/library.html"));
    this.libraryWindow.webContents.once("did-finish-load", () => {
      this.updateWidgets();
    });
  }

  public updateWidgets() {
    this.libraryWindow?.webContents.send(
      "update-widgets",
      this.widgetFileSystemService.getWidgets(true)
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
    this.widgetFileSystemService.updateWidgetInMemory(widget);
    this.libraryWindow?.webContents.send(
      "update-widgets",
      this.widgetFileSystemService.getWidgets(true)
    );
  }

  private addCreateOrEditWidgetListener() {
    ipcMain.on("create-or-edit-widget", (_event, widget: Widget) => {
      if (widget.fileName === undefined) {
        //New widget
        widget.fileName = this.widgetFileSystemService.toSafeWidgetName(
          widget.name
        );
      }
      this.widgetFileSystemService.saveWidgetConfig(widget);
      this.libraryWindow?.webContents.send(
        "update-widgets",
        this.widgetFileSystemService.getWidgets(true)
      );

      if (widget.enabled) {
        this.widgetManager.rerenderWidget(widget);
      }
    });
  }
}
