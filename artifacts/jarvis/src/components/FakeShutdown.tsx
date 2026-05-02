import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FakeShutdownProps {
  active: boolean;
  onDismiss: () => void;
}

export function FakeShutdown({ active, onDismiss }: FakeShutdownProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) { setProgress(0); return; }
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center mx-auto mb-8">
              <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-600" />
            </div>
            <p className="text-gray-400 text-sm tracking-[0.3em] uppercase mb-6">Shutting down...</p>
            <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gray-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress >= 100 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-600 text-xs mt-6 tracking-widest"
              >
                Tap to cancel
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
