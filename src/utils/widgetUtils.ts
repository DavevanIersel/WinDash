import { BrowserWindow, dialog, session, WebContentsView } from "electron";
import { Widget } from "../models/Widget";
import { join } from "path";
import { getExplicitPermissions } from "./permissionUtils";
import { Permission } from "../models/Permission";
import { readFileSync } from "fs";

const WIDGETS_DIR = "../widgets";
const cssPath = join(__dirname, "../styles/widget-styles.css");
const cssContent = readFileSync(cssPath, "utf-8");

export function setWidgetWebContents(view: WebContentsView, widget: Widget) {
  if (widget.html) {
    const localFilePath = join(__dirname, WIDGETS_DIR, widget.html);
    view.webContents.loadFile(localFilePath);
  } else if (widget.url) {
    view.webContents.loadURL(widget.url);
  } else {
    console.error("Widget must have either a 'url' or 'html'.");
    return;
  }
}

export function addScript(view: WebContentsView, widget: Widget) {
  if (widget.customScript) {
    view.webContents.executeJavaScript(widget.customScript);
  }
}

export function setPermissionHandler(
  window: BrowserWindow,
  resolveWidget: {
    widget?: Widget;
    getWidgetByViewId?: (viewId: number) => Widget | undefined;
  }
) {
  //TODO: may only need one of these
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      let widget = resolveWidget.widget;
      if (!widget) {
        widget = resolveWidget.getWidgetByViewId(webContents.id);
        if (!widget) {
          return;
        }
      }

      const explicitPermission = getExplicitPermissions(widget.permissions).get(
        permission as Permission
      );

      if (explicitPermission !== undefined) {
        callback(explicitPermission);
        return;
      }

      dialog
        .showMessageBox(window, {
          type: "question",
          buttons: ["Allow", "Deny"],
          defaultId: 0,
          title: "Permission Request",
          message: `${widget.name} wants to use the "${permission}" permission. Do you allow it?`,
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
}

export function setOnDidFinishLoadHandler(
  view: WebContentsView,
  widget: Widget
) {
  view.webContents.on("did-finish-load", () => {
    view.webContents.insertCSS(cssContent);

    if (widget.touchEnabled) {
      enableTouchEmulation(view);
    }
  });
}

export function setZoomFactor(view: WebContentsView, zoomFactor: number) {
  view.webContents.on("did-finish-load", () => {
    view.webContents.setZoomFactor(zoomFactor);
  });
}

export function setCloseHandler(view: WebContentsView, window: BrowserWindow) {
  window.on("closed", () => {
    view.webContents?.close();
  });
}

function enableTouchEmulation(view: WebContentsView) {
  if (view.webContents.debugger && !view.webContents.debugger.isAttached()) {
    try {
      view.webContents.debugger.attach("1.3");
    } catch (error) {
      console.error("Error attaching debugger:", error);
    }
  }

  view.webContents.debugger.sendCommand(
    "Emulation.setEmitTouchEventsForMouse",
    {
      enabled: true,
    }
  );
}
