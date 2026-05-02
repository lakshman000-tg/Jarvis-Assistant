import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Mic, Chrome } from 'lucide-react';

export type DiagnosticIssue =
  | 'iframe-blocked'
  | 'unsupported-browser'
  | 'permission-denied'
  | 'https-required'
  | 'ok';

export interface DiagnosticResult {
  issue: DiagnosticIssue;
  isInIframe: boolean;
  browserName: string;
  hasApiSupport: boolean;
  isHttps: boolean;
  appUrl: string;
}

export function runVoiceDiagnostic(): DiagnosticResult {
  const ua = navigator.userAgent;
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua) && !/OPR/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isSafari = /Safari/.test(ua) && !isChrome;
  const isFirefox = /Firefox/.test(ua);

  const browserName = isChrome ? 'Chrome'
    : isEdge ? 'Edge'
    : isSafari ? 'Safari'
    : isFirefox ? 'Firefox'
    : 'Unknown Browser';

  const hasApiSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isInIframe = window.self !== window.top;
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
  const appUrl = window.location.href;

  let issue: DiagnosticIssue = 'ok';

  if (!isHttps) {
    issue = 'https-required';
  } else if (!hasApiSupport) {
    issue = 'unsupported-browser';
  } else if (isInIframe) {
    // Browsers block microphone in iframes without allow="microphone"
    issue = 'iframe-blocked';
  }

  return { issue, isInIframe, browserName, hasApiSupport, isHttps, appUrl };
}

interface VoiceDiagnosticBannerProps {
  permissionDenied: boolean;
}

export function VoiceDiagnosticBanner({ permissionDenied }: VoiceDiagnosticBannerProps) {
  const [diag, setDiag] = useState<DiagnosticResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDiag(runVoiceDiagnostic());
  }, []);

  // Recheck on permission denied
  useEffect(() => {
    if (permissionDenied) setDiag(runVoiceDiagnostic());
  }, [permissionDenied]);

  if (!diag) return null;

  const effectiveIssue = permissionDenied ? 'permission-denied' : diag.issue;
  if (effectiveIssue === 'ok') return null;

  const configs: Record<Exclude<DiagnosticIssue, 'ok'>, {
    title: string;
    short: string;
    detail: React.ReactNode;
    action?: React.ReactNode;
  }> = {
    'iframe-blocked': {
      title: 'Voice blocked inside preview',
      short: 'Microphone is blocked in this embedded preview. Open the app in a new browser tab to use voice.',
      detail: (
        <div className="space-y-2 text-xs text-gray-400 font-body">
          <p>Browsers block microphone access inside embedded iframes (like Replit's canvas preview) for security reasons.</p>
          <p className="text-yellow-300">✅ Fix: Open the app in its own browser tab — microphone will work there.</p>
          <p className="text-jarvis-cyan-dark">💡 The text input below works without microphone — type any command to test.</p>
        </div>
      ),
      action: (
        <a
          href={diag.appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-jarvis-cyan text-jarvis-navy text-xs font-display tracking-widest uppercase font-bold rounded hover:bg-jarvis-cyan/80 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in New Tab
        </a>
      ),
    },
    'unsupported-browser': {
      title: 'Browser does not support voice',
      short: `Voice recognition requires Chrome or Edge. You are using ${diag.browserName}.`,
      detail: (
        <div className="space-y-2 text-xs text-gray-400 font-body">
          <p>The Web Speech API (voice recognition) is only supported in:</p>
          <ul className="list-disc list-inside space-y-1 text-jarvis-cyan">
            <li>Google Chrome (desktop + Android)</li>
            <li>Microsoft Edge</li>
          </ul>
          <p className="text-yellow-300">✅ Fix: Open this app in Chrome or Edge for voice to work.</p>
          <p className="text-jarvis-cyan-dark">💡 Use the text input below to test all commands without voice.</p>
        </div>
      ),
      action: (
        <div className="flex items-center gap-2 text-xs text-gray-400 font-body">
          <Chrome className="w-4 h-4 text-jarvis-cyan" />
          <span>Copy URL and open in Chrome or Edge</span>
        </div>
      ),
    },
    'permission-denied': {
      title: 'Microphone permission denied',
      short: 'You blocked microphone access. Allow it in browser settings to use voice.',
      detail: (
        <div className="space-y-2 text-xs text-gray-400 font-body">
          <p>Your browser blocked microphone access for this site. To fix:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Click the 🔒 or 🎙️ icon in your browser address bar</li>
            <li>Set <strong className="text-jarvis-cyan">Microphone</strong> to <strong className="text-green-400">Allow</strong></li>
            <li>Refresh the page</li>
          </ol>
          <p className="text-jarvis-cyan-dark">💡 The text input works without microphone in the meantime.</p>
        </div>
      ),
    },
    'https-required': {
      title: 'HTTPS required for voice',
      short: 'Voice recognition only works on secure HTTPS connections.',
      detail: (
        <div className="text-xs text-gray-400 font-body">
          <p>Microphone access requires HTTPS. Access this app via a secure URL.</p>
        </div>
      ),
    },
  };

  const cfg = configs[effectiveIssue];

  const borderColor = effectiveIssue === 'permission-denied' ? 'border-red-500/50'
    : effectiveIssue === 'iframe-blocked' ? 'border-yellow-500/50'
    : 'border-orange-500/50';

  const bgColor = effectiveIssue === 'permission-denied' ? 'bg-red-950/40'
    : effectiveIssue === 'iframe-blocked' ? 'bg-yellow-950/30'
    : 'bg-orange-950/30';

  const iconColor = effectiveIssue === 'permission-denied' ? 'text-red-400'
    : effectiveIssue === 'iframe-blocked' ? 'text-yellow-400'
    : 'text-orange-400';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg border ${borderColor} ${bgColor} px-3 py-2.5 mb-2`}
      >
        <div
          className="flex items-start gap-2 cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-display tracking-wider uppercase ${iconColor}`}>
              {cfg.title}
            </p>
            {!expanded && (
              <p className="text-[11px] text-gray-400 font-body mt-0.5 leading-relaxed">
                {cfg.short}
              </p>
            )}
          </div>
          <button className={`flex-shrink-0 ${iconColor} hover:opacity-70 transition-opacity`}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                {cfg.detail}
                {cfg.action && <div>{cfg.action}</div>}

                {/* Mic test button — only for permission-denied */}
                {effectiveIssue === 'permission-denied' && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await navigator.mediaDevices.getUserMedia({ audio: true });
                        window.location.reload();
                      } catch {
                        // still denied
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-jarvis-cyan/10 border border-jarvis-cyan/40 text-jarvis-cyan text-xs font-display tracking-widest uppercase rounded hover:bg-jarvis-cyan/20 transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Retry Microphone Permission
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
