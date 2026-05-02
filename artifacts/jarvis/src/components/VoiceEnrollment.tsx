import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, CheckCircle, XCircle, Trash2, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  enrollSample,
  saveProfile,
  loadProfile,
  deleteProfile,
  recordAndExtract,
  computeSimilarity,
  type VoiceProfile,
} from '@/services/voiceProfileService';
import { cn } from '@/lib/utils';

const PHRASES = [
  '"Hey Jarvis, this is my voice"',
  '"Jarvis, recognize me"',
  '"Only respond to my voice"',
];

interface VoiceEnrollmentProps {
  onClose: () => void;
}

type Step = 'intro' | 'recording' | 'done' | 'test' | 'testResult';

export function VoiceEnrollment({ onClose }: VoiceEnrollmentProps) {
  const [step, setStep] = useState<Step>('intro');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [profile, setProfile] = useState<VoiceProfile | null>(loadProfile);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<'authorized' | 'rejected' | null>(null);
  const [error, setError] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDelete = () => {
    deleteProfile();
    setProfile(null);
    setStep('intro');
  };

  const handleRecord = async () => {
    setError('');
    setRecording(true);

    try {
      const existing = phraseIndex > 0 && profile ? profile.features : null;
      const newProfile = await enrollSample(existing);
      saveProfile(newProfile);
      setProfile(newProfile);

      if (phraseIndex < PHRASES.length - 1) {
        setPhraseIndex(i => i + 1);
      } else {
        setStep('done');
      }
    } catch (e: any) {
      setError(String(e?.message ?? 'Microphone not available'));
    } finally {
      setRecording(false);
    }
  };

  const handleTest = async () => {
    if (!profile) return;
    setStep('test');
    setTestScore(null);
    setTestResult(null);
    setRecording(true);
    try {
      const features = await recordAndExtract(3000);
      const score = computeSimilarity(profile.features, features);
      setTestScore(Math.round(score * 100));
      setTestResult(score >= 0.70 ? 'authorized' : 'rejected');
      setStep('testResult');
    } catch (e: any) {
      setError(String(e?.message ?? 'Test failed'));
      setStep('done');
    } finally {
      setRecording(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-jarvis-navy border border-jarvis-cyan/30 rounded-xl p-6 space-y-5 shadow-[0_0_40px_rgba(0,255,255,0.15)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-jarvis-cyan font-display tracking-widest uppercase text-sm">Voice Profile</h2>
          <button onClick={onClose} className="text-jarvis-cyan-dark hover:text-jarvis-cyan transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* INTRO */}
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {profile ? (
                <>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-display tracking-wider uppercase">Voice Registered</span>
                  </div>
                  <p className="text-jarvis-cyan-dark text-xs">
                    Enrolled: {new Date(profile.enrolledAt).toLocaleDateString()}
                  </p>
                  <div className="flex flex-col gap-2">
                    <button onClick={handleTest} className="jarvis-btn-primary text-xs py-2.5">Test My Voice</button>
                    <button onClick={() => { setPhraseIndex(0); setStep('recording'); }} className="jarvis-btn text-xs py-2.5 flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5" /> Re-enroll Voice
                    </button>
                    <button onClick={handleDelete} className="text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded text-xs py-2 px-3 flex items-center justify-center gap-2 transition-all">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Voice Profile
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-jarvis-cyan-dark text-xs leading-relaxed">
                    Register your voice so JARVIS only responds to you. Speak 3 short phrases clearly.
                  </p>
                  <button onClick={() => setStep('recording')} className="w-full jarvis-btn-primary text-xs py-2.5">
                    Register My Voice
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* RECORDING */}
          {step === 'recording' && (
            <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-jarvis-cyan-dark text-[10px] uppercase tracking-widest">
                  Phrase {phraseIndex + 1} of {PHRASES.length}
                </p>
                <p className="text-jarvis-cyan font-display text-sm leading-relaxed">{PHRASES[phraseIndex]}</p>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                {PHRASES.map((_, i) => (
                  <div key={i} className={cn('w-2 h-2 rounded-full transition-all',
                    i < phraseIndex ? 'bg-green-400' : i === phraseIndex ? 'bg-jarvis-cyan animate-pulse' : 'bg-jarvis-cyan/20'
                  )} />
                ))}
              </div>

              <button
                onClick={handleRecord}
                disabled={recording}
                className={cn(
                  'w-full flex items-center justify-center gap-3 py-4 rounded-xl border transition-all',
                  recording
                    ? 'border-red-500 bg-red-500/10 text-red-400 cursor-wait'
                    : 'border-jarvis-cyan/50 bg-jarvis-cyan/5 text-jarvis-cyan hover:bg-jarvis-cyan/10'
                )}
              >
                <Mic className={cn('w-5 h-5', recording && 'animate-pulse')} />
                <span className="font-display text-xs tracking-widest uppercase">
                  {recording ? 'Recording 4s...' : 'Tap & Speak'}
                </span>
              </button>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </motion.div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <p className="text-jarvis-cyan font-display tracking-wider uppercase text-sm">Voice Profile Saved</p>
              <p className="text-jarvis-cyan-dark text-xs">All phrases recorded successfully.</p>
              <button onClick={handleTest} className="w-full jarvis-btn-primary text-xs py-2.5">Test It Now</button>
              <button onClick={onClose} className="w-full jarvis-btn text-xs py-2.5">Done</button>
            </motion.div>
          )}

          {/* TEST (recording) */}
          {step === 'test' && (
            <motion.div key="test" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-center">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-16 h-16 rounded-full border-2 border-jarvis-cyan bg-jarvis-cyan/10 flex items-center justify-center mx-auto"
              >
                <Mic className="w-7 h-7 text-jarvis-cyan" />
              </motion.div>
              <p className="text-jarvis-cyan font-display tracking-wider uppercase text-sm">Speak Now</p>
              <p className="text-jarvis-cyan-dark text-xs">Say anything for 3 seconds...</p>
            </motion.div>
          )}

          {/* TEST RESULT */}
          {step === 'testResult' && testScore !== null && (
            <motion.div key="testResult" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-center">
              {testResult === 'authorized' ? (
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              )}
              <p className={cn('font-display tracking-wider uppercase text-sm',
                testResult === 'authorized' ? 'text-green-400' : 'text-red-400'
              )}>
                {testResult === 'authorized' ? 'Voice Recognized' : 'Unauthorized Voice'}
              </p>
              <div className="bg-black/40 rounded-lg p-3 space-y-1">
                <p className="text-jarvis-cyan-dark text-xs">Match Score</p>
                <p className="text-2xl font-display text-jarvis-cyan">{testScore}%</p>
              </div>
              <button onClick={() => setStep('intro')} className="w-full jarvis-btn text-xs py-2.5">Back</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disclaimer */}
        <div className="flex gap-2 bg-yellow-950/30 border border-yellow-500/20 rounded-lg p-3">
          <ShieldAlert className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-500/80 text-[10px] leading-relaxed">
            Demo-level only. Not a secure biometric system. For real speaker verification, native Android ML is required.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
