import { Tray, Menu, BrowserWindow } from "electron";
import * as path from "path";
import { SettingsManager } from "./SettingsManager";
import { WidgetLibraryManager } from "./WidgetLibraryManager";

export class TrayManager {
  private tray: Tray | null = null;

  public initialize(
    mainWindow: BrowserWindow | null,
    widgetLibraryManager: WidgetLibraryManager,
    settingsManager: SettingsManager
  ) {
    this.tray = new Tray(path.join(__dirname, "../assets/logo96x96.ico"));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Edit Widgets",
        click: () => widgetLibraryManager.openLibraryWindow(),
      },
      {
        label: "Settings",
        click: () => settingsManager.createSettingsWindow(),
      },
      {
        label: "Toggle DevTools",
        click: () => this.toggleMainWindowDevTools(mainWindow),
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

  private toggleMainWindowDevTools(mainWindow: BrowserWindow | null) {
    if (!mainWindow) return;
    
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  }
}
