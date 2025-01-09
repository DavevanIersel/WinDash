import { BrowserWindow, ipcMain, screen, WebContentsView } from "electron";
import * as path from "path";
import { Widget } from "../models/Widget";
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
import { getSettings } from "../utils/settingsUtils";

const LIBRARY_PAGE = "../views/library/library.html";
const EDIT_WIDGET_PAGE = "../views/edit-widget/edit-widget.html";
const PREVIEW_PANE_PADDING = 10;
const PREVIEW_PANE_WIDTH_PERCENTAGE = 0.6;

export class WidgetLibraryManager {
  private libraryWindow: BrowserWindow | null = null;
  private previewView: WebContentsView | null = null;
  private previewWidget: Widget | null = null;
  private widgetFileSystemService: WidgetFileSystemService;

  constructor(
    widgetFileSystemService: WidgetFileSystemService
  ) {
    this.widgetFileSystemService = widgetFileSystemService;

    ipcMain.on("toggle-library", () => {
      if (this.libraryWindow) {
        this.libraryWindow.close();
      } else {
        this.createLibraryWindow();
      }
    });
  }

  public createLibraryWindow() {
    const settings = getSettings();

    this.libraryWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      x: settings.displayX,
      y: settings.displayY,
      skipTaskbar: true,
      frame: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: true,
        autoplayPolicy: "no-user-gesture-required",
        experimentalFeatures: true,
        partition: "persist:session",
      },
    });

    this.libraryWindow.setAlwaysOnTop(true, "normal");
    this.loadLibrary();

    this.libraryWindow.on("resize", () => {
      if (this.previewWidget) {
        const { x, y, width, height, zoomFactor } =
          this.calculatePreviewSizeAndPosition(this.previewWidget);
        this.previewView.setBounds({ x, y, width, height });
        this.previewView.webContents.setZoomFactor(zoomFactor);
      }
    });

    this.libraryWindow.on("closed", (): void => (this.libraryWindow = null));

    this.widgetFileSystemService.on("reload-widget", (_widget: Widget) => {
      this.reloadWidgets();
    });

    this.widgetFileSystemService.on("reload-widgets", (_widgets: Widget[]) => {
      this.reloadWidgets();
    });

    ipcMain.on(
      "toggle-edit-widget-view",
      (_event, enable: boolean, widget?: Widget) => {
        if (enable) {
          this.libraryWindow.loadFile(
            path.join(__dirname, EDIT_WIDGET_PAGE)
          );
          this.libraryWindow.webContents.once("did-finish-load", () => {
            this.libraryWindow?.webContents.send(
              "load-widget-for-edit",
              widget
            );

            this.previewView = createView(widget);
            this.loadWidgetIntoPreview(widget);
            this.libraryWindow.contentView.addChildView(this.previewView);
          });
        } else {
          this.removePreview();
          this.loadLibrary();
        }
      }
    );

    ipcMain.on("update-preview", (_event, widget: Widget) => {
      this.loadWidgetIntoPreview(widget);
    });

    ipcMain.on("close-window", this.cleanupListeners);
  }

  public loadLibrary() {
    this.libraryWindow.loadFile(path.join(__dirname, LIBRARY_PAGE));
    this.libraryWindow.webContents.once("did-finish-load", () => {
      this.reloadWidgets();
    });
  }

  public reloadWidgets() {
    this.libraryWindow?.webContents.send(
      "update-widgets",
      this.widgetFileSystemService.getWidgets(true)
    );
  }

  private cleanupListeners() {
    this.removePreview();
    this.libraryWindow?.close();
    this.widgetFileSystemService.removeListener(
      "reload-widget",
      this.reloadWidgets
    );
    this.widgetFileSystemService.removeListener(
      "reload-widgets",
      this.reloadWidgets
    );

    ipcMain.removeListener("close-window", this.cleanupListeners);
  }

  private removePreview() {
    if (!this.previewView) return;
    this.libraryWindow?.contentView.removeChildView(this.previewView);
    this.previewView.webContents.close();
    this.previewView = null;
    this.previewWidget = null;
  }

  private loadWidgetIntoPreview(widget: Widget) {
    if (!widget || (!widget.html && !widget.url)) return;
    const oldWidget = { ...this.previewWidget };
    this.previewWidget = widget;
    if (
      oldWidget.html !== this.previewWidget.html ||
      oldWidget.url !== this.previewWidget.url
    ) {
      setWidgetWebContents(this.previewView, widget);
    }
    const { x, y, width, height, zoomFactor } =
      this.calculatePreviewSizeAndPosition(widget);
    this.previewView.setBounds({ x: x, y: y, width: width, height: height });
    setZoomFactor(this.previewView, zoomFactor);
    addAdblocker(widget);
    addScript(this.previewView, widget);
    setOnDidFinishLoadHandler(this.previewView, widget);
    setPermissionHandler(this.libraryWindow, widget);
    overwriteUserAgents(widget);
    forceInCurrentTab(this.previewView, widget);
    setCloseHandler(this.previewView, this.libraryWindow);
  }

  private calculatePreviewSizeAndPosition(widget: Widget): {
    x: number;
    y: number;
    width: number;
    height: number;
    zoomFactor: number;
  } {
    let { width: windowWidth, height: windowHeight } =
      this.libraryWindow.getContentBounds();
    const previewPaneWidth =
      windowWidth * PREVIEW_PANE_WIDTH_PERCENTAGE - PREVIEW_PANE_PADDING * 3; // 3 instead of 2 to account for a minor inconsistency between CSS width and getContentBounds
    const previewPaneHeight = windowHeight - PREVIEW_PANE_PADDING * 3;

    let scaledWidth = Number(widget.width);
    let scaledHeight = Number(widget.height);
    let zoomFactor = 1;
    if (scaledWidth > previewPaneWidth) {
      zoomFactor = previewPaneWidth / scaledWidth;
      scaledWidth = scaledWidth * zoomFactor;
      scaledHeight = scaledHeight * zoomFactor;
    }

    if (scaledHeight > previewPaneHeight) {
      zoomFactor = previewPaneHeight / Number(widget.height);
      scaledWidth = Number(widget.width) * zoomFactor;
      scaledHeight = Number(widget.height) * zoomFactor;
    }

    let previewX = previewPaneWidth / 2 - scaledWidth / 2;
    let previewY = previewPaneHeight / 2 - scaledHeight / 2;

    if (previewX < PREVIEW_PANE_PADDING) {
      previewX = PREVIEW_PANE_PADDING;
    }
    if (previewY < PREVIEW_PANE_PADDING) {
      previewY = PREVIEW_PANE_PADDING;
    }
    if (zoomFactor <= 0.0) {
      zoomFactor = 0.01;
    }
    return {
      x: previewX,
      y: previewY,
      width: scaledWidth,
      height: scaledHeight,
      zoomFactor: zoomFactor,
    };
  }
}
