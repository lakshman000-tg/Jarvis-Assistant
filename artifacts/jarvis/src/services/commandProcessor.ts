export type CommandCategory =
  | 'navigation'
  | 'media'
  | 'web'
  | 'info'
  | 'app'
  | 'browser'
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
  playMedia: (embedUrl: string, title: string, query?: string, videoId?: string) => void;
  mediaControl: (action: 'pause' | 'play' | 'next' | 'stop') => void;
}

async function searchAndPlayYoutube(
  query: string,
  callbacks: CommandProcessorCallbacks,
  excludeId?: string
): Promise<void> {
  callbacks.playMedia('__loading__', query, query);
  try {
    const params = new URLSearchParams({ q: query });
    if (excludeId) params.set('exclude', excludeId);
    const res = await fetch(`/api/youtube/search?${params}`);
    if (!res.ok) throw new Error(`Search ${res.status}`);
    const data = await res.json();
    callbacks.playMedia(data.embedUrl, data.title || query, query, data.id);
  } catch {
    openUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    callbacks.playMedia('__error__', query, query);
  }
}

function openUrl(url: string): void {
  if ((window as any).Capacitor?.isNativePlatform?.()) {
    (window as any).open(url, '_system', 'location=yes');
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 300);
}

function closeTab(): void {
  window.close();
  // Fallback: if window.close() is blocked, navigate to blank
  setTimeout(() => {
    try { window.open('', '_self')?.close(); } catch { /* ignore */ }
  }, 300);
}

export function processCommand(
  rawText: string,
  callbacks: CommandProcessorCallbacks
): CommandResult {
  const text = rawText
    .replace(/^hey\s+jarvis[,.]?\s*/i, '')
    .trim()
    .toLowerCase();

  // ── JARVIS Navigation ────────────────────────────────────────────────────
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

  // ── App control ──────────────────────────────────────────────────────────
  if (text.match(/\block\s+(the\s+)?app\b/) || text.match(/\block\s+jarvis\b/)) {
    return { response: 'Locking the app 🔐', category: 'app', handled: true, action: () => callbacks.lockApp() };
  }
  if (text.match(/\blog\s*(out|off)\b/) || text.match(/\bsign\s*out\b/)) {
    return { response: 'Logging you out. Goodbye! 👋', category: 'app', handled: true, action: () => callbacks.logout() };
  }
  if (text.match(/\bhelp\b/) || text === '?') {
    return { response: 'Opening help 📖', category: 'app', handled: true, action: () => callbacks.showHelp() };
  }

  // ── Browser / tab control ────────────────────────────────────────────────
  if (text.match(/\bclose\s+(chrome|browser|window|tab)\b/) || text.match(/\bclose\s+this\s+tab\b/) || text === 'close chrome' || text === 'close tab') {
    return { response: 'Closing tab 🚪', category: 'browser', handled: true, action: closeTab };
  }
  if (text.match(/\bnew\s+tab\b/) || text.match(/\bopen\s+new\s+tab\b/)) {
    return { response: 'Opening new tab 🆕', category: 'browser', handled: true, action: () => window.open('about:blank', '_blank') };
  }
  if (text.match(/\bgo\s+back\b/) || text.match(/\bback\b/) && text.length < 8) {
    return { response: 'Going back ◀️', category: 'browser', handled: true, action: () => history.back() };
  }
  if (text.match(/\bgo\s+forward\b/) || text.match(/\bforward\b/) && text.length < 12) {
    return { response: 'Going forward ▶️', category: 'browser', handled: true, action: () => history.forward() };
  }
  if (text.match(/\breload\b/) || text.match(/\brefresh\s+(page|browser)?\b/)) {
    return { response: 'Refreshing the page 🔄', category: 'browser', handled: true, action: () => window.location.reload() };
  }
  if (text.match(/\bfull\s*screen\b/) || text.match(/\benter\s+full\s*screen\b/)) {
    return { response: 'Entering full screen ⬛', category: 'browser', handled: true, action: () => document.documentElement.requestFullscreen?.() };
  }
  if (text.match(/\bexit\s+full\s*screen\b/) || text.match(/\bleave\s+full\s*screen\b/)) {
    return { response: 'Exiting full screen 🔲', category: 'browser', handled: true, action: () => document.exitFullscreen?.() };
  }
  if (text.match(/\bscroll\s+up\b/)) {
    return { response: 'Scrolling up ⬆️', category: 'browser', handled: true, action: () => window.scrollBy({ top: -300, behavior: 'smooth' }) };
  }
  if (text.match(/\bscroll\s+down\b/)) {
    return { response: 'Scrolling down ⬇️', category: 'browser', handled: true, action: () => window.scrollBy({ top: 300, behavior: 'smooth' }) };
  }
  if (text.match(/\bscroll\s+to\s+top\b/) || text.match(/\bgo\s+to\s+top\b/)) {
    return { response: 'Going to top ⬆️', category: 'browser', handled: true, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) };
  }
  if (text.match(/\bscroll\s+to\s+bottom\b/) || text.match(/\bgo\s+to\s+bottom\b/)) {
    return { response: 'Going to bottom ⬇️', category: 'browser', handled: true, action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }) };
  }
  if (text.match(/\bzoom\s+in\b/)) {
    return { response: 'Zooming in 🔍', category: 'browser', handled: true, action: () => openUrl('javascript:void(document.body.style.zoom=(parseFloat(document.body.style.zoom||1)+0.1).toString())') };
  }
  if (text.match(/\bzoom\s+out\b/)) {
    return { response: 'Zooming out 🔎', category: 'browser', handled: true, action: () => openUrl('javascript:void(document.body.style.zoom=(parseFloat(document.body.style.zoom||1)-0.1).toString())') };
  }
  if (text.match(/\bprint\s+(page|this)?\b/) || text === 'print') {
    return { response: 'Opening print dialog 🖨️', category: 'browser', handled: true, action: () => window.print() };
  }

  // ── YouTube (embedded player first) ────────────────────────────────────
  const openYtPlay =
    text.match(/\bopen\s+youtube\s+and\s+play\s+(.+)$/i) ||
    text.match(/\bopen\s+youtube\s+play\s+(.+)$/i) ||
    text.match(/\byoutube\s+and\s+play\s+(.+)$/i);
  if (openYtPlay) {
    const query = openYtPlay[1].trim();
    return { response: `Searching YouTube for "${query}"… 🎬`, category: 'media', handled: true, action: () => searchAndPlayYoutube(query, callbacks) };
  }

  // ── Google suite ─────────────────────────────────────────────────────────
  if (text.match(/\bopen\s+youtube\b/)) {
    return { response: 'Opening YouTube 🚀', category: 'web', handled: true, action: () => openUrl('https://www.youtube.com') };
  }
  if (text.match(/\bopen\s+gmail\b/)) {
    return { response: 'Opening Gmail 📧', category: 'web', handled: true, action: () => openUrl('https://mail.google.com') };
  }
  if (text.match(/\bopen\s+google\s+drive\b/) || text.match(/\bopen\s+drive\b/)) {
    return { response: 'Opening Google Drive 💾', category: 'web', handled: true, action: () => openUrl('https://drive.google.com') };
  }
  if (text.match(/\bopen\s+google\s+docs?\b/) || text.match(/\bopen\s+docs?\b/)) {
    return { response: 'Opening Google Docs 📄', category: 'web', handled: true, action: () => openUrl('https://docs.google.com') };
  }
  if (text.match(/\bopen\s+google\s+sheets?\b/) || text.match(/\bopen\s+sheets?\b/)) {
    return { response: 'Opening Google Sheets 📊', category: 'web', handled: true, action: () => openUrl('https://sheets.google.com') };
  }
  if (text.match(/\bopen\s+google\s+slides?\b/) || text.match(/\bopen\s+slides?\b/)) {
    return { response: 'Opening Google Slides 📑', category: 'web', handled: true, action: () => openUrl('https://slides.google.com') };
  }
  if (text.match(/\bopen\s+google\s+(meet|meeting)\b/) || text.match(/\bopen\s+meet\b/)) {
    return { response: 'Opening Google Meet 📹', category: 'web', handled: true, action: () => openUrl('https://meet.google.com') };
  }
  if (text.match(/\bopen\s+(google\s+)?calendar\b/)) {
    return { response: 'Opening Google Calendar 📅', category: 'web', handled: true, action: () => openUrl('https://calendar.google.com') };
  }
  if (text.match(/\bopen\s+(google\s+)?keep\b/) || text.match(/\bopen\s+notes?\b/)) {
    return { response: 'Opening Google Keep 📝', category: 'web', handled: true, action: () => openUrl('https://keep.google.com') };
  }
  if (text.match(/\bopen\s+(google\s+)?translate\b/) || text.match(/\btranslate\s+this\b/)) {
    return { response: 'Opening Google Translate 🌐', category: 'web', handled: true, action: () => openUrl('https://translate.google.com') };
  }
  if (text.match(/\bopen\s+(google\s+)?news\b/)) {
    return { response: 'Opening Google News 📰', category: 'web', handled: true, action: () => openUrl('https://news.google.com') };
  }
  if (text.match(/\bopen\s+(google\s+)?photos?\b/)) {
    return { response: 'Opening Google Photos 🖼️', category: 'web', handled: true, action: () => openUrl('https://photos.google.com') };
  }
  if (text.match(/\bopen\s+google\b/)) {
    return { response: 'Opening Google 🔍', category: 'web', handled: true, action: () => openUrl('https://www.google.com') };
  }
  if (text.match(/\bopen\s+(google\s+)?maps?\b/) || text.match(/\bgoogle\s+maps?\b/)) {
    return { response: 'Opening Google Maps 🗺️', category: 'web', handled: true, action: () => openUrl('https://maps.google.com') };
  }

  // ── Tools / utilities ────────────────────────────────────────────────────
  if (text.match(/\bopen\s+calculator\b/) || text === 'calculator') {
    return { response: 'Opening calculator 🧮', category: 'web', handled: true, action: () => openUrl('https://www.google.com/search?q=calculator') };
  }
  if (text.match(/\b(check\s+)?weather\b/) || text.match(/\bopen\s+weather\b/)) {
    return { response: 'Checking weather ⛅', category: 'web', handled: true, action: () => openUrl('https://www.google.com/search?q=weather+today') };
  }
  if (text.match(/\bopen\s+timer\b/) || text === 'timer' || text.match(/\bset\s+timer\b/)) {
    return { response: 'Opening timer ⏱️', category: 'web', handled: true, action: () => openUrl('https://www.google.com/search?q=timer') };
  }
  if (text.match(/\bopen\s+stopwatch\b/) || text === 'stopwatch') {
    return { response: 'Opening stopwatch ⏱️', category: 'web', handled: true, action: () => openUrl('https://www.google.com/search?q=stopwatch') };
  }
  if (text.match(/\bopen\s+notepad\b/) || text.match(/\bopen\s+text\s+editor\b/)) {
    return { response: 'Opening online notepad 📝', category: 'web', handled: true, action: () => openUrl('https://keep.google.com') };
  }
  if (text.match(/\b(check\s+)?(my\s+)?ip\s*(address)?\b/)) {
    return { response: 'Checking your IP address 🌐', category: 'web', handled: true, action: () => openUrl('https://www.google.com/search?q=what+is+my+ip+address') };
  }
  if (text.match(/\b(check\s+)?internet\s+speed\b/) || text.match(/\bspeed\s+test\b/)) {
    return { response: 'Running speed test 🚀', category: 'web', handled: true, action: () => openUrl('https://fast.com') };
  }
  if (text.match(/\bopen\s+pastebin\b/)) {
    return { response: 'Opening Pastebin 📋', category: 'web', handled: true, action: () => openUrl('https://pastebin.com') };
  }
  if (text.match(/\bopen\s+zoom\b/)) {
    return { response: 'Opening Zoom 📹', category: 'web', handled: true, action: () => openUrl('https://zoom.us') };
  }
  if (text.match(/\bopen\s+teams?\b/) || text.match(/\bopen\s+microsoft\s+teams?\b/)) {
    return { response: 'Opening Microsoft Teams 🤝', category: 'web', handled: true, action: () => openUrl('https://teams.microsoft.com') };
  }
  if (text.match(/\bopen\s+outlook\b/)) {
    return { response: 'Opening Outlook 📧', category: 'web', handled: true, action: () => openUrl('https://outlook.live.com') };
  }
  if (text.match(/\bopen\s+onedrive\b/) || text.match(/\bopen\s+one\s+drive\b/)) {
    return { response: 'Opening OneDrive ☁️', category: 'web', handled: true, action: () => openUrl('https://onedrive.live.com') };
  }
  if (text.match(/\bopen\s+dropbox\b/)) {
    return { response: 'Opening Dropbox 📦', category: 'web', handled: true, action: () => openUrl('https://www.dropbox.com') };
  }
  if (text.match(/\bopen\s+notion\b/)) {
    return { response: 'Opening Notion 📓', category: 'web', handled: true, action: () => openUrl('https://www.notion.so') };
  }
  if (text.match(/\bopen\s+trello\b/)) {
    return { response: 'Opening Trello 🗂️', category: 'web', handled: true, action: () => openUrl('https://trello.com') };
  }
  if (text.match(/\bopen\s+slack\b/)) {
    return { response: 'Opening Slack 💬', category: 'web', handled: true, action: () => openUrl('https://slack.com') };
  }
  if (text.match(/\bopen\s+discord\b/)) {
    return { response: 'Opening Discord 🎮', category: 'web', handled: true, action: () => openUrl('https://discord.com/app') };
  }
  if (text.match(/\bopen\s+telegram\b/)) {
    return { response: 'Opening Telegram ✈️', category: 'web', handled: true, action: () => openUrl('https://web.telegram.org') };
  }

  // ── Social media ─────────────────────────────────────────────────────────
  if (text.match(/\bopen\s+whatsapp\b/)) {
    return { response: 'Opening WhatsApp 💬', category: 'web', handled: true, action: () => openUrl('https://web.whatsapp.com') };
  }
  if (text.match(/\bopen\s+instagram\b/)) {
    return { response: 'Opening Instagram 📸', category: 'web', handled: true, action: () => openUrl('https://www.instagram.com') };
  }
  if (text.match(/\bopen\s+(twitter|x\.com)\b/) || text.match(/\bopen\s+x\b/) && text.length < 10) {
    return { response: 'Opening X (Twitter) 🐦', category: 'web', handled: true, action: () => openUrl('https://www.x.com') };
  }
  if (text.match(/\bopen\s+facebook\b/)) {
    return { response: 'Opening Facebook 👥', category: 'web', handled: true, action: () => openUrl('https://www.facebook.com') };
  }
  if (text.match(/\bopen\s+linkedin\b/)) {
    return { response: 'Opening LinkedIn 💼', category: 'web', handled: true, action: () => openUrl('https://www.linkedin.com') };
  }
  if (text.match(/\bopen\s+reddit\b/)) {
    return { response: 'Opening Reddit 🤖', category: 'web', handled: true, action: () => openUrl('https://www.reddit.com') };
  }
  if (text.match(/\bopen\s+tiktok\b/) || text.match(/\bopen\s+tik\s+tok\b/)) {
    return { response: 'Opening TikTok 🎵', category: 'web', handled: true, action: () => openUrl('https://www.tiktok.com') };
  }
  if (text.match(/\bopen\s+pinterest\b/)) {
    return { response: 'Opening Pinterest 📌', category: 'web', handled: true, action: () => openUrl('https://www.pinterest.com') };
  }
  if (text.match(/\bopen\s+snapchat\b/)) {
    return { response: 'Opening Snapchat 👻', category: 'web', handled: true, action: () => openUrl('https://web.snapchat.com') };
  }

  // ── Shopping ─────────────────────────────────────────────────────────────
  if (text.match(/\bopen\s+amazon\b/)) {
    return { response: 'Opening Amazon 🛒', category: 'web', handled: true, action: () => openUrl('https://www.amazon.com') };
  }
  if (text.match(/\bopen\s+flipkart\b/)) {
    return { response: 'Opening Flipkart 🛍️', category: 'web', handled: true, action: () => openUrl('https://www.flipkart.com') };
  }
  if (text.match(/\bopen\s+ebay\b/)) {
    return { response: 'Opening eBay 🏷️', category: 'web', handled: true, action: () => openUrl('https://www.ebay.com') };
  }
  if (text.match(/\bopen\s+meesho\b/)) {
    return { response: 'Opening Meesho 🛍️', category: 'web', handled: true, action: () => openUrl('https://www.meesho.com') };
  }

  // ── Payments / finance ───────────────────────────────────────────────────
  if (text.match(/\bopen\s+paytm\b/)) {
    return { response: 'Opening Paytm 💳', category: 'web', handled: true, action: () => openUrl('https://paytm.com') };
  }
  if (text.match(/\bopen\s+(g\s*pay|google\s+pay)\b/)) {
    return { response: 'Opening Google Pay 💸', category: 'web', handled: true, action: () => openUrl('https://pay.google.com') };
  }
  if (text.match(/\bopen\s+phonepe\b/) || text.match(/\bopen\s+phone\s+pe\b/)) {
    return { response: 'Opening PhonePe 💰', category: 'web', handled: true, action: () => openUrl('https://www.phonepe.com') };
  }
  if (text.match(/\bopen\s+paypal\b/)) {
    return { response: 'Opening PayPal 💳', category: 'web', handled: true, action: () => openUrl('https://www.paypal.com') };
  }

  // ── Entertainment / streaming ────────────────────────────────────────────
  if (text.match(/\bopen\s+netflix\b/)) {
    return { response: 'Opening Netflix 🎬', category: 'web', handled: true, action: () => openUrl('https://www.netflix.com') };
  }
  if (text.match(/\bopen\s+spotify\b/)) {
    return { response: 'Opening Spotify 🎧', category: 'web', handled: true, action: () => openUrl('https://open.spotify.com') };
  }
  if (text.match(/\bopen\s+(disney\s*\+?|hotstar)\b/)) {
    return { response: 'Opening Disney+ Hotstar 🎥', category: 'web', handled: true, action: () => openUrl('https://www.hotstar.com') };
  }
  if (text.match(/\bopen\s+(prime|amazon\s+prime)\b/)) {
    return { response: 'Opening Amazon Prime Video 🎬', category: 'web', handled: true, action: () => openUrl('https://www.primevideo.com') };
  }
  if (text.match(/\bopen\s+(zee5|zee\s+5)\b/)) {
    return { response: 'Opening ZEE5 📺', category: 'web', handled: true, action: () => openUrl('https://www.zee5.com') };
  }
  if (text.match(/\bopen\s+twitch\b/)) {
    return { response: 'Opening Twitch 🎮', category: 'web', handled: true, action: () => openUrl('https://www.twitch.tv') };
  }

  // ── Dev / tech ────────────────────────────────────────────────────────────
  if (text.match(/\bopen\s+github\b/)) {
    return { response: 'Opening GitHub 🐙', category: 'web', handled: true, action: () => openUrl('https://www.github.com') };
  }
  if (text.match(/\bopen\s+stack\s*overflow\b/)) {
    return { response: 'Opening Stack Overflow 💻', category: 'web', handled: true, action: () => openUrl('https://stackoverflow.com') };
  }
  if (text.match(/\bopen\s+replit\b/)) {
    return { response: 'Opening Replit 🔷', category: 'web', handled: true, action: () => openUrl('https://replit.com') };
  }
  if (text.match(/\bopen\s+chat\s*gpt\b/) || text.match(/\bopen\s+chatgpt\b/)) {
    return { response: 'Opening ChatGPT 🤖', category: 'web', handled: true, action: () => openUrl('https://chat.openai.com') };
  }
  if (text.match(/\bopen\s+gemini\b/)) {
    return { response: 'Opening Gemini ✨', category: 'web', handled: true, action: () => openUrl('https://gemini.google.com') };
  }

  // ── Google Search ────────────────────────────────────────────────────────
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

  // ── Open any URL directly ────────────────────────────────────────────────
  const openUrlMatch = text.match(/^(?:open|go\s+to|navigate\s+to)\s+(https?:\/\/\S+)/i);
  if (openUrlMatch) {
    const url = openUrlMatch[1];
    return { response: `Opening ${url} 🌐`, category: 'web', handled: true, action: () => openUrl(url) };
  }

  // ── YouTube embedded player ───────────────────────────────────────────────
  const ytPlayMatch =
    text.match(/^play\s+(.+?)\s+on\s+youtube$/i) ||
    text.match(/^play\s+(.+?)\s+youtube$/i) ||
    text.match(/^youtube\s+play\s+(.+)$/i);
  if (ytPlayMatch) {
    const query = ytPlayMatch[1].trim();
    return { response: `Searching YouTube for "${query}"… 🎬`, category: 'media', handled: true, action: () => searchAndPlayYoutube(query, callbacks) };
  }
  const ytSearchMatch =
    text.match(/\bsearch\s+youtube\s+(?:for\s+)?(.+)$/i) ||
    text.match(/\byoutube\s+search\s+(?:for\s+)?(.+)$/i);
  if (ytSearchMatch) {
    const query = ytSearchMatch[1].trim();
    return { response: `Searching YouTube for: ${query} 🔍`, category: 'media', handled: true, action: () => searchAndPlayYoutube(query, callbacks) };
  }

  // ── Media shortcuts ───────────────────────────────────────────────────────
  if (text.match(/\bplay\s+music\b/) || text.match(/\bopen\s+music\b/)) {
    return { response: 'Playing music 🎵', category: 'media', handled: true, action: () => searchAndPlayYoutube('top hits 2024', callbacks) };
  }
  if (text.match(/\bplay\s+telugu\s+love\s+songs?\b/)) {
    return { response: 'Playing Telugu love songs 💕🎵', category: 'media', handled: true, action: () => searchAndPlayYoutube('Telugu love songs', callbacks) };
  }
  if (text.match(/\bplay\s+telugu\s+(songs?|music)\b/)) {
    return { response: 'Playing Telugu songs 🎵', category: 'media', handled: true, action: () => searchAndPlayYoutube('Telugu songs', callbacks) };
  }
  if (text.match(/\bplay\s+hindi\s+(songs?|music)\b/)) {
    return { response: 'Playing Hindi songs 🎵', category: 'media', handled: true, action: () => searchAndPlayYoutube('Hindi songs', callbacks) };
  }
  if (text.match(/\bplay\s+bollywood\b/)) {
    return { response: 'Playing Bollywood hits 🎵', category: 'media', handled: true, action: () => searchAndPlayYoutube('Bollywood songs', callbacks) };
  }
  if (text.match(/\bplay\s+(upbeat|party)\b/) || text.match(/\bparty\s+(songs?|music)\b/)) {
    return { response: 'Time to party! 🎉🎵', category: 'media', handled: true, action: () => searchAndPlayYoutube('upbeat party songs', callbacks) };
  }
  if (text.match(/\bplay\s+lofi\b/) || text.match(/\blofi\s+(music|beats?)\b/)) {
    return { response: 'Playing lo-fi music 🎧', category: 'media', handled: true, action: () => searchAndPlayYoutube('lofi hip hop study beats', callbacks) };
  }
  if (text.match(/\bplay\s+relaxing\b/) || text.match(/\brelaxing\s+music\b/)) {
    return { response: 'Playing relaxing music 😌🎵', category: 'media', handled: true, action: () => searchAndPlayYoutube('relaxing music', callbacks) };
  }
  // Generic "play [anything]" → YouTube embed
  const playMatch = text.match(/^play\s+(.+)$/i);
  if (playMatch) {
    const query = playMatch[1].trim();
    return { response: `Searching for "${query}"… 🎵`, category: 'media', handled: true, action: () => searchAndPlayYoutube(query, callbacks) };
  }

  // ── Media controls ────────────────────────────────────────────────────────
  if (text.match(/\bpause\b/)) {
    return { response: 'Pausing ⏸️', category: 'media', handled: true, action: () => callbacks.mediaControl('pause') };
  }
  if (text.match(/\bresume\b/) || text.match(/\bunpause\b/) || text === 'play') {
    return { response: 'Resuming ▶️', category: 'media', handled: true, action: () => callbacks.mediaControl('play') };
  }
  if (text.match(/\bnext\s*(song|track|video)?\b/) || text.match(/\bskip\b/)) {
    return { response: 'Playing next track ⏭️', category: 'media', handled: true, action: () => callbacks.mediaControl('next') };
  }
  if (text.match(/\bstop\s*(music|video|playing|player)?\b/) || text.match(/\bclose\s*(player|music|video)\b/)) {
    return { response: 'Stopping playback ⏹️', category: 'media', handled: true, action: () => callbacks.mediaControl('stop') };
  }

  // ── Info ──────────────────────────────────────────────────────────────────
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
  if (text.match(/\bthank\s*(you|s)\b/) || text === 'thanks') {
    return { response: "You're welcome! Anything else? 😊", category: 'info', handled: true, action: () => {} };
  }
  if (text.match(/\bbye\b/) || text.match(/\bgoodbye\b/) || text.match(/\bsee\s+you\b/)) {
    return { response: 'Goodbye! Stay awesome! 👋', category: 'info', handled: true, action: () => {} };
  }

  // ── Unknown → GPT ─────────────────────────────────────────────────────────
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
    group: 'Browser Control',
    commands: [
      { cmd: 'Hey JARVIS, close Chrome', desc: 'Close this tab/window' },
      { cmd: 'Hey JARVIS, new tab', desc: 'Open a new tab' },
      { cmd: 'Hey JARVIS, go back', desc: 'Browser back' },
      { cmd: 'Hey JARVIS, go forward', desc: 'Browser forward' },
      { cmd: 'Hey JARVIS, reload page', desc: 'Refresh the page' },
      { cmd: 'Hey JARVIS, full screen', desc: 'Enter full screen' },
      { cmd: 'Hey JARVIS, exit full screen', desc: 'Exit full screen' },
      { cmd: 'Hey JARVIS, scroll down', desc: 'Scroll page down' },
      { cmd: 'Hey JARVIS, scroll up', desc: 'Scroll page up' },
      { cmd: 'Hey JARVIS, print page', desc: 'Open print dialog' },
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
    group: 'Google Suite',
    commands: [
      { cmd: 'Hey JARVIS, open Gmail', desc: 'Open Gmail' },
      { cmd: 'Hey JARVIS, open Google Drive', desc: 'Open Google Drive' },
      { cmd: 'Hey JARVIS, open Google Docs', desc: 'Open Google Docs' },
      { cmd: 'Hey JARVIS, open Google Sheets', desc: 'Open Google Sheets' },
      { cmd: 'Hey JARVIS, open Google Meet', desc: 'Open Google Meet' },
      { cmd: 'Hey JARVIS, open Calendar', desc: 'Open Google Calendar' },
      { cmd: 'Hey JARVIS, open Translate', desc: 'Open Google Translate' },
      { cmd: 'Hey JARVIS, open Maps', desc: 'Open Google Maps' },
    ],
  },
  {
    group: 'Tools',
    commands: [
      { cmd: 'Hey JARVIS, open calculator', desc: 'Open Google calculator' },
      { cmd: 'Hey JARVIS, weather', desc: 'Check today\'s weather' },
      { cmd: 'Hey JARVIS, set timer', desc: 'Open a timer' },
      { cmd: 'Hey JARVIS, speed test', desc: 'Test internet speed' },
      { cmd: 'Hey JARVIS, what is my IP', desc: 'Check your IP address' },
      { cmd: 'Hey JARVIS, open Zoom', desc: 'Open Zoom' },
      { cmd: 'Hey JARVIS, open Notion', desc: 'Open Notion' },
    ],
  },
  {
    group: 'Social & Chat',
    commands: [
      { cmd: 'Hey JARVIS, open WhatsApp', desc: 'Open WhatsApp Web' },
      { cmd: 'Hey JARVIS, open Instagram', desc: 'Open Instagram' },
      { cmd: 'Hey JARVIS, open Twitter', desc: 'Open X / Twitter' },
      { cmd: 'Hey JARVIS, open Facebook', desc: 'Open Facebook' },
      { cmd: 'Hey JARVIS, open LinkedIn', desc: 'Open LinkedIn' },
      { cmd: 'Hey JARVIS, open Telegram', desc: 'Open Telegram Web' },
      { cmd: 'Hey JARVIS, open Discord', desc: 'Open Discord' },
      { cmd: 'Hey JARVIS, open Reddit', desc: 'Open Reddit' },
    ],
  },
  {
    group: 'Shopping & Payments',
    commands: [
      { cmd: 'Hey JARVIS, open Amazon', desc: 'Open Amazon' },
      { cmd: 'Hey JARVIS, open Flipkart', desc: 'Open Flipkart' },
      { cmd: 'Hey JARVIS, open Paytm', desc: 'Open Paytm' },
      { cmd: 'Hey JARVIS, open PhonePe', desc: 'Open PhonePe' },
      { cmd: 'Hey JARVIS, open Google Pay', desc: 'Open Google Pay' },
    ],
  },
  {
    group: 'Streaming',
    commands: [
      { cmd: 'Hey JARVIS, open Netflix', desc: 'Open Netflix' },
      { cmd: 'Hey JARVIS, open Spotify', desc: 'Open Spotify' },
      { cmd: 'Hey JARVIS, open Hotstar', desc: 'Open Disney+ Hotstar' },
      { cmd: 'Hey JARVIS, open Prime', desc: 'Open Amazon Prime Video' },
      { cmd: 'Hey JARVIS, open Twitch', desc: 'Open Twitch' },
    ],
  },
  {
    group: 'Media',
    commands: [
      { cmd: 'Hey JARVIS, play music', desc: 'Play top hits' },
      { cmd: 'Hey JARVIS, play lofi', desc: 'Lo-fi study beats' },
      { cmd: 'Hey JARVIS, play Telugu songs', desc: 'Telugu songs on YouTube' },
      { cmd: 'Hey JARVIS, play Bollywood', desc: 'Bollywood hits' },
      { cmd: 'Hey JARVIS, play party songs', desc: 'Upbeat party mix' },
      { cmd: 'Hey JARVIS, play [anything]', desc: 'Any song/video on YouTube' },
      { cmd: 'Hey JARVIS, pause', desc: 'Pause video' },
      { cmd: 'Hey JARVIS, next', desc: 'Skip to next video' },
      { cmd: 'Hey JARVIS, stop', desc: 'Stop player' },
    ],
  },
  {
    group: 'Information',
    commands: [
      { cmd: 'Hey JARVIS, what time is it', desc: 'Current time' },
      { cmd: 'Hey JARVIS, what is today\'s date', desc: "Today's date" },
      { cmd: 'Hey JARVIS, search for [anything]', desc: 'Google search' },
      { cmd: 'Anything else...', desc: 'JARVIS AI answers via GPT' },
    ],
  },
];
