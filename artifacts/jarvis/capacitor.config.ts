import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jarvis.assistant',
  appName: 'JARVIS',
  webDir: 'dist/public',

  server: {
    // Allow the WebView to reach your deployed backend for AI/TTS calls.
    // Replace with your actual Replit deployment URL after publishing.
    // During local APK testing you can use your machine's IP, e.g. "http://192.168.1.x:8080"
    url: 'https://your-replit-deployment.replit.app',
    cleartext: true,   // allow HTTP during dev; remove for production
    allowNavigation: ['*.google.com', '*.youtube.com', '*.whatsapp.com', '*.instagram.com'],
  },

  android: {
    // Use the system browser for OAuth / external links
    useLegacyBridge: false,
    // Helps the WebView behave like Chrome for Web APIs
    webContentsDebuggingEnabled: true,
    minWebViewVersion: 80,
  },

  plugins: {
    SpeechRecognition: {
      // Native Android speech engine settings
      language: 'en-US',
      maxResults: 5,
      partialResults: true,
      popup: false,
    },
  },
};

export default config;
