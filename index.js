const { app, BaseWindow, WebContentsView, session, components, ipcMain } = require('electron');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');
const path = require('path');
const fs = require('fs');

let win;
let originalUserAgent;

const cssFilePath = path.join(__dirname, 'styles.css');
const cssContent = fs.readFileSync(cssFilePath, 'utf-8');

app.whenReady().then(async () => {
    await components.whenReady();
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    blocker.enableBlockingInSession(session.defaultSession);
    originalUserAgent = session.defaultSession.getUserAgent();

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const url = new URL(details.url);
        let userAgent;

        if (url.hostname.endsWith("google.com")) {
            userAgent = originalUserAgent;
        } else if (url.hostname.includes("spotify.com")) {
            userAgent = "Mozilla/5.0 (Android 15; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0";
        } else {
            userAgent = originalUserAgent;
        }

        details.requestHeaders['User-Agent'] = userAgent;
        callback({ requestHeaders: details.requestHeaders });
    });

    win = new BaseWindow({
        width: 1600,
        height: 900,
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: __dirname + '/preload.js',
            webSecurity: false, 
            autoplayPolicy: 'no-user-gesture-required',
            allowRunningInsecureContent: true,
            experimentalFeatures: true, 
            partition: 'persist:session', 
            enablePreferredTouchMode: true,
        }
    });

    const padding = 20;
    const viewWidth = (win.getBounds().width / 2) - padding - padding;
    const viewHeight = (win.getBounds().height / 2) - padding - padding;

    const injectCSS = (webContents) => {
        const cssPath = path.join(__dirname, 'styles.css');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        webContents.insertCSS(cssContent)
            .then(() => {
                console.log('CSS injected successfully.');
            })
            .catch((err) => {
                console.error('Error injecting CSS:', err);
            });
    };

    const enableTouchEmulation = (webContents) => {
        webContents.debugger.attach('1.3'); 
        webContents.debugger.sendCommand('Emulation.setEmitTouchEventsForMouse', { 
            enabled: true, 
        });
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

        return view;
    };

    createView('https://www.google.com/', padding, padding, viewWidth, viewHeight);
    createView('https://open.spotify.com', padding, viewHeight + padding * 2, viewWidth, viewHeight, true);
    createView('https://www.buienradar.nl/', viewWidth + padding * 2, padding, viewWidth - 200, win.getBounds().height - padding * 3);

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
