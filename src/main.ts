import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  components,
  WebContentsView,
} from "electron";
import { ElectronBlocker } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";
import * as path from "path";
import config from "./config.js";
import { calculateGridCellSize } from "./grid";
import { Widget } from "./models/Widget.js";

let win: BrowserWindow | null = null;
const views: any[] = [];
const widgetWebContentsMap = new Map<number, Widget>();

const dirname = path.resolve();
const cssContent = `
  ::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
`;

app.whenReady().then(async () => {
  await components.whenReady();
  const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
  blocker.enableBlockingInSession(session.defaultSession);

  win = new BrowserWindow({
    width: 1600,
    height: 900,
    transparent: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(dirname, "preload.js"),
      autoplayPolicy: "no-user-gesture-required",
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      partition: "persist:session",
    },
  });

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

    // Enable touch emulation
    webContents.debugger.sendCommand("Emulation.setEmitTouchEventsForMouse", {
      enabled: true,
    });
  };

  const createView = (
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    touchEnabled = false,
    widget: Widget
  ) => {
    const view = new WebContentsView();
    win.contentView.addChildView(view);
    view.webContents.loadURL(url);

    view.setBounds({ x, y, width, height });
    widgetWebContentsMap.set(view.webContents.id, widget);
    if (touchEnabled) {
      view.webContents.on("did-finish-load", () => {
        enableTouchEmulation(view.webContents);
      });
    }
    view.webContents.on("did-finish-load", () => {
      injectCSS(view.webContents);
    });
    win.on("closed", () => {
      view.webContents.close();
    });

    views.push(view);
  };

  const { gridWidth, gridHeight } = calculateGridCellSize(
    win.getBounds().width,
    win.getBounds().height,
    config
  );

  config.widgets.forEach((widget) => {
    const x = widget.x * gridWidth;
    const y = widget.y * gridHeight;
    const width = widget.width * gridWidth;
    const height = widget.height * gridHeight;

    createView(widget.url, x, y, width, height, widget.touchEnabled, widget);
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = new URL(details.url);
    const originalUserAgent = session.defaultSession.getUserAgent();
    let userAgent = originalUserAgent;

    const widget = widgetWebContentsMap.get(details.webContentsId);

    if (widget && widget.customUserAgent) {
      for (const [domain, customAgent] of Object.entries(widget.customUserAgent)) {
        if (url.hostname.includes(domain)) {
          userAgent = customAgent;
          break;
        }
      }
    }

    details.requestHeaders["User-Agent"] = userAgent;
    callback({ requestHeaders: details.requestHeaders });
  });

  win.on("closed", () => {
    win = null;
  });

  ipcMain.on("close-window", () => {
    win?.close();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
