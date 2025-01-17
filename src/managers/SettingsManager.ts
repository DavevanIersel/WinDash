import { BrowserWindow, ipcMain, screen } from "electron";
import * as path from "path";
import { Settings } from "../models/Settings";
import { getSettings, saveSettings } from "../utils/settingsUtils";
import { WindowManager } from "./WindowManager";

const SETTINGS_PAGE = "../views/settings/settings.html";

export class SettingsManager {
  private settingsWindow: BrowserWindow | null = null;
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  public createSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.moveTop();
      return;
    }

    const settings = getSettings();

    this.settingsWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      x: settings.displayBounds.x,
      y: settings.displayBounds.y,
      skipTaskbar: true,
      frame: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: true,
        partition: "persist:session",
      },
    });

    this.settingsWindow.setAlwaysOnTop(true, "normal");
    this.settingsWindow.loadFile(
      path.join(__dirname, SETTINGS_PAGE)
    );

    this.settingsWindow.webContents.once("did-finish-load", () => {
      this.reloadSettings();
    });

    ipcMain.on("save-settings", (_event, settings: Settings) => {
      saveSettings(settings);
      this.windowManager.moveWindow({
        x: settings.displayBounds.x,
        y: settings.displayBounds.y,
        width: settings.displayBounds.width,
        height: settings.displayBounds.height,
      })
    });

    this.settingsWindow.on("closed", (): void => (this.settingsWindow = null));
    ipcMain.on("close-window", this.cleanupListeners);
  }

  private cleanupListeners() {
    if (this.settingsWindow) {
      this.settingsWindow.removeListener("closed", this.cleanupListeners);
      this.settingsWindow = null;
    }
  }

  public reloadSettings() {
    this.settingsWindow?.webContents.send(
      "update-settings",
      getSettings(),
      screen.getAllDisplays()
    );
  }
}
