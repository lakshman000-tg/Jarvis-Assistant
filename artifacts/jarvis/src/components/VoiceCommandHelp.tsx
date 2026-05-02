import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal } from 'lucide-react';
import { COMMAND_HELP_LIST } from '@/services/commandProcessor';

interface VoiceCommandHelpProps {
  open: boolean;
  onClose: () => void;
}

export function VoiceCommandHelp({ open, onClose }: VoiceCommandHelpProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-jarvis-navy border border-jarvis-cyan/40 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_40px_rgba(0,255,255,0.2)] hud-clip"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-jarvis-cyan/20">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-jarvis-cyan" />
                <h2 className="font-display tracking-[0.2em] text-jarvis-cyan text-sm uppercase">
                  Voice Command Reference
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-jarvis-cyan-dark hover:text-jarvis-cyan transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4 space-y-5">
              {COMMAND_HELP_LIST.map((group) => (
                <div key={group.group}>
                  <p className="text-[10px] font-display tracking-[0.3em] text-jarvis-cyan-dark uppercase mb-2 pl-1 border-l-2 border-jarvis-cyan/50 pl-3">
                    {group.group}
                  </p>
                  <div className="space-y-1.5">
                    {group.commands.map((c) => (
                      <div key={c.cmd} className="flex items-start gap-3 bg-black/30 border border-jarvis-cyan/10 rounded px-3 py-2">
                        <code className="text-jarvis-cyan text-xs font-display flex-1 leading-relaxed break-all">
                          {c.cmd}
                        </code>
                        <span className="text-gray-500 text-xs font-body flex-shrink-0 text-right max-w-[140px] leading-relaxed">
                          {c.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Tip */}
              <div className="bg-jarvis-cyan/5 border border-jarvis-cyan/20 rounded p-3 text-xs text-jarvis-cyan-dark font-body leading-relaxed">
                💡 <strong className="text-jarvis-cyan">Tip:</strong> Enable "Hey JARVIS" mode to use wake-word detection hands-free. Or click the mic button for one-shot manual listening. You can also type any command in the test bar below the chat.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
