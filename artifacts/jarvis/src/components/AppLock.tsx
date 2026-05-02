import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock } from 'lucide-react';

interface AppLockProps {
  locked: boolean;
  onUnlock: () => void;
}

export function AppLock({ locked, onUnlock }: AppLockProps) {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);
  const PIN = '1234';

  const tryUnlock = () => {
    if (input === PIN) {
      setInput('');
      onUnlock();
    } else {
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <AnimatePresence>
      {locked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-jarvis-navy flex flex-col items-center justify-center"
        >
          <div className="scanlines" />
          <motion.div
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6 px-8 w-full max-w-xs"
          >
            <Lock className="w-12 h-12 text-jarvis-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
            <h2 className="font-display text-jarvis-cyan tracking-[0.3em] text-lg uppercase">App Locked</h2>
            <p className="text-jarvis-cyan-dark text-xs font-display tracking-widest text-center">
              Enter PIN to unlock
            </p>

            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
              maxLength={4}
              autoFocus
              placeholder="Enter PIN (default: 1234)"
              className="w-full bg-black/50 border-b-2 border-jarvis-cyan/40 text-jarvis-cyan text-center font-display py-3 tracking-[0.5em] text-lg focus:outline-none focus:border-jarvis-cyan placeholder:text-jarvis-cyan-dark/40 placeholder:text-sm placeholder:tracking-normal"
            />

            <button
              onClick={tryUnlock}
              className="w-full bg-jarvis-cyan/10 border border-jarvis-cyan/50 text-jarvis-cyan font-display text-xs tracking-[0.3em] uppercase py-3 hover:bg-jarvis-cyan/20 transition-colors flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" /> Unlock
            </button>

            <p className="text-gray-600 text-[10px] font-display tracking-widest">
              Default PIN: 1234
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
