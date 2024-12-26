import { WebContentsView, ipcMain, session } from "electron";
import { Widget } from "../models/Widget";
import config from "../config";
import { WindowManager } from "./WindowManager";
import { join } from "path";
import { readFileSync } from "fs";
import { Position } from "../models/Position";

const widgetWebContentsMap = new Map<number, Widget>();
const views: WebContentsView[] = [];

const cssPath = join(__dirname, "../styles/widget-styles.css");
const cssContent = readFileSync(cssPath, "utf-8");

export class WidgetManager {
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  public initializeWidgets() {
    config.widgets.forEach((widget: Widget) => {
      this.createWidget(widget);
    });

    const widgetPositions = new Map<number, Position>();
    widgetWebContentsMap.forEach((widget, id) => {
      widgetPositions.set(id, {
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
      });
    });

    this.sendWidgetPositions(widgetPositions);

    overwriteUserAgents();

    ipcMain.on(
      "update-widget-positions",
      (event, widgetPositions: Map<number, Position>, save: boolean) => {
        this.updateWidgetPositions(widgetPositions, save);
      }
    );
  }

  private createWidget(widget: Widget) {
    const view = new WebContentsView();

    if (widget.html) {
      const localFilePath = join(__dirname, "../widgets",widget.html);
      view.webContents.loadFile(localFilePath);
    } else if (widget.url) {
      view.webContents.loadURL(widget.url);
    } else {
      console.error("Widget must have either a 'url' or 'html'.");
      return;
    }

    widgetWebContentsMap.set(view.webContents.id, widget);
    view.setBounds({
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
    });

    if (widget.devTools) {
      view.webContents.toggleDevTools();
    }

    if (widget.customScript) {
      view.webContents.executeJavaScript(widget.customScript);
    }

    view.webContents.on("did-finish-load", () => {
      injectCSS(view.webContents);

      if (widget.touchEnabled) {
        enableTouchEmulation(view.webContents);
      }
    });

    this.windowManager.getMainWindow().contentView.addChildView(view);

    this.windowManager.getMainWindow().on("closed", () => {
      view.webContents.close();
    });

    // Add a container below the WebContentsView for grid management (Drag and Drop)
    this.createDraggableWidgetFromMain(
      view.webContents.id,
      widget.x,
      widget.y,
      widget.width,
      widget.height
    );
    views.push(view);
  }

  public createDraggableWidgetFromMain(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    this.windowManager.getMainWindow().webContents.on("did-finish-load", () => {
      this.windowManager
        .getMainWindow()
        .webContents.send("create-draggable-widget", id, x, y, width, height);
    });
  }

  private updateWidgetPositions(
    widgetPositions: Map<number, Position>,
    save: boolean
  ) {
    this.sendWidgetPositions(widgetPositions);
    widgetPositions.forEach((position, id) => {
      const widget = widgetWebContentsMap.get(id);
      if (widget) {
        widgetWebContentsMap.set(id, {
          ...widget,
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
        });

        const view = views.find((view) => view.webContents.id === id);
        if (save) {
          config.saveWidget(widget);
        }
        view?.setBounds({
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
        });
      }
    });
  }

  //Update positions for click pass through calculations (preload.ts)
  private sendWidgetPositions(widgetPositions: Map<number, Position>) {
    const mainWindow = this.windowManager.getMainWindow();
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(
        "widget-location-update-for-preload",
        widgetPositions
      );
    }
  }
}

const injectCSS = (webContents: any) => {
  webContents.insertCSS(cssContent);
};

const enableTouchEmulation = (webContents: any) => {
  if (webContents.debugger && !webContents.debugger.attached) {
    try {
      webContents.debugger.attach("1.3");
    } catch (error) {
      console.error("Error attaching debugger:", error);
    }
  }

  webContents.debugger.sendCommand("Emulation.setEmitTouchEventsForMouse", {
    enabled: true,
  });
};

const overwriteUserAgents = () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = new URL(details.url);
    const originalUserAgent = session.defaultSession.getUserAgent();
    let userAgent = originalUserAgent;

    const widget = widgetWebContentsMap.get(details.webContentsId);

    if (widget && widget.customUserAgent) {
      for (const [domain, customAgent] of Object.entries(
        widget.customUserAgent
      )) {
        if (url.hostname.includes(domain)) {
          userAgent = customAgent;
          break;
        }
      }
    }

    details.requestHeaders["User-Agent"] = userAgent;
    callback({ requestHeaders: details.requestHeaders });
  });
};
