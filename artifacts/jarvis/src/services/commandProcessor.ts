export type CommandCategory =
  | 'navigation'
  | 'media'
  | 'web'
  | 'system'
  | 'info'
  | 'app'
  | 'unknown';

export interface CommandResult {
  response: string;
  category: CommandCategory;
  action: () => void;
  handled: boolean;
}

export type NavigateCallback = (view: string) => void;
export type ToggleTheftCallback = (enabled: boolean) => void;
export type FakeShutdownCallback = () => void;
export type EmergencyAlertCallback = () => void;
export type LockAppCallback = () => void;
export type LogoutCallback = () => void;
export type UpdateLocationCallback = () => void;
export type ShowHelpCallback = () => void;

export interface CommandProcessorCallbacks {
  navigate: NavigateCallback;
  toggleTheft: ToggleTheftCallback;
  fakeShutdown: FakeShutdownCallback;
  emergencyAlert: EmergencyAlertCallback;
  lockApp: LockAppCallback;
  logout: LogoutCallback;
  updateLocation: UpdateLocationCallback;
  showHelp: ShowHelpCallback;
  isTheftEnabled: boolean;
}

export function processCommand(
  rawText: string,
  callbacks: CommandProcessorCallbacks
): CommandResult {
  // Strip wake word prefix
  const text = rawText
    .replace(/^hey\s+jarvis[,.]?\s*/i, '')
    .trim()
    .toLowerCase();

  // Navigation commands
  if (text.match(/\bopen\s+home\b/) || text === 'home') {
    return {
      response: 'Opening home dashboard 🏠',
      category: 'navigation',
      handled: true,
      action: () => callbacks.navigate('home'),
    };
  }

  if (text.match(/\bopen\s+profile\b/) || text === 'profile') {
    return {
      response: 'Opening your profile 👤',
      category: 'navigation',
      handled: true,
      action: () => callbacks.navigate('profile'),
    };
  }

  if (text.match(/\bopen\s+theft\b/) || text.match(/\btheft\s+protection\b/)) {
    return {
      response: 'Opening theft protection panel 🔒',
      category: 'navigation',
      handled: true,
      action: () => callbacks.navigate('theft'),
    };
  }

  if (text.match(/\b(show|open)\s+(my\s+)?devices?\b/)) {
    return {
      response: 'Showing active devices 📱',
      category: 'navigation',
      handled: true,
      action: () => callbacks.navigate('devices'),
    };
  }

  if (text.match(/\bopen\s+commands?\b/) || text.match(/\bshow\s+commands?\b/)) {
    return {
      response: 'Opening command center ⌨️',
      category: 'navigation',
      handled: true,
      action: () => callbacks.navigate('commands'),
    };
  }

  // App-level commands
  if (text.match(/\bupdate\s+(my\s+)?location\b/) || text.match(/\bget\s+location\b/)) {
    return {
      response: 'Updating your GPS location 📍',
      category: 'app',
      handled: true,
      action: () => callbacks.updateLocation(),
    };
  }

  if (text.match(/\benable\s+theft\b/) || text.match(/\bturn\s+on\s+theft\b/)) {
    return {
      response: 'Theft protection mode ENABLED 🔴',
      category: 'app',
      handled: true,
      action: () => callbacks.toggleTheft(true),
    };
  }

  if (text.match(/\bdisable\s+theft\b/) || text.match(/\bturn\s+off\s+theft\b/)) {
    return {
      response: 'Theft protection mode DISABLED 🟢',
      category: 'app',
      handled: true,
      action: () => callbacks.toggleTheft(false),
    };
  }

  if (text.match(/\btoggle\s+theft\b/)) {
    const next = !callbacks.isTheftEnabled;
    return {
      response: next ? 'Theft protection ENABLED 🔴' : 'Theft protection DISABLED 🟢',
      category: 'app',
      handled: true,
      action: () => callbacks.toggleTheft(next),
    };
  }

  if (text.match(/\bfake\s+shutdown\b/) || text.match(/\bshutdown\b/)) {
    return {
      response: 'Initiating fake shutdown sequence 🌑',
      category: 'app',
      handled: true,
      action: () => callbacks.fakeShutdown(),
    };
  }

  if (text.match(/\bemergency\s+alert\b/) || text.match(/\bsos\b/) || text.match(/\bsend\s+alert\b/)) {
    return {
      response: 'EMERGENCY ALERT TRIGGERED 🚨',
      category: 'app',
      handled: true,
      action: () => callbacks.emergencyAlert(),
    };
  }

  if (text.match(/\block\s+(the\s+)?app\b/) || text.match(/\block\s+jarvis\b/)) {
    return {
      response: 'Locking the app 🔐',
      category: 'app',
      handled: true,
      action: () => callbacks.lockApp(),
    };
  }

  if (text.match(/\blog\s*(out|off)\b/) || text.match(/\bsign\s*out\b/)) {
    return {
      response: 'Logging you out. Goodbye 👋',
      category: 'app',
      handled: true,
      action: () => callbacks.logout(),
    };
  }

  if (text.match(/\bhelp\b/) || text === '?') {
    return {
      response: 'Opening command help 📖',
      category: 'app',
      handled: true,
      action: () => callbacks.showHelp(),
    };
  }

  // Media commands
  if (text.match(/\bplay\s+telugu\s+love\s+songs?\b/)) {
    return {
      response: 'Playing Telugu love songs 💕🎵',
      category: 'media',
      handled: true,
      action: () => window.open('https://www.youtube.com/results?search_query=Telugu+love+songs', '_blank'),
    };
  }

  if (text.match(/\bplay\s+telugu\s+(latest\s+hits?|latest|hits?)\b/)) {
    return {
      response: 'Playing Telugu latest hits 🎶',
      category: 'media',
      handled: true,
      action: () => window.open('https://www.youtube.com/results?search_query=Telugu+latest+hits', '_blank'),
    };
  }

  if (text.match(/\bplay\s+telugu\s+songs?\b/)) {
    return {
      response: 'Opening Telugu songs 🎵',
      category: 'media',
      handled: true,
      action: () => window.open('https://www.youtube.com/results?search_query=Telugu+songs', '_blank'),
    };
  }

  if (text.match(/\bplay\s+(upbeat|party)\s+songs?\b/) || text.match(/\bparty\s+(songs?|music)\b/)) {
    return {
      response: 'Time to party! 🎉🎵',
      category: 'media',
      handled: true,
      action: () => window.open('https://www.youtube.com/results?search_query=upbeat+party+songs', '_blank'),
    };
  }

  if (text.match(/\bplay\s+music\b/) || text.match(/\bopen\s+music\b/)) {
    return {
      response: 'Playing music 🎵',
      category: 'media',
      handled: true,
      action: () => window.open('https://music.youtube.com', '_blank'),
    };
  }

  // Web / URL commands
  if (text.match(/\bopen\s+youtube\b/)) {
    return {
      response: 'Opening YouTube 🚀',
      category: 'web',
      handled: true,
      action: () => window.open('https://www.youtube.com', '_blank'),
    };
  }

  if (text.match(/\bopen\s+gmail\b/)) {
    return {
      response: 'Opening Gmail 📧',
      category: 'web',
      handled: true,
      action: () => window.open('https://mail.google.com', '_blank'),
    };
  }

  if (text.match(/\bopen\s+maps?\b/) || text.match(/\bgoogle\s+maps?\b/)) {
    return {
      response: 'Opening Google Maps 🗺️',
      category: 'web',
      handled: true,
      action: () => window.open('https://maps.google.com', '_blank'),
    };
  }

  const googleMatch = text.match(/^search\s+(google\s+)?(?:for\s+)?(.+)$/i);
  if (googleMatch) {
    const query = googleMatch[2].trim();
    return {
      response: `Searching Google for: ${query} 🔍`,
      category: 'web',
      handled: true,
      action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank'),
    };
  }

  // Info commands
  if (text.match(/\b(tell|what('s|s)?)\s+(the\s+)?(time|current time)\b/) || text === 'time') {
    const time = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      response: `It is ${time} on ${date} ⏰`,
      category: 'info',
      handled: true,
      action: () => {},
    };
  }

  if (text.match(/\bwhat('s|s)?\s+(the\s+)?date\b/) || text === 'date') {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      response: `Today is ${date} 📅`,
      category: 'info',
      handled: true,
      action: () => {},
    };
  }

  // Not a built-in command
  return {
    response: '',
    category: 'unknown',
    handled: false,
    action: () => {},
  };
}

export const COMMAND_HELP_LIST = [
  { group: 'Navigation', commands: [
    { cmd: 'Hey JARVIS, open home', desc: 'Go to home dashboard' },
    { cmd: 'Hey JARVIS, open profile', desc: 'View your profile' },
    { cmd: 'Hey JARVIS, open theft protection', desc: 'Theft protection panel' },
    { cmd: 'Hey JARVIS, show my devices', desc: 'Show active devices' },
    { cmd: 'Hey JARVIS, open commands', desc: 'This command list' },
  ]},
  { group: 'App Control', commands: [
    { cmd: 'Hey JARVIS, update location', desc: 'Update your GPS location' },
    { cmd: 'Hey JARVIS, enable theft mode', desc: 'Turn on theft protection' },
    { cmd: 'Hey JARVIS, disable theft mode', desc: 'Turn off theft protection' },
    { cmd: 'Hey JARVIS, fake shutdown', desc: 'Fake device shutdown screen' },
    { cmd: 'Hey JARVIS, send emergency alert', desc: 'Trigger emergency SOS' },
    { cmd: 'Hey JARVIS, lock app', desc: 'Lock the app' },
    { cmd: 'Hey JARVIS, logout', desc: 'Sign out of JARVIS' },
    { cmd: 'Hey JARVIS, help', desc: 'Show this help screen' },
  ]},
  { group: 'Media', commands: [
    { cmd: 'Hey JARVIS, play music', desc: 'Open YouTube Music' },
    { cmd: 'Hey JARVIS, play Telugu songs', desc: 'Search Telugu songs' },
    { cmd: 'Hey JARVIS, play Telugu love songs', desc: 'Telugu love songs' },
    { cmd: 'Hey JARVIS, play Telugu latest hits', desc: 'Telugu latest hits' },
    { cmd: 'Hey JARVIS, play party songs', desc: 'Upbeat party music' },
  ]},
  { group: 'Web & Info', commands: [
    { cmd: 'Hey JARVIS, open YouTube', desc: 'Open YouTube' },
    { cmd: 'Hey JARVIS, open Gmail', desc: 'Open Gmail' },
    { cmd: 'Hey JARVIS, search Google for ...', desc: 'Google search' },
    { cmd: 'Hey JARVIS, tell time', desc: 'Current time & date' },
    { cmd: 'Anything else', desc: 'JARVIS AI answers via GPT' },
  ]},
];
