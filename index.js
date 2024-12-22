const { app, BaseWindow, WebContentsView, session, components, ipcMain } = require('electron');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

let win;
let originalUserAgent;

app.whenReady().then(async () => {
    await components.whenReady();
    // const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    // blocker.enableBlockingInSession(session.defaultSession);
    originalUserAgent = session.defaultSession.getUserAgent();

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const url = new URL(details.url);
        let userAgent;

        if (url.hostname.endsWith("google.com")) {
            // Google will not allow logins from the chrome 131 userAgent
            userAgent = originalUserAgent;
        } else if (url.hostname.includes("spotify.com")) {
            // Spotify will only play music on a different userAgent then the default electron agent
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
        }
    });

    const padding = 20;
    const viewWidth = (win.getBounds().width / 2) - padding - padding;
    const viewHeight = (win.getBounds().height / 2) - padding - padding;

    const view1 = new WebContentsView();
    win.contentView.addChildView(view1);
    view1.webContents.loadURL('https://www.audible.co.uk/webplayer?asin=B0BS735TN2');
    view1.setBounds({ x: padding, y: padding, width: viewWidth, height: viewHeight });

    const view2 = new WebContentsView();
    win.contentView.addChildView(view2);
    view2.webContents.loadURL('https://open.spotify.com');
    view2.setBounds({ x: padding, y: viewHeight + padding * 2, width: viewWidth, height: viewHeight });
    // view2.webContents.openDevTools();

    const view3 = new WebContentsView();
    win.contentView.addChildView(view3);
    view3.webContents.loadURL('https://www.youtube.com');
    view3.setBounds({ x: viewWidth + padding * 2, y: padding, width: viewWidth, height: viewHeight });

    const view4 = new WebContentsView();
    win.contentView.addChildView(view4);
    view4.webContents.loadURL('https://www.google.com/');
    view4.setBounds({ x: viewWidth + padding * 2, y: viewHeight + padding * 2, width: viewWidth, height: viewHeight });

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