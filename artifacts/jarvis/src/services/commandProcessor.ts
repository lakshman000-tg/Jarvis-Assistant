export type CommandCategory =
  | 'navigation'
  | 'media'
  | 'web'
  | 'info'
  | 'app'
  | 'unknown';

export interface CommandResult {
  response: string;
  category: CommandCategory;
  action: () => void;
  handled: boolean;
}

export interface CommandProcessorCallbacks {
  navigate: (view: string) => void;
  lockApp: () => void;
  logout: () => void;
  showHelp: () => void;
}

/**
 * Opens a URL reliably across all environments:
 * - Capacitor APK → _system opens the device's default browser
 * - Regular browser → programmatic anchor click bypasses popup blockers
 * - Replit iframe preview → also uses anchor click (may still be sandboxed)
 */
function openUrl(url: string): void {
  // Capacitor native Android/iOS — open in system browser
  if ((window as any).Capacitor?.isNativePlatform?.()) {
    (window as any).open(url, '_system', 'location=yes');
    return;
  }
  // Browser: create a real anchor click — bypasses popup blockers
  // that block window.open() called from async/voice callbacks
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 300);
}

export function processCommand(
  rawText: string,
  callbacks: CommandProcessorCallbacks
): CommandResult {
  const text = rawText
    .replace(/^hey\s+jarvis[,.]?\s*/i, '')
    .trim()
    .toLowerCase();

  // --- Navigation ---
  if (text.match(/\bopen\s+home\b/) || text === 'home') {
    return { response: 'Opening home 🏠', category: 'navigation', handled: true, action: () => callbacks.navigate('home') };
  }
  if (text.match(/\bopen\s+profile\b/) || text === 'profile') {
    return { response: 'Opening your profile 👤', category: 'navigation', handled: true, action: () => callbacks.navigate('profile') };
  }
  if (text.match(/\bopen\s+settings?\b/) || text === 'settings') {
    return { response: 'Opening settings ⚙️', category: 'navigation', handled: true, action: () => callbacks.navigate('settings') };
  }
  if (text.match(/\bopen\s+commands?\b/) || text.match(/\bshow\s+commands?\b/) || text === 'commands') {
    return { response: 'Opening command center ⌨️', category: 'navigation', handled: true, action: () => callbacks.navigate('commands') };
  }

  // --- App control ---
  if (text.match(/\block\s+(the\s+)?app\b/) || text.match(/\block\s+jarvis\b/)) {
    return { response: 'Locking the app 🔐', category: 'app', handled: true, action: () => callbacks.lockApp() };
  }
  if (text.match(/\blog\s*(out|off)\b/) || text.match(/\bsign\s*out\b/)) {
    return { response: 'Logging you out. Goodbye! 👋', category: 'app', handled: true, action: () => callbacks.logout() };
  }
  if (text.match(/\bhelp\b/) || text === '?') {
    return { response: 'Opening help 📖', category: 'app', handled: true, action: () => callbacks.showHelp() };
  }

  // --- Web & Apps ---
  if (text.match(/\bopen\s+youtube\b/)) {
    return { response: 'Opening YouTube 🚀', category: 'web', handled: true, action: () => openUrl('https://www.youtube.com') };
  }
  if (text.match(/\bopen\s+whatsapp\b/)) {
    return { response: 'Opening WhatsApp 💬', category: 'web', handled: true, action: () => openUrl('https://web.whatsapp.com') };
  }
  if (text.match(/\bopen\s+gmail\b/)) {
    return { response: 'Opening Gmail 📧', category: 'web', handled: true, action: () => openUrl('https://mail.google.com') };
  }
  if (text.match(/\bopen\s+maps?\b/) || text.match(/\bgoogle\s+maps?\b/)) {
    return { response: 'Opening Google Maps 🗺️', category: 'web', handled: true, action: () => openUrl('https://maps.google.com') };
  }
  if (text.match(/\bopen\s+instagram\b/)) {
    return { response: 'Opening Instagram 📸', category: 'web', handled: true, action: () => openUrl('https://www.instagram.com') };
  }
  if (text.match(/\bopen\s+twitter\b/) || text.match(/\bopen\s+x\b/)) {
    return { response: 'Opening X (Twitter) 🐦', category: 'web', handled: true, action: () => openUrl('https://www.x.com') };
  }
  if (text.match(/\bopen\s+spotify\b/)) {
    return { response: 'Opening Spotify 🎧', category: 'web', handled: true, action: () => openUrl('https://open.spotify.com') };
  }
  if (text.match(/\bopen\s+netflix\b/)) {
    return { response: 'Opening Netflix 🎬', category: 'web', handled: true, action: () => openUrl('https://www.netflix.com') };
  }
  if (text.match(/\bopen\s+google\b/)) {
    return { response: 'Opening Google 🔍', category: 'web', handled: true, action: () => openUrl('https://www.google.com') };
  }

  // --- Google Search ---
  const googleMatch = text.match(/^search\s+(google\s+)?(?:for\s+)?(.+)$/i);
  if (googleMatch) {
    const query = googleMatch[2].trim();
    return { response: `Searching Google for: ${query} 🔍`, category: 'web', handled: true, action: () => openUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`) };
  }
  const searchMatch = text.match(/\bsearch\s+(?:for\s+)?(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    return { response: `Searching for: ${query} 🔍`, category: 'web', handled: true, action: () => openUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`) };
  }

  // --- YouTube search ---
  const ytMatch = text.match(/\b(?:play|search|find)\s+(?:on\s+youtube\s+)?(.+?)\s+(?:on\s+youtube|youtube)$/i)
    || text.match(/\byoutube\s+(?:search\s+)?(.+)$/i);
  if (ytMatch) {
    const query = ytMatch[1].trim();
    return { response: `Searching YouTube for: ${query} 🎬`, category: 'media', handled: true, action: () => openUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`) };
  }

  // --- Media ---
  if (text.match(/\bplay\s+music\b/) || text.match(/\bopen\s+music\b/)) {
    return { response: 'Opening YouTube Music 🎵', category: 'media', handled: true, action: () => openUrl('https://music.youtube.com') };
  }
  if (text.match(/\bplay\s+telugu\s+love\s+songs?\b/)) {
    return { response: 'Playing Telugu love songs 💕🎵', category: 'media', handled: true, action: () => openUrl('https://www.youtube.com/results?search_query=Telugu+love+songs') };
  }
  if (text.match(/\bplay\s+telugu\s+(songs?|music)\b/)) {
    return { response: 'Opening Telugu songs 🎵', category: 'media', handled: true, action: () => openUrl('https://www.youtube.com/results?search_query=Telugu+songs') };
  }
  if (text.match(/\bplay\s+(upbeat|party)\b/) || text.match(/\bparty\s+(songs?|music)\b/)) {
    return { response: 'Time to party! 🎉🎵', category: 'media', handled: true, action: () => openUrl('https://www.youtube.com/results?search_query=upbeat+party+songs') };
  }

  // --- Info ---
  if (text.match(/\bwhat\s+(is\s+)?(the\s+)?time\b/) || text.match(/\btell\s+(me\s+)?the\s+time\b/) || text === 'time') {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { response: `The current time is ${time} ⏰`, category: 'info', handled: true, action: () => {} };
  }
  if (text.match(/\bwhat\s+(is\s+)?today\b/) || text.match(/\bwhat('s|s)?\s+(the\s+)?date\b/) || text === 'date') {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return { response: `Today is ${date} 📅`, category: 'info', handled: true, action: () => {} };
  }
  if (text.match(/\bhello\b/) || text.match(/\bhi\b/) || text.match(/\bhey\b/)) {
    return { response: 'Hello! How can I help you today? 👋', category: 'info', handled: true, action: () => {} };
  }

  // --- Unknown (pass to AI) ---
  return { response: '', category: 'unknown', handled: false, action: () => {} };
}

export const COMMAND_HELP_LIST = [
  {
    group: 'Navigation',
    commands: [
      { cmd: 'Hey JARVIS, open home', desc: 'Go to home / chat' },
      { cmd: 'Hey JARVIS, open profile', desc: 'View profile page' },
      { cmd: 'Hey JARVIS, open settings', desc: 'Open settings' },
      { cmd: 'Hey JARVIS, open commands', desc: 'This command list' },
    ],
  },
  {
    group: 'App Control',
    commands: [
      { cmd: 'Hey JARVIS, lock app', desc: 'Lock the app with PIN' },
      { cmd: 'Hey JARVIS, logout', desc: 'Sign out of JARVIS' },
      { cmd: 'Hey JARVIS, help', desc: 'Show this help screen' },
    ],
  },
  {
    group: 'Web & Apps',
    commands: [
      { cmd: 'Hey JARVIS, open YouTube', desc: 'Open YouTube' },
      { cmd: 'Hey JARVIS, open WhatsApp', desc: 'Open WhatsApp Web' },
      { cmd: 'Hey JARVIS, open Gmail', desc: 'Open Gmail' },
      { cmd: 'Hey JARVIS, open maps', desc: 'Open Google Maps' },
      { cmd: 'Hey JARVIS, search Google for cats', desc: 'Google search' },
      { cmd: 'Hey JARVIS, search for space videos', desc: 'Google search shorthand' },
    ],
  },
  {
    group: 'Media',
    commands: [
      { cmd: 'Hey JARVIS, play music', desc: 'Open YouTube Music' },
      { cmd: 'Hey JARVIS, play Telugu songs', desc: 'Telugu songs on YouTube' },
      { cmd: 'Hey JARVIS, play Telugu love songs', desc: 'Telugu love songs' },
      { cmd: 'Hey JARVIS, play party songs', desc: 'Upbeat party mix' },
    ],
  },
  {
    group: 'Information',
    commands: [
      { cmd: 'Hey JARVIS, what time is it', desc: 'Current time' },
      { cmd: 'Hey JARVIS, what is today\'s date', desc: "Today's date" },
      { cmd: 'Anything else...', desc: 'JARVIS AI answers via GPT' },
    ],
  },
];
