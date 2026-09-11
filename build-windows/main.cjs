const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  const distIndex = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(distIndex).catch(() => {
    // If dist not yet built, connect to local dev server
    mainWindow.loadURL('http://localhost:5173/');
  });

  mainWindow.maximize();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
