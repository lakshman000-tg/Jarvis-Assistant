import { motion } from 'framer-motion';
import { Cpu, Radio, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceStatus, VoiceMode } from '@/hooks/use-speech';
import { STATUS_LABELS } from '@/hooks/use-speech';

interface StatusPanelProps {
  voiceStatus: VoiceStatus;
  voiceMode: VoiceMode;
  lastCommand: string;
  lastResponse: string;
}

const Card = ({ title, icon, children, className }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(
    'bg-black/40 border border-jarvis-cyan/20 rounded-lg p-4 backdrop-blur-sm',
    className
  )}>
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="text-jarvis-cyan">{icon}</span>}
      <p className="text-[10px] font-display tracking-[0.3em] text-jarvis-cyan-dark uppercase">{title}</p>
    </div>
    {children}
  </div>
);

export function JarvisStatusPanel({ voiceStatus, voiceMode, lastCommand, lastResponse }: StatusPanelProps) {
  const isActive = voiceMode !== 'off';

  const dotColor =
    voiceStatus === 'error' || voiceStatus === 'noPermission' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
    : voiceStatus === 'wakeDetected' || voiceStatus === 'speaking' || voiceStatus === 'listeningForCommand' ? 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]'
    : isActive ? 'bg-jarvis-cyan shadow-[0_0_6px_rgba(0,255,255,0.8)]'
    : 'bg-gray-600';

  const textColor =
    voiceStatus === 'error' || voiceStatus === 'noPermission' ? 'text-red-400'
    : voiceStatus === 'wakeDetected' ? 'text-yellow-300'
    : voiceStatus === 'speaking' ? 'text-yellow-200'
    : isActive ? 'text-jarvis-cyan'
    : 'text-gray-500';

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Voice Status */}
      <Card title="Voice Engine" icon={<Radio className="w-4 h-4" />}>
        <div className="flex items-center gap-3">
          <motion.div
            animate={isActive ? { opacity: [1, 0.3, 1] } : { opacity: 0.5 }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className={cn('w-3 h-3 rounded-full flex-shrink-0', dotColor)}
          />
          <div className="min-w-0">
            <motion.p
              key={voiceStatus}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('text-sm font-display tracking-wider truncate', textColor)}
            >
              {STATUS_LABELS[voiceStatus]}
            </motion.p>
            <p className="text-[10px] text-gray-500 font-display tracking-widest mt-0.5">
              Mode: {voiceMode === 'wakeWord' ? '"Hey JARVIS" continuous' : voiceMode === 'manual' ? 'Manual tap' : 'Off'}
            </p>
          </div>
        </div>
      </Card>

      {/* Last Interaction */}
      <Card title="Last Interaction" icon={<Cpu className="w-4 h-4" />}>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-jarvis-cyan-dark font-display tracking-widest mb-1 flex items-center gap-1">
              <Mic className="w-3 h-3" /> YOU SAID
            </p>
            <p className={cn('text-sm font-body leading-relaxed', lastCommand ? 'text-white' : 'text-gray-600')}>
              {lastCommand || 'No commands yet'}
            </p>
          </div>
          <div className="h-px bg-jarvis-cyan/10" />
          <div>
            <p className="text-[10px] text-jarvis-cyan-dark font-display tracking-widest mb-1 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> JARVIS REPLIED
            </p>
            <p className={cn('text-sm font-body leading-relaxed', lastResponse ? 'text-jarvis-cyan' : 'text-gray-600')}>
              {lastResponse || 'Awaiting input...'}
            </p>
          </div>
        </div>
      </Card>

      {/* Tips */}
      <div className="bg-jarvis-cyan/5 border border-jarvis-cyan/15 rounded-lg p-3">
        <p className="text-[10px] text-jarvis-cyan-dark font-display tracking-[0.2em] uppercase mb-2">Quick Tips</p>
        <ul className="space-y-1.5 text-xs text-gray-400 font-body">
          <li>• Say <span className="text-jarvis-cyan">"Hey JARVIS"</span> to wake the assistant</li>
          <li>• Use the <span className="text-jarvis-cyan">text box</span> below to test any command</li>
          <li>• Check the <span className="text-jarvis-cyan">Commands tab</span> for all available commands</li>
          <li>• Works best in <span className="text-jarvis-cyan">Chrome / Edge</span> for voice recognition</li>
        </ul>
      </div>
    </div>
  );
}
