import { BrowserWindow, dialog, session, WebContentsView } from "electron";
import { Widget } from "../models/Widget";
import { join } from "path";
import { getExplicitPermissions } from "./permissionUtils";
import { Permission } from "../models/Permission";
import { readFileSync } from "fs";
import { ElectronBlocker } from "@ghostery/adblocker-electron";

const WIDGETS_DIR = "../widgets";
const SESSION_PREFIX = "persist:";
const cssPath = join(__dirname, "../styles/widget-styles.css");
const cssContent = readFileSync(cssPath, "utf-8");

export function createView(widget: Widget): WebContentsView {
  return new WebContentsView({
    webPreferences: {
      partition: `${SESSION_PREFIX}${widget.id}`,
      transparent: true, //TODO: make configurable per widget
    },
  });
}

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

export async function addAdblocker(widget: Widget) {
  try {
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    blocker.enableBlockingInSession(session.fromPartition(`${SESSION_PREFIX}${widget.id}`));
  } catch (error) {
    if (error.message && error.message.includes('@ghostery/adblocker/inject-cosmetic-filters')) {
      // Seems to not be an actual issue, ads are still being blocked for each individual widget
    } else {
      console.error('Error initializing adblocker:', error);
    }
  }
}


export function setPermissionHandler(window: BrowserWindow, widget: Widget) {
  const widgetSession = session.fromPartition(`${SESSION_PREFIX}${widget.id}`);
  widgetSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
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
  if (view.webContents.isLoading()) {
    view.webContents.on("did-finish-load", () => {
      view.webContents.insertCSS(cssContent);

      if (widget.touchEnabled) {
        enableTouchEmulation(view);
      }
    });
  } else {
    view.webContents.insertCSS(cssContent);

    if (widget.touchEnabled) {
      enableTouchEmulation(view);
    } else {
      disableTouchEmulation(view);
    }
  }
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

function disableTouchEmulation(view: WebContentsView) {
  if (view.webContents.debugger && view.webContents.debugger.isAttached()) {
    view.webContents.debugger.sendCommand(
      "Emulation.setEmitTouchEventsForMouse",
      {
        enabled: false,
      }
    );
    try {
      view.webContents.debugger.detach();
    } catch (error) {
      console.error("Error detaching debugger:", error);
    }
  }
}

export function forceInCurrentTab(view: WebContentsView, widget: Widget) {
  if (!widget.forceInCurrentTab || !Array.isArray(widget.forceInCurrentTab))
    return;

  const handleWindowOpen = ({ url }: { url: string }) => {
    if (widget.forceInCurrentTab.some((part) => url.includes(part))) {
      view.webContents.loadURL(url);
      return { action: "deny" as "deny" | "allow" };
    }
    return { action: "allow" as "deny" | "allow" };
  };

  const handleWillNavigate = (event: Electron.Event, url: string) => {
    if (widget.forceInCurrentTab.some((part) => url.includes(part))) {
      event.preventDefault();
      view.webContents.loadURL(url);
    }
  };

  view.webContents.setWindowOpenHandler(handleWindowOpen);
  view.webContents.on("will-navigate", handleWillNavigate);

  view.webContents.once("destroyed", () => {
    view.webContents.setWindowOpenHandler(() => ({ action: "allow" }));
    view.webContents.removeListener("will-navigate", handleWillNavigate);
  });
}

export function overwriteUserAgents(widget: Widget) {
  const widgetSession = session.fromPartition(`${SESSION_PREFIX}${widget.id}`);
  widgetSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = new URL(details.url);
    let userAgent = widgetSession.getUserAgent();

    if (Array.isArray(widget.customUserAgent)) {
      const match = widget.customUserAgent.find(({ domain }) =>
        url.hostname.includes(domain)
      );
      if (match) {
        userAgent = match.userAgent;
      }
    }

    details.requestHeaders["User-Agent"] = userAgent;
    callback({ requestHeaders: details.requestHeaders });
  });
}
