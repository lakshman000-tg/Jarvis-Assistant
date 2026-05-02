import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceStatusDotProps {
  running: boolean;
  screenActive: boolean;
  className?: string;
}

export function VoiceStatusDot({ running, screenActive, className }: VoiceStatusDotProps) {
  const color = !running ? 'bg-gray-500' : screenActive ? 'bg-green-400' : 'bg-red-500';
  const label = !running ? 'Stopped' : screenActive ? 'Foreground listening active' : 'Paused (screen off)';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center justify-center w-3 h-3">
        {running && screenActive && (
          <motion.div
            className="absolute w-3 h-3 rounded-full bg-green-400 opacity-60"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
        )}
        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', color)} />
      </div>
      <span className="text-[10px] font-display tracking-widest uppercase text-jarvis-cyan-dark">
        {label}
      </span>
    </div>
  );
}
