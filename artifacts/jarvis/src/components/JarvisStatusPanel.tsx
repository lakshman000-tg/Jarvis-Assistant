import { motion } from 'framer-motion';
import { MapPin, Shield, ShieldOff, Cpu, Smartphone, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceStatus, VoiceMode } from '@/hooks/use-speech';
import { STATUS_LABELS } from '@/hooks/use-speech';

interface DeviceInfo {
  browser: string;
  os: string;
  lastSeen: string;
}

interface StatusPanelProps {
  voiceStatus: VoiceStatus;
  voiceMode: VoiceMode;
  lastCommand: string;
  lastResponse: string;
  theftEnabled: boolean;
  location: string;
  deviceInfo: DeviceInfo;
}

const StatusDot = ({ active, color = 'cyan' }: { active: boolean; color?: 'cyan' | 'red' | 'green' | 'yellow' }) => {
  const colors = {
    cyan: 'bg-jarvis-cyan shadow-[0_0_8px_rgba(0,255,255,0.8)]',
    red: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
    green: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]',
    yellow: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]',
  };
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full mr-2 flex-shrink-0',
      active ? colors[color] : 'bg-gray-600'
    )} />
  );
};

const Card = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={cn(
    'bg-black/40 border border-jarvis-cyan/20 rounded-lg p-4 backdrop-blur-sm',
    'shadow-[inset_0_0_10px_rgba(0,255,255,0.03)]',
    className
  )}>
    <p className="text-[10px] font-display tracking-[0.3em] text-jarvis-cyan-dark uppercase mb-3">{title}</p>
    {children}
  </div>
);

export function JarvisStatusPanel({
  voiceStatus,
  voiceMode,
  lastCommand,
  lastResponse,
  theftEnabled,
  location,
  deviceInfo,
}: StatusPanelProps) {
  const isActive = voiceMode !== 'off';
  const statusColor: 'cyan' | 'red' | 'green' | 'yellow' =
    voiceStatus === 'error' || voiceStatus === 'noPermission' ? 'red'
    : voiceStatus === 'speaking' ? 'yellow'
    : voiceStatus === 'wakeDetected' || voiceStatus === 'listeningForCommand' ? 'yellow'
    : isActive ? 'cyan'
    : 'cyan';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
      {/* Voice Status */}
      <Card title="Voice Engine">
        <div className="flex items-center gap-2 mb-2">
          <StatusDot active={isActive} color={statusColor} />
          <motion.span
            key={voiceStatus}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-sm font-display tracking-wider',
              voiceStatus === 'error' || voiceStatus === 'noPermission' ? 'text-red-400' :
              voiceStatus === 'wakeDetected' ? 'text-yellow-300' :
              voiceStatus === 'speaking' ? 'text-yellow-200' :
              isActive ? 'text-jarvis-cyan' : 'text-gray-500'
            )}
          >
            {STATUS_LABELS[voiceStatus]}
          </motion.span>
        </div>
        <p className="text-[10px] text-gray-500 font-display tracking-widest uppercase">
          Mode: {voiceMode === 'wakeWord' ? '"Hey JARVIS" active' : voiceMode === 'manual' ? 'Manual' : 'Off'}
        </p>
      </Card>

      {/* Theft Mode */}
      <Card title="Theft Protection">
        <div className="flex items-center gap-3">
          {theftEnabled ? (
            <Shield className="w-6 h-6 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
          ) : (
            <ShieldOff className="w-6 h-6 text-gray-500" />
          )}
          <div>
            <p className={cn(
              'text-sm font-display tracking-wider',
              theftEnabled ? 'text-red-400' : 'text-gray-400'
            )}>
              {theftEnabled ? 'ENABLED' : 'DISABLED'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Say "enable/disable theft mode"
            </p>
          </div>
        </div>
      </Card>

      {/* Location */}
      <Card title="Location">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-jarvis-cyan mt-0.5 flex-shrink-0" />
          <p className="text-xs text-jarvis-cyan-dark font-body leading-relaxed break-words">
            {location || 'Not updated. Say "update location".'}
          </p>
        </div>
      </Card>

      {/* Active Device */}
      <Card title="Active Device">
        <div className="flex items-start gap-2">
          <Smartphone className="w-4 h-4 text-jarvis-cyan mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-jarvis-cyan font-body">{deviceInfo.browser}</p>
            <p className="text-[10px] text-gray-500 font-display tracking-wider">{deviceInfo.os}</p>
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-gray-600" />
              <span className="text-[10px] text-gray-600">{deviceInfo.lastSeen}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Last Command */}
      <Card title="Last Command" className="sm:col-span-2">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-jarvis-cyan-dark mb-1 font-display tracking-widest">YOU SAID</p>
            <p className={cn('text-sm font-body truncate', lastCommand ? 'text-white' : 'text-gray-600')}>
              {lastCommand || 'No commands yet'}
            </p>
          </div>
          <div className="flex-shrink-0 w-px bg-jarvis-cyan/20" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-jarvis-cyan-dark mb-1 font-display tracking-widest">
              <Cpu className="inline w-3 h-3 mr-1" />JARVIS REPLIED
            </p>
            <p className={cn('text-sm font-body line-clamp-2', lastResponse ? 'text-jarvis-cyan' : 'text-gray-600')}>
              {lastResponse || 'Awaiting input'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
