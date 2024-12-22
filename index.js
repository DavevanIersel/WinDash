import {
    app,
    BaseWindow,
    WebContentsView,
    session,
    components,
    ipcMain
} from 'electron';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch';
import path from 'path';
import fs from 'fs';
import config from './config.js';

let win;
let originalUserAgent;

const dirname = path.resolve();
const cssFilePath = path.join(dirname, 'styles.css');
const cssContent = fs.readFileSync(cssFilePath, 'utf-8');

// Grid-related calculations
const calculateGridCellSize = (windowWidth, windowHeight) => {
    const gridWidth = windowWidth / config.grid.columns;
    const gridHeight = windowHeight / config.grid.rows;
    return { gridWidth, gridHeight };
};

app.whenReady().then(async () => {
    await components.whenReady();
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    blocker.enableBlockingInSession(session.defaultSession);
    originalUserAgent = session.defaultSession.getUserAgent();

    session.defaultSession.webRequest.onBeforeSendHeaders(
        (details, callback) => {
            const url = new URL(details.url);
            let userAgent;

            if (url.hostname.endsWith('google.com')) {
                userAgent = originalUserAgent;
            } else if (url.hostname.includes('spotify.com')) {
                userAgent =
                    'Mozilla/5.0 (Android 15; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0';
            } else {
                userAgent = originalUserAgent;
            }

            details.requestHeaders['User-Agent'] = userAgent;
            callback({ requestHeaders: details.requestHeaders });
        }
    );

    win = new BaseWindow({
        width: 1600,
        height: 900,
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            autoplayPolicy: 'no-user-gesture-required',
            allowRunningInsecureContent: true,
            experimentalFeatures: true,
            partition: 'persist:session',
            enablePreferredTouchMode: true
        }
    });

    const injectCSS = (webContents) => {
        webContents.insertCSS(cssContent);
    };

    const enableTouchEmulation = (webContents) => {
        webContents.debugger.attach('1.3');
        webContents.debugger.sendCommand(
            'Emulation.setEmitTouchEventsForMouse',
            {
                enabled: true
            }
        );
    };

    const createView = (url, x, y, width, height, touchEnabled = false) => {
        const view = new WebContentsView();
        win.contentView.addChildView(view);
        view.webContents.loadURL(url);

        view.setBounds({ x, y, width, height });

        if (touchEnabled) {
            view.webContents.on('did-finish-load', () => {
                enableTouchEmulation(view.webContents);
            });
        }
        view.webContents.on('did-finish-load', () => {
            injectCSS(view.webContents);
        });
        win.on('closed', () => {
            view.webContents.close();
        });

        return view;
    };

    const { gridWidth, gridHeight } = calculateGridCellSize(
        win.getBounds().width,
        win.getBounds().height
    );

    config.widgets.forEach((widget) => {
        const x = widget.x * gridWidth;
        const y = widget.y * gridHeight;
        const width = widget.width * gridWidth;
        const height = widget.height * gridHeight;

        createView(widget.url, x, y, width, height, widget.touchEnabled);
    });

    win.on('closed', () => {
        win = null;
    });

    ipcMain.on('close-window', () => {
        win.close();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
