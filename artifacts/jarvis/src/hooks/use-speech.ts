import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isCapacitorNative,
  requestNativeMicPermission,
  startNativeListening,
  stopNativeListening,
} from '@/services/nativeSpeechService';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type VoiceStatus =
  | 'idle'
  | 'listeningForWake'
  | 'wakeDetected'
  | 'listeningForCommand'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'noPermission'
  | 'notSupported';

export type VoiceMode = 'off' | 'wakeWord' | 'manual';

export const STATUS_LABELS: Record<VoiceStatus, string> = {
  idle: 'Standby',
  listeningForWake: 'Listening for "Hey JARVIS"',
  wakeDetected: 'Wake word detected!',
  listeningForCommand: 'Listening for command...',
  processing: 'Processing command...',
  speaking: 'JARVIS speaking...',
  error: 'Error — try again',
  noPermission: 'Microphone permission denied',
  notSupported: 'Voice not supported in this browser',
};

export function useSpeech(onResult: (text: string) => void) {
  const [mode, setMode] = useState<VoiceMode>('off');
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const [isNative] = useState(() => isCapacitorNative());

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<VoiceMode>('off');
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRunningRef = useRef(false); // true while a session is alive
  const focusCleanupRef = useRef<(() => void) | null>(null); // cleanup for window focus listener
  const onResultRef = useRef(onResult);
  const wakeListenRef = useRef<() => void>(() => {});

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  const updateStatus = useCallback((s: VoiceStatus) => setStatus(s), []);

  // ─── WEB: browser SpeechRecognition helpers ──────────────────────────────

  const stopWebRecognition = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    recognitionRunningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setInterimText('');
  }, []);

  const buildWebRecognition = useCallback((continuous: boolean) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = continuous;
    r.interimResults = true;
    r.lang = 'en-US';
    r.maxAlternatives = 1;
    return r;
  }, []);

  // Web wake-word continuous listening
  const startWebWakeListening = useCallback(() => {
    stopWebRecognition();
    const r = buildWebRecognition(true);
    if (!r) { updateStatus('notSupported'); setIsSupported(false); return; }
    recognitionRef.current = r;

    r.onstart = () => {
      recognitionRunningRef.current = true;
      updateStatus('listeningForWake');
    };

    r.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript: string = event.results[i][0].transcript;
        const isFinal: boolean = event.results[i].isFinal;
        const lower = transcript.toLowerCase();

        if (!isFinal) { setInterimText(transcript); continue; }
        setInterimText('');

        if (lower.includes('hey jarvis')) {
          updateStatus('wakeDetected');
          const cleaned = transcript.replace(/hey\s+jarvis[,.]?\s*/gi, '').trim();
          if (cleaned.length > 1) {
            updateStatus('processing');
            onResultRef.current(cleaned);
          } else {
            updateStatus('listeningForCommand');
          }
        } else {
          setStatus((prev) => {
            if (prev === 'listeningForCommand') {
              updateStatus('processing');
              onResultRef.current(transcript.trim());
              restartTimerRef.current = setTimeout(() => {
                if (modeRef.current === 'wakeWord') wakeListenRef.current();
              }, 3000);
            }
            return prev;
          });
        }
      }
    };

    r.onerror = (event: any) => {
      if (event.error === 'not-allowed') { updateStatus('noPermission'); setIsSupported(false); return; }
      // audio-capture: another audio source (e.g. video) briefly blocks the mic — just restart
      if (event.error === 'audio-capture' || event.error === 'no-speech' || event.error === 'aborted') return;
      updateStatus('error');
    };

    r.onend = () => {
      recognitionRunningRef.current = false;
      setInterimText('');
      if (modeRef.current === 'wakeWord') {
        // Fast restart — 100ms keeps the gap unnoticeable to the user
        restartTimerRef.current = setTimeout(() => {
          if (modeRef.current === 'wakeWord') wakeListenRef.current();
        }, 100);
      } else {
        updateStatus('idle');
      }
    };

    try { r.start(); } catch (e: any) {
      recognitionRunningRef.current = false;
      if (String(e).includes('not-allowed')) updateStatus('noPermission');
      // start() can throw if the page lost focus; schedule a retry
      if (modeRef.current === 'wakeWord') {
        restartTimerRef.current = setTimeout(() => {
          if (modeRef.current === 'wakeWord') wakeListenRef.current();
        }, 500);
      }
    }
  }, [buildWebRecognition, stopWebRecognition, updateStatus]);

  useEffect(() => { wakeListenRef.current = startWebWakeListening; }, [startWebWakeListening]);

  // Web manual one-shot listening
  const startWebManualListening = useCallback(() => {
    stopWebRecognition();
    const r = buildWebRecognition(false);
    if (!r) { updateStatus('notSupported'); setIsSupported(false); return; }
    recognitionRef.current = r;

    r.onstart = () => updateStatus('listeningForCommand');

    r.onresult = (event: any) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInterimText(interim);
      if (finalText) {
        setInterimText('');
        updateStatus('processing');
        onResultRef.current(finalText.trim());
      }
    };

    r.onerror = (event: any) => {
      setInterimText('');
      if (event.error === 'not-allowed') { updateStatus('noPermission'); setIsSupported(false); return; }
      if (event.error === 'no-speech') { updateStatus('idle'); return; }
      updateStatus('error');
    };

    r.onend = () => { setInterimText(''); updateStatus('idle'); };

    try { r.start(); } catch (e: any) {
      if (String(e).includes('not-allowed')) updateStatus('noPermission');
    }
  }, [buildWebRecognition, stopWebRecognition, updateStatus]);

  // ─── NATIVE: Capacitor @capacitor-community/speech-recognition ───────────

  const startNativeWakeListening = useCallback(async () => {
    const granted = await requestNativeMicPermission();
    if (!granted) { updateStatus('noPermission'); return; }

    updateStatus('listeningForWake');

    const handleTranscript = (text: string, isFinal: boolean) => {
      const lower = text.toLowerCase();
      setInterimText(text);

      if (lower.includes('hey jarvis')) {
        setInterimText('');
        updateStatus('wakeDetected');
        const cleaned = text.replace(/hey\s+jarvis[,.]?\s*/gi, '').trim();
        if (cleaned.length > 1) {
          updateStatus('processing');
          onResultRef.current(cleaned);
        } else {
          updateStatus('listeningForCommand');
        }
      } else if (isFinal) {
        setStatus((prev) => {
          if (prev === 'listeningForCommand') {
            setInterimText('');
            updateStatus('processing');
            onResultRef.current(text.trim());
            restartTimerRef.current = setTimeout(() => {
              if (modeRef.current === 'wakeWord') startNativeWakeListening();
            }, 3000);
          }
          return prev;
        });
      }
    };

    await startNativeListening({
      onPartial: (t) => handleTranscript(t, false),
      onFinal: (t) => handleTranscript(t, true),
      onError: (err) => {
        console.error('Native speech error:', err);
        updateStatus('error');
        // Auto-restart in wake mode
        if (modeRef.current === 'wakeWord') {
          restartTimerRef.current = setTimeout(() => {
            if (modeRef.current === 'wakeWord') startNativeWakeListening();
          }, 1000);
        }
      },
      onEnd: () => {
        setInterimText('');
        if (modeRef.current === 'wakeWord') {
          restartTimerRef.current = setTimeout(() => {
            if (modeRef.current === 'wakeWord') startNativeWakeListening();
          }, 400);
        } else {
          updateStatus('idle');
        }
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStatus]);

  const startNativeManualListening = useCallback(async () => {
    const granted = await requestNativeMicPermission();
    if (!granted) { updateStatus('noPermission'); return; }

    updateStatus('listeningForCommand');

    await startNativeListening({
      onPartial: (t) => setInterimText(t),
      onFinal: (t) => {
        setInterimText('');
        updateStatus('processing');
        onResultRef.current(t.replace(/^hey\s+jarvis[,.]?\s*/i, '').trim());
      },
      onError: () => updateStatus('error'),
      onEnd: () => { setInterimText(''); updateStatus('idle'); },
    });
  }, [updateStatus]);

  // ─── Public API ──────────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    modeRef.current = 'off';
    setMode('off');
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    // Remove focus listener
    focusCleanupRef.current?.();
    focusCleanupRef.current = null;
    if (isNative) {
      stopNativeListening();
    } else {
      stopWebRecognition();
    }
    updateStatus('idle');
  }, [isNative, stopWebRecognition, updateStatus]);

  const startWakeMode = useCallback(() => {
    if (!isNative) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setIsSupported(false); updateStatus('notSupported'); return; }
    }
    modeRef.current = 'wakeWord';
    setMode('wakeWord');
    if (isNative) {
      startNativeWakeListening();
    } else {
      startWebWakeListening();

      // ── Heartbeat: every 2s, if we're in wake mode but recognition died, revive it ──
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (modeRef.current === 'wakeWord' && !recognitionRunningRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          wakeListenRef.current();
        }
      }, 2000);

      // ── Focus listener: restart when the main page regains focus from an iframe ──
      // Remove any previous focus listener before adding a new one
      focusCleanupRef.current?.();
      const onFocus = () => {
        if (modeRef.current === 'wakeWord' && !recognitionRunningRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          wakeListenRef.current();
        }
      };
      window.addEventListener('focus', onFocus);
      focusCleanupRef.current = () => window.removeEventListener('focus', onFocus);
    }
  }, [isNative, startNativeWakeListening, startWebWakeListening, updateStatus]);

  const startManualMode = useCallback(() => {
    if (!isNative) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setIsSupported(false); updateStatus('notSupported'); return; }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    }
    modeRef.current = 'manual';
    setMode('manual');
    if (isNative) {
      startNativeManualListening();
    } else {
      startWebManualListening();
    }
  }, [isNative, startNativeManualListening, startWebManualListening, updateStatus]);

  const speak = useCallback(async (text: string, callback?: () => void) => {
    if (!text) { callback?.(); return; }
    updateStatus('speaking');

    // Stop recognition during TTS to prevent the mic from picking up
    // JARVIS's own voice and creating an echo / command loop.
    // IMPORTANT: null out onend BEFORE aborting — otherwise onend fires
    // and schedules a 100ms restart that races with the TTS playback.
    if (!isNative) {
      if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;   // prevent the restart timer in onend
        recognitionRef.current.onresult = null; // discard any in-flight results
        recognitionRef.current.onerror = null;
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
      recognitionRunningRef.current = false;
    }

    try {
      const res = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'onyx' }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      const cleanup = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        updateStatus(modeRef.current === 'wakeWord' ? 'listeningForWake' : 'idle');
        callback?.();
        // Restart recognition after TTS so the mic is live again
        if (!isNative && modeRef.current === 'wakeWord') {
          restartTimerRef.current = setTimeout(() => {
            if (modeRef.current === 'wakeWord') wakeListenRef.current();
          }, 300);
        }
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      updateStatus(modeRef.current === 'wakeWord' ? 'listeningForWake' : 'idle');
      // Restart recognition even on TTS error
      if (!isNative && modeRef.current === 'wakeWord') {
        restartTimerRef.current = setTimeout(() => {
          if (modeRef.current === 'wakeWord') wakeListenRef.current();
        }, 300);
      }
      callback?.();
    }
  }, [updateStatus, isNative]);

  // Support check on mount
  useEffect(() => {
    if (!isNative) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setIsSupported(false); updateStatus('notSupported'); }
    }
    return () => {
      modeRef.current = 'off';
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      focusCleanupRef.current?.();
      focusCleanupRef.current = null;
      if (isNative) stopNativeListening();
      else stopWebRecognition();
      if (audioRef.current) audioRef.current.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isListening = status === 'listeningForWake' || status === 'listeningForCommand' || status === 'wakeDetected';

  return {
    mode, status, isListening, isSupported, interimText,
    statusLabel: STATUS_LABELS[status],
    isNative,
    startWakeMode, startManualMode, stopListening,
    speak, updateStatus,
  };
}
