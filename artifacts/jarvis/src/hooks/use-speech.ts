import { useState, useEffect, useCallback, useRef } from 'react';

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

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<VoiceMode>('off');
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  const wakeListenRef = useRef<() => void>(() => {});

  // Keep callback ref up to date without triggering re-renders
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  const updateStatus = useCallback((s: VoiceStatus) => setStatus(s), []);

  const stopAllRecognition = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setInterimText('');
  }, []);

  const buildRecognition = useCallback((continuous: boolean) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = continuous;
    r.interimResults = true;
    r.lang = 'en-US';
    r.maxAlternatives = 1;
    return r;
  }, []);

  // Wake-word continuous listening — uses ref so it can call itself recursively
  const startWakeWordListening = useCallback(() => {
    stopAllRecognition();
    const r = buildRecognition(true);
    if (!r) { updateStatus('notSupported'); setIsSupported(false); return; }

    recognitionRef.current = r;

    r.onstart = () => updateStatus('listeningForWake');

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
            // Need follow-up utterance
            updateStatus('listeningForCommand');
          }
        } else if (modeRef.current === 'wakeWord') {
          // Check if we're in follow-up command mode
          setStatus((prev) => {
            if (prev === 'listeningForCommand') {
              updateStatus('processing');
              onResultRef.current(transcript.trim());
              // Return to wake mode after a short delay
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
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      updateStatus('error');
    };

    r.onend = () => {
      setInterimText('');
      // Auto-restart if still in wake-word mode
      if (modeRef.current === 'wakeWord') {
        restartTimerRef.current = setTimeout(() => {
          if (modeRef.current === 'wakeWord') wakeListenRef.current();
        }, 400);
      } else {
        updateStatus('idle');
      }
    };

    try {
      r.start();
    } catch (e: any) {
      if (String(e).includes('not-allowed')) updateStatus('noPermission');
    }
  }, [buildRecognition, stopAllRecognition, updateStatus]);

  // Store latest ref so recursive calls always use the latest version
  useEffect(() => { wakeListenRef.current = startWakeWordListening; }, [startWakeWordListening]);

  const startManualListening = useCallback(() => {
    stopAllRecognition();
    const r = buildRecognition(false);
    if (!r) { updateStatus('notSupported'); setIsSupported(false); return; }

    recognitionRef.current = r;

    r.onstart = () => updateStatus('listeningForCommand');

    r.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInterimText(interim);
      if (finalTranscript) {
        setInterimText('');
        updateStatus('processing');
        onResultRef.current(finalTranscript.trim());
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
  }, [buildRecognition, stopAllRecognition, updateStatus]);

  const stopListening = useCallback(() => {
    modeRef.current = 'off';
    setMode('off');
    stopAllRecognition();
    updateStatus('idle');
  }, [stopAllRecognition, updateStatus]);

  const startWakeMode = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); updateStatus('notSupported'); return; }
    modeRef.current = 'wakeWord';
    setMode('wakeWord');
    startWakeWordListening();
  }, [startWakeWordListening, updateStatus]);

  const startManualMode = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); updateStatus('notSupported'); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    modeRef.current = 'manual';
    setMode('manual');
    startManualListening();
  }, [startManualListening, updateStatus]);

  const speak = useCallback(async (text: string, callback?: () => void) => {
    if (!text) { callback?.(); return; }
    updateStatus('speaking');
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
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      updateStatus(modeRef.current === 'wakeWord' ? 'listeningForWake' : 'idle');
      callback?.();
    }
  }, [updateStatus]);

  // Check support on mount; cleanup on unmount
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); updateStatus('notSupported'); }
    return () => {
      modeRef.current = 'off';
      stopAllRecognition();
      if (audioRef.current) audioRef.current.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isListening = status === 'listeningForWake' || status === 'listeningForCommand' || status === 'wakeDetected';

  return {
    mode,
    status,
    isListening,
    isSupported,
    interimText,
    statusLabel: STATUS_LABELS[status],
    startWakeMode,
    startManualMode,
    stopListening,
    speak,
    updateStatus,
  };
}
