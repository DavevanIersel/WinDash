import { app, components, ipcMain, session } from "electron";
import { WindowManager } from "./WindowManager";
import { TrayManager } from "./TrayManager";
import { WidgetManager } from "./WidgetManager";
import { ElectronBlocker } from "@ghostery/adblocker-electron";
import { WidgetLibraryManager } from "./WidgetLibraryManager";
import WidgetFileSystemService from "../services/WidgetFileSystemService";

export class AppManager {
  private windowManager: WindowManager;
  private trayManager: TrayManager;
  private widgetManager: WidgetManager;
  private widgetLibraryManager: WidgetLibraryManager;
  private widgetFileSystemService: WidgetFileSystemService;

  constructor() {
    this.windowManager = new WindowManager();
    this.trayManager = new TrayManager();
    this.widgetFileSystemService = new WidgetFileSystemService();
    this.widgetManager = new WidgetManager(this.windowManager, this.widgetFileSystemService);
    this.widgetLibraryManager = new WidgetLibraryManager(this.widgetFileSystemService);
    this.widgetFileSystemService = new WidgetFileSystemService();
  }

  public async initialize() {
    await app.whenReady();
    await components.whenReady();
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    blocker.enableBlockingInSession(session.defaultSession);

    this.windowManager.createMainWindow();
    this.trayManager.initialize(this.windowManager.getMainWindow());
    this.widgetManager.initializeWidgets();

    app.on("window-all-closed", this.onAllWindowsClosed);
  
    ipcMain.on("toggle-library", () => {
      this.widgetLibraryManager.toggleLibraryWindow();
    });
  }

  private onAllWindowsClosed() {
    if (process.platform !== "darwin") app.quit();
  }
}
