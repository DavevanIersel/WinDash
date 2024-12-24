import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  components,
  WebContentsView,
  screen,
  Tray,
  Menu
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
const PADDING = 50;
let tray: Tray | null = null;

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
  const displays = screen.getAllDisplays();
  const secondDisplay = displays[2];
  const { x, y } = secondDisplay.bounds;

  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    x,
    y,
    icon: "./src/assets/WinDash-logo.png",
    transparent: true,
    skipTaskbar: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      preload: path.join(dirname, "preload.js"),
      autoplayPolicy: "no-user-gesture-required",
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      partition: "persist:session",
    },
  });
  win.maximize();
  tray = new Tray(path.join(dirname, "src/assets/WinDash-logo.png"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        win?.show();
      },
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip("My Electron App");
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

  const createView = (
    x: number,
    y: number,
    width: number,
    height: number,
    widget: Widget
  ) => {
    const view = new WebContentsView();
    win.contentView.addChildView(view);
    view.webContents.loadURL(widget.url);

    view.setBounds({ x, y, width, height });
    widgetWebContentsMap.set(view.webContents.id, widget);
    if (widget.touchEnabled) {
      view.webContents.on("did-finish-load", () => {
        enableTouchEmulation(view.webContents);
      });
    }
    if (widget.devTools) {
      view.webContents.toggleDevTools();
    }
    view.webContents.on("did-finish-load", () => {
      injectCSS(view.webContents);
    });
    win.on("closed", () => {
      view.webContents.close();
    });

    if (widget.customScript) {
      view.webContents.executeJavaScript(widget.customScript);
    }

    views.push(view);
  };

  const { gridWidth, gridHeight } = calculateGridCellSize(
    win.getBounds().width - 2 * PADDING, // Subtract padding from total width
    win.getBounds().height - 2 * PADDING, // Subtract padding from total height
    config
  );
  
  config.widgets.forEach((widget) => {
    const x = widget.x * gridWidth + PADDING; // Add padding to x position
    const y = widget.y * gridHeight + PADDING; // Add padding to y position
    const width = widget.width * gridWidth; // Width remains based on grid
    const height = widget.height * gridHeight; // Height remains based on grid
  
    createView(x, y, width, height, widget);
  });
  // setInterval(() => {
  //   views.forEach((view) => {
  //     const bounds = view.getBounds(); // Get the current bounds
  //     view.setBounds({
  //       x: bounds.x + 10, // Increment x by 10 pixels
  //       y: bounds.y,
  //       width: bounds.width,
  //       height: bounds.height,
  //     });
  //   });
  // }, 1000);
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
