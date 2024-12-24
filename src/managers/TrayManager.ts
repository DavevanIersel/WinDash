import { Tray, Menu, BrowserWindow } from "electron";
import * as path from "path";

export class TrayManager {
  private tray: Tray | null = null;

  public initialize(mainWindow: BrowserWindow | null) {
    this.tray = new Tray(path.join(__dirname, "../assets/WinDash-logo.png"));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: () => mainWindow?.show(),
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
