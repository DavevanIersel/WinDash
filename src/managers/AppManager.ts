import { app, components } from "electron";
import { WindowManager } from "./WindowManager";
import { TrayManager } from "./TrayManager";
import { WidgetManager } from "./WidgetManager";
import { WidgetLibraryManager } from "./WidgetLibraryManager";
import WidgetFileSystemService from "../services/WidgetFileSystemService";
import { SettingsManager } from "./SettingsManager";

export class AppManager {
  private windowManager: WindowManager;
  private settingsManager: SettingsManager;
  private trayManager: TrayManager;
  private widgetManager: WidgetManager;
  private widgetLibraryManager: WidgetLibraryManager;
  private widgetFileSystemService: WidgetFileSystemService;

  constructor() {
    this.widgetFileSystemService = new WidgetFileSystemService();
    this.windowManager = new WindowManager();
    this.trayManager = new TrayManager();
    this.widgetFileSystemService = new WidgetFileSystemService();
    this.widgetManager = new WidgetManager(this.windowManager, this.widgetFileSystemService);
    this.widgetLibraryManager = new WidgetLibraryManager(this.widgetFileSystemService);
    this.settingsManager = new SettingsManager(this.windowManager);
  }

  public async initialize() {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath("exe")
  });
    await app.whenReady();
    await components.whenReady();

    this.windowManager.createMainWindow();
    this.trayManager.initialize(this.windowManager.getMainWindow(), this.settingsManager);
    this.widgetManager.initializeWidgets();

    app.on("window-all-closed", this.onAllWindowsClosed);
  }

  private onAllWindowsClosed() {
    if (process.platform !== "darwin") app.quit();
  }
}
