import { WebContentsView, session } from "electron";
import { Widget } from "../models/Widget";
import { WindowManager } from "./WindowManager";
import { Position } from "../models/Position";
import WidgetFileSystemService from "../services/WidgetFileSystemService";
import {
  addScript,
  forceInCurrentTab,
  createView,
  overwriteUserAgents,
  setCloseHandler,
  setOnDidFinishLoadHandler,
  setPermissionHandler,
  setWidgetWebContents,
  setZoomFactor,
  addAdblocker,
} from "../utils/widgetUtils.js";

const viewIdToWidgetMap = new Map<number, Widget>();
const views: WebContentsView[] = [];

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
      oldWidget.forceInCurrentTab !== newWidget.forceInCurrentTab ||
      // Deep equality as these are arrays with objects in them
      JSON.stringify(oldWidget.customUserAgent) !==
        JSON.stringify(newWidget.customUserAgent) ||
      JSON.stringify(oldWidget.permissions) !==
        JSON.stringify(newWidget.permissions)
    );
  }

  private createWidget(widget: Widget) {
    const view = createView(widget);
    overwriteUserAgents(widget);
    setWidgetWebContents(view, widget);
    viewIdToWidgetMap.set(view.webContents.id, widget);
    view.setBounds({
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
    });
    addAdblocker(widget);
    addScript(view, widget);
    setOnDidFinishLoadHandler(view, widget);
    setPermissionHandler(this.windowManager.getMainWindow(), widget);
    setCloseHandler(view, this.windowManager.getMainWindow());
    setZoomFactor(view, 1); //TODO: or custom value from config
    forceInCurrentTab(view, widget);

    this.windowManager.getMainWindow().contentView.addChildView(view);

    if (widget.devTools) {
      //TODO: remove and replace for some button/ui interaction
      view.webContents.toggleDevTools();
    }

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
