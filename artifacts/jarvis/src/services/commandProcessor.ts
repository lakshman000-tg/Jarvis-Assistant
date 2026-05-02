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
  playMedia: (embedUrl: string, title: string) => void;
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
  // "open youtube and play X" / "open youtube play X" — embedded player wins
  const openYtPlay =
    text.match(/\bopen\s+youtube\s+and\s+play\s+(.+)$/i) ||
    text.match(/\bopen\s+youtube\s+play\s+(.+)$/i) ||
    text.match(/\byoutube\s+and\s+play\s+(.+)$/i);
  if (openYtPlay) {
    const query = openYtPlay[1].trim();
    const embedUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
    return { response: `Playing "${query}" on YouTube 🎬`, category: 'media', handled: true, action: () => callbacks.playMedia(embedUrl, query) };
  }
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

  // --- Play [anything] on YouTube — embedded player inside JARVIS ---
  const ytPlayMatch =
    text.match(/^play\s+(.+?)\s+on\s+youtube$/i) ||
    text.match(/^play\s+(.+?)\s+youtube$/i) ||
    text.match(/^youtube\s+play\s+(.+)$/i);
  if (ytPlayMatch) {
    const query = ytPlayMatch[1].trim();
    const embedUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1&mute=0`;
    return { response: `Playing "${query}" on YouTube 🎬`, category: 'media', handled: true, action: () => callbacks.playMedia(embedUrl, query) };
  }

  // --- YouTube search (no "play … on youtube") ---
  const ytSearchMatch =
    text.match(/\bsearch\s+youtube\s+(?:for\s+)?(.+)$/i) ||
    text.match(/\byoutube\s+search\s+(?:for\s+)?(.+)$/i);
  if (ytSearchMatch) {
    const query = ytSearchMatch[1].trim();
    const embedUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
    return { response: `Searching YouTube for: ${query} 🔍`, category: 'media', handled: true, action: () => callbacks.playMedia(embedUrl, query) };
  }

  // --- Media shortcuts ---
  if (text.match(/\bplay\s+music\b/) || text.match(/\bopen\s+music\b/)) {
    const embedUrl = `https://www.youtube.com/embed?listType=search&list=top+hits+2024&autoplay=1`;
    return { response: 'Playing music 🎵', category: 'media', handled: true, action: () => callbacks.playMedia(embedUrl, 'Top Music') };
  }
  if (text.match(/\bplay\s+telugu\s+love\s+songs?\b/)) {
    const embedUrl = `https://www.youtube.com/embed?listType=search&list=Telugu+love+songs&autoplay=1`;
    return { response: 'Playing Telugu love songs 💕🎵', category: 'media', handled: true, action: () => callbacks.playMedia(embedUrl, 'Telugu Love Songs') };
  }
  if (text.match(/\bplay\s+telugu\s+(songs?|music)\b/)) {
    const embedUrl = `https://www.youtube.com/embed?listType=search&list=Telugu+songs&autoplay=1`;
    return { response: 'Playing Telugu songs 🎵', category: 'media', handled: true, action: () => callbacks.playMedia(embedUrl, 'Telugu Songs') };
  }
  if (text.match(/\bplay\s+(upbeat|party)\b/) || text.match(/\bparty\s+(songs?|music)\b/)) {
    const embedUrl = `https://www.youtube.com/embed?listType=search&list=upbeat+party+songs&autoplay=1`;
    return { response: 'Time to party! 🎉🎵', category: 'media', handled: true, action: () => callbacks.playMedia(embedUrl, 'Party Songs') };
  }
  // Generic "play [song name]" with no platform specified → YouTube embed
  const playMatch = text.match(/^play\s+(.+)$/i);
  if (playMatch) {
    const query = playMatch[1].trim();
    const embedUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
    return { response: `Playing "${query}" 🎵`, category: 'media', handled: true, action: () => callbacks.playMedia(embedUrl, query) };
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
