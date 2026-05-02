import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface EmergencyAlertProps {
  active: boolean;
  message: string;
  onDismiss: () => void;
}

export function EmergencyAlert({ active, message, onDismiss }: EmergencyAlertProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            className="w-full max-w-md bg-red-950 border-2 border-red-500 rounded-lg p-6 shadow-[0_0_40px_rgba(239,68,68,0.5)]"
          >
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                <AlertTriangle className="w-10 h-10 text-red-400 flex-shrink-0" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-display text-red-300 tracking-[0.2em] text-sm uppercase mb-2">
                  Emergency Alert Triggered
                </h3>
                <p className="text-red-200 text-sm font-body leading-relaxed">{message}</p>
                <p className="text-red-400/60 text-xs mt-2 font-body">Alert copied to clipboard.</p>
              </div>
              <button
                onClick={onDismiss}
                className="text-red-400 hover:text-red-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={onDismiss}
              className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white font-display text-xs tracking-[0.2em] uppercase py-3 rounded transition-colors"
            >
              Dismiss Alert
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
