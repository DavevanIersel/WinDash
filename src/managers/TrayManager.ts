import { Tray, Menu, BrowserWindow } from "electron";
import * as path from "path";
import { SettingsManager } from "./SettingsManager";

export class TrayManager {
  private tray: Tray | null = null;

  public initialize(mainWindow: BrowserWindow | null, settingsManager: SettingsManager) {
    this.tray = new Tray(path.join(__dirname, "../assets/logo.ico"));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: () => mainWindow?.show(),
      },
      {
        label: "Settings",
        click: () => settingsManager.createSettingsWindow(),
      },
      {
        label: "Quit",
        click: () => {
          mainWindow?.close();
          process.exit(0);
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip("WinDash");
  }
}
