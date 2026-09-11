import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nova.iptvpro',
  appName: 'NOVA 4K ULTRA',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // On a physical device or MuMuPlayer emulator, use the dev server URL for live reload during development.
    // Comment out the url below for production APK builds.
    // url: 'http://192.168.1.217:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#07090e',
    loggingBehavior: 'none',
    // Full-screen immersive mode for TV-style experience
    initialFocus: true,
  },
  plugins: {
    // No native plugins needed for IPTV WebView app
  }
};

export default config;
