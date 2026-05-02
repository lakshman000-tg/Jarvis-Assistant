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
    return { response: 'Opening YouTube 🚀', category: 'web', handled: true, action: () => window.open('https://www.youtube.com', '_blank') };
  }
  if (text.match(/\bopen\s+whatsapp\b/)) {
    return { response: 'Opening WhatsApp 💬', category: 'web', handled: true, action: () => window.open('https://web.whatsapp.com', '_blank') };
  }
  if (text.match(/\bopen\s+gmail\b/)) {
    return { response: 'Opening Gmail 📧', category: 'web', handled: true, action: () => window.open('https://mail.google.com', '_blank') };
  }
  if (text.match(/\bopen\s+maps?\b/) || text.match(/\bgoogle\s+maps?\b/)) {
    return { response: 'Opening Google Maps 🗺️', category: 'web', handled: true, action: () => window.open('https://maps.google.com', '_blank') };
  }
  if (text.match(/\bopen\s+instagram\b/)) {
    return { response: 'Opening Instagram 📸', category: 'web', handled: true, action: () => window.open('https://www.instagram.com', '_blank') };
  }
  if (text.match(/\bopen\s+twitter\b/) || text.match(/\bopen\s+x\b/)) {
    return { response: 'Opening X (Twitter) 🐦', category: 'web', handled: true, action: () => window.open('https://www.x.com', '_blank') };
  }

  // --- Google Search ---
  const googleMatch = text.match(/^search\s+(google\s+)?(?:for\s+)?(.+)$/i);
  if (googleMatch) {
    const query = googleMatch[2].trim();
    return { response: `Searching Google for: ${query} 🔍`, category: 'web', handled: true, action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank') };
  }
  const searchMatch = text.match(/\bsearch\s+(?:for\s+)?(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    return { response: `Searching for: ${query} 🔍`, category: 'web', handled: true, action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank') };
  }

  // --- Media ---
  if (text.match(/\bplay\s+music\b/) || text.match(/\bopen\s+music\b/)) {
    return { response: 'Opening YouTube Music 🎵', category: 'media', handled: true, action: () => window.open('https://music.youtube.com', '_blank') };
  }
  if (text.match(/\bplay\s+telugu\s+love\s+songs?\b/)) {
    return { response: 'Playing Telugu love songs 💕🎵', category: 'media', handled: true, action: () => window.open('https://www.youtube.com/results?search_query=Telugu+love+songs', '_blank') };
  }
  if (text.match(/\bplay\s+telugu\s+(songs?|music)\b/)) {
    return { response: 'Opening Telugu songs 🎵', category: 'media', handled: true, action: () => window.open('https://www.youtube.com/results?search_query=Telugu+songs', '_blank') };
  }
  if (text.match(/\bplay\s+(upbeat|party)\b/) || text.match(/\bparty\s+(songs?|music)\b/)) {
    return { response: 'Time to party! 🎉🎵', category: 'media', handled: true, action: () => window.open('https://www.youtube.com/results?search_query=upbeat+party+songs', '_blank') };
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
