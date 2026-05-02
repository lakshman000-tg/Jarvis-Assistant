import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Music, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JarvisMediaPlayerProps {
  embedUrl: string;
  title: string;
  onClose: () => void;
}

export const JarvisMediaPlayer = forwardRef<HTMLIFrameElement, JarvisMediaPlayerProps>(
  ({ embedUrl, title, onClose }, ref) => {
    const [minimized, setMinimized] = useState(false);

    const isLoading = embedUrl === '__loading__';
    const isError   = embedUrl === '__error__';

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.2 }}
          className="w-full rounded-xl border border-jarvis-cyan/30 bg-black/80 backdrop-blur-md overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.15)]"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-jarvis-cyan/20 bg-jarvis-dark/60">
            <div className="flex items-center gap-2 min-w-0">
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 text-jarvis-cyan flex-shrink-0 animate-spin" />
                : isError
                  ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  : <Music className="w-3.5 h-3.5 text-jarvis-cyan flex-shrink-0 animate-pulse" />
              }
              <span className="text-jarvis-cyan text-[10px] font-display tracking-widest uppercase truncate">
                {isLoading ? `Searching: ${title}…` : title}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isLoading && !isError && (
                <button
                  onClick={() => setMinimized(m => !m)}
                  className="p-1 text-jarvis-cyan-dark hover:text-jarvis-cyan transition-colors"
                  title={minimized ? 'Expand' : 'Minimize'}
                >
                  {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-jarvis-cyan-dark hover:text-red-400 transition-colors"
                title="Close player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Player body */}
          <AnimatePresence>
            {!minimized && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: isLoading || isError ? 80 : 200 }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {isLoading && (
                  <div className="flex flex-col items-center justify-center h-20 gap-2">
                    <Loader2 className="w-6 h-6 text-jarvis-cyan animate-spin" />
                    <span className="text-jarvis-cyan/60 text-[10px] tracking-widest uppercase">Finding video…</span>
                  </div>
                )}
                {isError && (
                  <div className={cn('flex flex-col items-center justify-center h-20 gap-1')}>
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400/80 text-[10px] tracking-widest uppercase">Opened in browser instead</span>
                  </div>
                )}
                {!isLoading && !isError && (
                  <iframe
                    key={embedUrl}
                    ref={ref}
                    src={embedUrl}
                    className="w-full h-[200px]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={title}
                    style={{ border: 'none' }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    );
  }
);

JarvisMediaPlayer.displayName = 'JarvisMediaPlayer';
