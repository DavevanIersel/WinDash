import { app, components, session } from "electron";
import { WindowManager } from "./WindowManager";
import { TrayManager } from "./TrayManager";
import { WidgetManager } from "./WidgetManager";
import { ElectronBlocker } from "@ghostery/adblocker-electron";

export class AppManager {
  private windowManager: WindowManager;
  private trayManager: TrayManager;
  private widgetManager: WidgetManager;

  constructor() {
    this.windowManager = new WindowManager();
    this.trayManager = new TrayManager();
    this.widgetManager = new WidgetManager(this.windowManager);
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
  }

  private onAllWindowsClosed() {
    if (process.platform !== "darwin") app.quit();
  }
}
