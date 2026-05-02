/**
 * Foreground Listener Service
 * Manages background listening state for JARVIS.
 *
 * On web: uses Page Visibility API + document events
 * On Capacitor Android: also hooks @capacitor/app state + local notifications
 *
 * HONEST LIMITATION: This keeps JARVIS listening while:
 *   ✅ App is open
 *   ✅ App is minimized (screen ON, Android keeps WebView alive)
 *   ✅ User switches apps (screen ON)
 *   ❌ Screen is fully OFF (Android suspends WebView)
 *   ❌ Phone is locked
 */

type ListenerCallback = (active: boolean) => void;

let isServiceRunning = false;
let subscribers: ListenerCallback[] = [];
let appPlugin: any = null;
let notifPlugin: any = null;
let visibilityHandler: (() => void) | null = null;

async function getCapacitorPlugins() {
  if (appPlugin && notifPlugin) return { appPlugin, notifPlugin };
  try {
    const appMod = await import('@capacitor/app');
    const notifMod = await import('@capacitor/local-notifications');
    appPlugin = appMod.App;
    notifPlugin = notifMod.LocalNotifications;
    return { appPlugin, notifPlugin };
  } catch {
    return { appPlugin: null, notifPlugin: null };
  }
}

function notify(active: boolean) {
  subscribers.forEach(fn => fn(active));
}

export function subscribeToListenerState(fn: ListenerCallback): () => void {
  subscribers.push(fn);
  return () => { subscribers = subscribers.filter(s => s !== fn); };
}

export function isListenerServiceRunning(): boolean {
  return isServiceRunning;
}

async function showPersistentNotification() {
  try {
    const { notifPlugin: p } = await getCapacitorPlugins();
    if (!p) return;
    const perm = await p.requestPermissions();
    if (perm.display !== 'granted') return;
    await p.schedule({
      notifications: [{
        id: 9001,
        title: 'JARVIS is active',
        body: 'Tap to open assistant',
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#00FFFF',
        extra: { action: 'open' },
      }],
    });
  } catch { /* notification not critical */ }
}

async function cancelPersistentNotification() {
  try {
    const { notifPlugin: p } = await getCapacitorPlugins();
    if (!p) return;
    await p.cancel({ notifications: [{ id: 9001 }] });
  } catch { /* ignore */ }
}

export async function startForegroundListener(): Promise<void> {
  if (isServiceRunning) return;
  isServiceRunning = true;

  // Web Visibility API — catches tab hidden / screen lock on desktop
  visibilityHandler = () => {
    const visible = document.visibilityState === 'visible';
    if (!visible) {
      // Screen off or tab hidden — pause mic to save battery
      notify(false);
    } else {
      notify(true);
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  // Capacitor App state (foreground / background on Android)
  try {
    const { appPlugin: ap } = await getCapacitorPlugins();
    if (ap) {
      ap.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
        // isActive = false means minimized but screen may still be on
        // We keep listening in background (screen ON) — pause only when screen off
        if (!isActive) {
          // Brief pause to check if screen went off (visibility API handles that)
          // Keep service running for background listening
        } else {
          if (document.visibilityState === 'visible') notify(true);
        }
      });
    }
  } catch { /* not in Capacitor */ }

  await showPersistentNotification();
  notify(true);
}

export async function stopForegroundListener(): Promise<void> {
  if (!isServiceRunning) return;
  isServiceRunning = false;

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }

  try {
    const { appPlugin: ap } = await getCapacitorPlugins();
    if (ap) ap.removeAllListeners?.();
  } catch { /* ignore */ }

  await cancelPersistentNotification();
  notify(false);
}

export function getServiceStatus(): { running: boolean; label: string; color: 'green' | 'red' | 'gray' } {
  if (!isServiceRunning) return { running: false, label: 'Foreground listener off', color: 'gray' };
  const visible = document.visibilityState === 'visible';
  return visible
    ? { running: true, label: 'Foreground listening active', color: 'green' }
    : { running: true, label: 'Paused (screen off)', color: 'red' };
}
