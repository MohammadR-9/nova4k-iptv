const { app, BrowserWindow, session, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable GPU hardware acceleration & ultra-smooth video rendering
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-http-cache');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 850,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#07090e',
    title: 'NOVA 4K ULTRA - Desktop Cinema TV (Windows Edition)',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Disables CORS restrictions for direct 100% full-speed IPTV streaming
    }
  });

  // Set universal SmartTV User-Agent so IPTV providers accept all streams and API calls
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (SmartHub; SMART-TV; U; Linux/Tizen 6.0; SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0.3809.146 TV Safari/537.36';
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Ensure full CORS headers for all incoming streams
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
    responseHeaders['Access-Control-Allow-Methods'] = ['GET, HEAD, OPTIONS, POST'];
    responseHeaders['Access-Control-Allow-Headers'] = ['*'];
    responseHeaders['Access-Control-Expose-Headers'] = ['Content-Length, Content-Range, Accept-Ranges'];
    callback({ responseHeaders });
  });

  // Dynamically resolve dist/index.html path
  let distIndex = path.join(__dirname, '../dist/index.html');
  if (!fs.existsSync(distIndex)) {
    distIndex = path.join(__dirname, 'dist/index.html');
  }

  if (fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    mainWindow.loadURL('http://localhost:5173/');
  }

  mainWindow.maximize();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
