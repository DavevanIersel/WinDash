import { WebContentsView, session, dialog, ipcMain } from "electron";
import { Widget } from "../models/Widget";
import { WindowManager } from "./WindowManager";
import { join } from "path";
import { readFileSync } from "fs";
import { Position } from "../models/Position";
import WidgetFileSystemService from "../services/WidgetFileSystemService";
import { getExplicitPermissions } from "../utils/permissionUtils";
import { Permission } from "../models/Permission";

const viewIdToWidgetMap = new Map<number, Widget>();
const views: WebContentsView[] = [];

const cssPath = join(__dirname, "../styles/widget-styles.css");
const cssContent = readFileSync(cssPath, "utf-8");

export class WidgetManager {
  private windowManager: WindowManager;
  private widgetFileSystemService: WidgetFileSystemService;

  constructor(
    windowManager: WindowManager,
    widgetFileSystemService: WidgetFileSystemService
  ) {
    this.windowManager = windowManager;
    this.widgetFileSystemService = widgetFileSystemService;
  }

  public initializeWidgets() {
    this.widgetFileSystemService.getWidgets(false).forEach((widget: Widget) => {
      this.createWidget(widget);
    });
    this.sendWidgetPositions();
    overwriteUserAgents();

    this.widgetFileSystemService.on("reload-widget", (widget: Widget) => {
      const viewExists = this.viewExists(widget.id);
      const oldWidget = viewIdToWidgetMap.get(
        this.getViewIDByWidgetID(widget.id)
      );

      const shouldRerender = this.shouldRerender(oldWidget, widget);
      if (viewExists && shouldRerender) {
        this.removeWidget(widget);
      }
      if (shouldRerender && widget.enabled) {
        this.createWidget(widget);
      }

      if (!shouldRerender) {
        views
          .find(
            (view) =>
              view.webContents.id === this.getViewIDByWidgetID(widget.id)
          )
          .setBounds({
            x: widget.x,
            y: widget.y,
            width: widget.width,
            height: widget.height,
          });
      }
      this.sendWidgetPositions();
    });

    this.widgetFileSystemService.on("reload-widgets", (widgets: Widget[]) => {
      widgets.forEach((widget) => {
        const viewExists = this.viewExists(widget.id);
        const oldWidget = viewIdToWidgetMap.get(
          this.getViewIDByWidgetID(widget.id)
        );
        const shouldRerender = this.shouldRerender(oldWidget, widget);
        if (viewExists && shouldRerender) {
          this.removeWidget(widget);
        }
        if (shouldRerender && widget.enabled) {
          this.createWidget(widget);
        }

        if (!shouldRerender) {
          views
            .find(
              (view) =>
                view.webContents.id === this.getViewIDByWidgetID(widget.id)
            )
            .setBounds({
              x: widget.x,
              y: widget.y,
              width: widget.width,
              height: widget.height,
            });
        }
      });
      this.sendWidgetPositions();
    });
  }

  private shouldRerender(oldWidget?: Widget, newWidget?: Widget) {
    if (!oldWidget || !newWidget) return true;
    return (
      oldWidget.id !== newWidget.id ||
      oldWidget.fileName !== newWidget.fileName ||
      oldWidget.name !== newWidget.name ||
      oldWidget.html !== newWidget.html ||
      oldWidget.url !== newWidget.url ||
      oldWidget.touchEnabled !== newWidget.touchEnabled ||
      oldWidget.enabled !== newWidget.enabled ||
      oldWidget.customScript !== newWidget.customScript ||
      oldWidget.devTools !== newWidget.devTools ||
      // Deep equality as these are arrays with objects in them
      JSON.stringify(oldWidget.customUserAgent) !==
        JSON.stringify(newWidget.customUserAgent) ||
      JSON.stringify(oldWidget.permissions) !==
        JSON.stringify(newWidget.permissions)
    );
  }

  private createWidget(widget: Widget) {
    const view = new WebContentsView();

    if (widget.html) {
      const localFilePath = join(__dirname, "../widgets", widget.html);
      view.webContents.loadFile(localFilePath);
    } else if (widget.url) {
      view.webContents.loadURL(widget.url);
    } else {
      console.error("Widget must have either a 'url' or 'html'.");
      return;
    }

    viewIdToWidgetMap.set(view.webContents.id, widget);
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
      view.webContents?.close();
    });

    session.defaultSession.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        const currentWidget = viewIdToWidgetMap.get(webContents.id);
        if (!widget) {
          callback(false);
          return;
        }
        const explicitPermission = getExplicitPermissions(
          currentWidget.permissions
        ).get(permission as Permission);

        if (explicitPermission !== undefined) {
          callback(explicitPermission);
          return;
        }

        dialog
          .showMessageBox(this.windowManager.getMainWindow(), {
            type: "question",
            buttons: ["Allow", "Deny"],
            defaultId: 0,
            title: "Permission Request",
            message: `${currentWidget.name} wants to use the "${permission}" permission. Do you allow it?`,
          })
          .then((result) => {
            callback(result.response === 0);
          })
          .catch((err) => {
            console.error(err);
            callback(false);
          });
      }
    );

    // Add a container below the WebContentsView for grid management (Drag and Drop)
    this.createDraggableWidgetFromMain(
      widget.id,
      view.webContents.id,
      widget.x,
      widget.y,
      widget.width,
      widget.height
    );
    views.push(view);
  }

  public createDraggableWidgetFromMain(
    widgetId: string,
    viewId: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const mainWindow = this.windowManager.getMainWindow();
    const webContents = mainWindow.webContents;

    if (webContents.isLoading()) {
      webContents.on("did-finish-load", () => {
        webContents.send(
          "create-draggable-widget",
          widgetId,
          viewId,
          x,
          y,
          width,
          height
        );
      });
    } else {
      webContents.send(
        "create-draggable-widget",
        widgetId,
        viewId,
        x,
        y,
        width,
        height
      );
    }
  }

  //Update positions for click pass through calculations (preload.ts)
  private sendWidgetPositions() {
    const widgetPositions = new Map<number, Position>();
    viewIdToWidgetMap.forEach((widget, viewId) => {
      widgetPositions.set(viewId, {
        widgetId: widget.id,
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
      });
    });

    this.windowManager
      .getMainWindow()
      .webContents.send("widget-location-update-for-preload", widgetPositions);
  }
  private viewExists(widgetId: string) {
    const viewId = this.getViewIDByWidgetID(widgetId);
    return viewId && viewIdToWidgetMap.get(viewId);
  }

  private getViewIDByWidgetID(widgetId: string): number | null {
    for (const [viewId, widget] of viewIdToWidgetMap.entries()) {
      if (widget.id === widgetId) {
        return viewId;
      }
    }
    return null;
  }

  public rerenderWidget(widget: Widget) {
    const viewId = this.getViewIDByWidgetID(widget.id);
    if (viewId) {
      viewIdToWidgetMap.delete(viewId);
    }
    const viewIndex = views.findIndex((view) => view.webContents.id === viewId);

    if (viewIndex !== -1) {
      const view = views.splice(viewIndex, 1)[0];
      this.windowManager.getMainWindow().contentView.removeChildView(view);
      view.webContents?.close();
    }

    this.windowManager
      .getMainWindow()
      .webContents.send("remove-draggable-widget", widget);

    this.createWidget(widget);
    this.sendWidgetPositions();
  }

  public removeWidget(widget: Widget) {
    const viewId = this.getViewIDByWidgetID(widget.id);
    viewIdToWidgetMap.delete(viewId);
    const viewIndex = views.findIndex((view) => view.webContents.id === viewId);

    if (viewIndex !== -1) {
      const view = views.splice(viewIndex, 1)[0];
      this.windowManager.getMainWindow().contentView.removeChildView(view);
      view.webContents?.close();
    } else {
      console.error(
        `View not found: widget ID - ${widget.id}, view ID - ${viewId}`
      );
    }
    this.windowManager
      .getMainWindow()
      .webContents.send("remove-draggable-widget", widget);
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

    const widget = viewIdToWidgetMap.get(details.webContentsId);

    if (widget && Array.isArray(widget.customUserAgent)) {
      for (const { domain, userAgent: customAgent } of widget.customUserAgent) {
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
