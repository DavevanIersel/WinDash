import { WebContentsView, ipcMain, session } from "electron";
import { Widget } from "../models/Widget";
import { calculateGridCellSize } from "../utils/gridUtils";
import config from "../config";
import { WindowManager } from "./WindowManager";
import { join } from "path";
import { readFileSync } from "fs";

const widgetWebContentsMap = new Map<number, Widget>();
const views: WebContentsView[] = [];
const PADDING = 50;

const cssPath = join(__dirname, "../styles/styles.css");
const cssContent = readFileSync(cssPath, "utf-8");

export class WidgetManager {
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  public initializeWidgets() {
    const { gridWidth, gridHeight } = calculateGridCellSize(
      this.windowManager.getMainWindow().getBounds().width - 2 * PADDING,
      this.windowManager.getMainWindow().getBounds().height - 2 * PADDING,
      config
    );

    config.widgets.forEach((widget: Widget) => {
      this.createWidget(widget, gridWidth, gridHeight);
    });

    overwriteUserAgents();
  }

  private createWidget(widget: Widget, gridWidth: number, gridHeight: number) {
    const view = new WebContentsView();
    view.webContents.loadURL(widget.url);
    views.push(view);

    widgetWebContentsMap.set(view.webContents.id, widget);
    view.setBounds({
      x: widget.x * gridWidth + PADDING,
      y: widget.y * gridHeight + PADDING,
      width: widget.width * gridWidth,
      height: widget.height * gridHeight,
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
    this.createDraggableContainer(
      widget.x * gridWidth + PADDING,
      widget.y * gridHeight + PADDING,
      widget.width * gridWidth,
      widget.height * gridHeight
    );
    
    ipcMain.on("toggle-devtools", (event, isOpen: boolean) => {
      if (isOpen) {
        this.windowManager.getMainWindow().contentView.removeChildView(view);
      } else {
        this.windowManager.getMainWindow().contentView.addChildView(view);
      }
    });
  }

  private createDraggableContainer(
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const containerId = `container-${Math.floor(x)}-${Math.floor(y)}`;

    this.windowManager.getMainWindow().webContents.executeJavaScript(`
      var container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '${x}px';
      container.style.top = '${y}px';
      container.style.width = '${width}px';
      container.style.height = '${height}px';
      container.style.outline = '5px solid black' ;
      container.style.backgroundColor = 'black';
      container.classList.add('draggable-container');
      container.id = '${containerId}';
      document.body.appendChild(container);
    `);
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
