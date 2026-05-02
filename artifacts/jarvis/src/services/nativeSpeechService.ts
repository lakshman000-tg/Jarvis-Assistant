/**
 * Native speech recognition service for Capacitor APK.
 * Falls back gracefully when running in a browser.
 *
 * Uses @capacitor-community/speech-recognition which calls
 * Android's native SpeechRecognizer — far more reliable than
 * webkitSpeechRecognition inside a WebView.
 */

export function isCapacitorNative(): boolean {
  return !!(
    (window as any).Capacitor?.isNativePlatform?.() ||
    (window as any).Capacitor?.platform === 'android' ||
    (window as any).Capacitor?.platform === 'ios'
  );
}

export type NativeSpeechEvent = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
};

let pluginRef: any = null;
let listenerHandles: any[] = [];

async function getPlugin() {
  if (pluginRef) return pluginRef;
  try {
    const mod = await import('@capacitor-community/speech-recognition');
    pluginRef = mod.SpeechRecognition;
    return pluginRef;
  } catch {
    return null;
  }
}

export async function requestNativeMicPermission(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const result = await plugin.requestPermissions();
    return result.speechRecognition === 'granted' || result.microphone === 'granted';
  } catch {
    return false;
  }
}

export async function checkNativeMicPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  const plugin = await getPlugin();
  if (!plugin) return 'denied';
  try {
    const result = await plugin.checkPermissions();
    return result.speechRecognition === 'granted' ? 'granted'
      : result.speechRecognition === 'denied' ? 'denied'
      : 'prompt';
  } catch {
    return 'denied';
  }
}

export async function startNativeListening(events: NativeSpeechEvent): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) { events.onError('Native speech plugin unavailable'); return; }

  // Remove any previous listeners
  await stopNativeListening();

  try {
    const h1 = await plugin.addListener('partialResults', (data: any) => {
      const text: string = data?.matches?.[0] ?? '';
      if (text) events.onPartial(text);
    });

    const h2 = await plugin.addListener('listeningState', (data: any) => {
      if (data?.status === 'stopped') {
        events.onEnd();
      }
    });

    listenerHandles = [h1, h2];

    await plugin.start({
      language: 'en-US',
      maxResults: 5,
      partialResults: true,
      popup: false,
    });

    // The result comes via the listener; also try the promise-based result
    plugin.start({
      language: 'en-US',
      maxResults: 5,
      partialResults: true,
      popup: false,
    }).then((result: any) => {
      const matches: string[] = result?.matches ?? [];
      if (matches.length > 0) events.onFinal(matches[0]);
    }).catch(() => {/* handled by listeners */});

  } catch (err: any) {
    events.onError(String(err?.message ?? err));
  }
}

export async function stopNativeListening(): Promise<void> {
  const plugin = await getPlugin();
  for (const h of listenerHandles) {
    try { h.remove?.(); } catch { /* ignore */ }
  }
  listenerHandles = [];
  try { await plugin?.stop(); } catch { /* ignore */ }
}
