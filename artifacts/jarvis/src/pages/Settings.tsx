import { useState, useEffect } from 'react';
import { ShieldAlert, Mic, Radio, Volume2, Zap, User, ChevronRight, Info } from 'lucide-react';
import {
  loadSettings, saveSettings, loadProfile,
  type VoiceSettings,
} from '@/services/voiceProfileService';
import {
  isListenerServiceRunning, startForegroundListener, stopForegroundListener,
} from '@/services/foregroundListenerService';
import { VoiceStatusDot } from '@/components/VoiceStatusDot';
import { cn } from '@/lib/utils';

interface SettingsProps {
  onAutoStart?: () => void;
  onOpenEnrollment?: () => void;
}

function Toggle({
  label, description, value, onChange, disabled,
}: {
  label: string; description?: string; value: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-all text-left',
        value ? 'border-jarvis-cyan/40 bg-jarvis-cyan/5' : 'border-jarvis-cyan/10 bg-black/20',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <div className="min-w-0">
        <p className="text-jarvis-cyan text-xs font-display tracking-wider uppercase">{label}</p>
        {description && <p className="text-jarvis-cyan-dark text-[10px] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className={cn(
        'w-10 h-5 rounded-full flex-shrink-0 relative transition-colors',
        value ? 'bg-jarvis-cyan' : 'bg-jarvis-cyan/20'
      )}>
        <div className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
          value ? 'left-5' : 'left-0.5'
        )} />
      </div>
    </button>
  );
}

function SensitivitySlider({
  value, onChange,
}: { value: VoiceSettings['sensitivity']; onChange: (v: VoiceSettings['sensitivity']) => void }) {
  const opts: VoiceSettings['sensitivity'][] = ['low', 'medium', 'high'];
  return (
    <div className="px-4 py-3 rounded-lg border border-jarvis-cyan/10 bg-black/20 space-y-2">
      <p className="text-jarvis-cyan text-xs font-display tracking-wider uppercase">Voice Match Sensitivity</p>
      <p className="text-jarvis-cyan-dark text-[10px]">Higher = stricter. Lower = more forgiving.</p>
      <div className="flex gap-2 mt-2">
        {opts.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 py-1.5 rounded text-[10px] font-display tracking-widest uppercase border transition-all',
              value === opt
                ? 'border-jarvis-cyan bg-jarvis-cyan/10 text-jarvis-cyan'
                : 'border-jarvis-cyan/10 text-jarvis-cyan-dark hover:border-jarvis-cyan/30'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Settings({ onAutoStart, onOpenEnrollment }: SettingsProps) {
  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [serviceRunning, setServiceRunning] = useState(isListenerServiceRunning);
  const [screenActive, setScreenActive] = useState(document.visibilityState === 'visible');
  const [voiceProfileExists, setVoiceProfileExists] = useState(() => !!loadProfile());

  useEffect(() => {
    const handleVis = () => setScreenActive(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  // Refresh profile status whenever the settings tab is shown
  useEffect(() => {
    setVoiceProfileExists(!!loadProfile());
  });

  const update = (patch: Partial<VoiceSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const handleBackgroundToggle = async (val: boolean) => {
    update({ backgroundListening: val });
    if (val) {
      await startForegroundListener();
      setServiceRunning(true);
    } else {
      await stopForegroundListener();
      setServiceRunning(false);
    }
  };

  const handleAutoStartToggle = (val: boolean) => {
    update({ autoStart: val });
    if (val && onAutoStart) onAutoStart();
  };

  return (
    <>

      <div className="p-4 space-y-5">

        {/* ── Service Status ── */}
        <section className="space-y-2">
          <SectionHeader icon={<Radio className="w-3.5 h-3.5" />} label="Listener Status" />
          <div className="px-4 py-3 rounded-lg border border-jarvis-cyan/10 bg-black/20">
            <VoiceStatusDot running={serviceRunning} screenActive={screenActive} />
            <p className="text-jarvis-cyan-dark text-[10px] mt-2 leading-relaxed">
              {serviceRunning
                ? screenActive
                  ? 'JARVIS is actively listening in the foreground.'
                  : 'Service running — paused because screen is off.'
                : 'Foreground listener is off. Enable below.'}
            </p>
          </div>
        </section>

        {/* ── Listening ── */}
        <section className="space-y-2">
          <SectionHeader icon={<Mic className="w-3.5 h-3.5" />} label="Listening" />
          <Toggle
            label="Background Listening"
            description="Keep JARVIS listening when app is minimized (screen must be ON)"
            value={settings.backgroundListening}
            onChange={handleBackgroundToggle}
          />
          <Toggle
            label="Auto-start on Open"
            description="Automatically activate Hey JARVIS mode when app launches"
            value={settings.autoStart}
            onChange={handleAutoStartToggle}
          />
        </section>

        {/* ── Voice ── */}
        <section className="space-y-2">
          <SectionHeader icon={<Volume2 className="w-3.5 h-3.5" />} label="Voice" />
          <Toggle
            label="Wake Sound"
            description="Play activation chime when Hey JARVIS is detected"
            value={settings.wakeSound}
            onChange={val => update({ wakeSound: val })}
          />
        </section>

        {/* ── Owner Voice Profile ── */}
        <section className="space-y-2">
          <SectionHeader icon={<User className="w-3.5 h-3.5" />} label="Owner Voice Profile" />
          <Toggle
            label="Owner Voice Only Mode"
            description="JARVIS ignores commands from unrecognized voices"
            value={settings.ownerOnlyMode}
            onChange={val => update({ ownerOnlyMode: val })}
          />
          {settings.ownerOnlyMode && (
            <SensitivitySlider value={settings.sensitivity} onChange={val => update({ sensitivity: val })} />
          )}
          <button
            onClick={() => onOpenEnrollment?.()}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-jarvis-cyan/10 bg-black/20 hover:border-jarvis-cyan/30 transition-all"
          >
            <div>
              <p className="text-jarvis-cyan text-xs font-display tracking-wider uppercase">
                {voiceProfileExists ? 'Voice Profile Registered ✓' : 'Register My Voice'}
              </p>
              <p className="text-jarvis-cyan-dark text-[10px] mt-0.5">
                {voiceProfileExists ? 'Tap to test or re-enroll' : 'Speak 3 phrases to enroll'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-jarvis-cyan-dark" />
          </button>
        </section>

        {/* ── Limitations notice ── */}
        <section className="space-y-2">
          <SectionHeader icon={<Info className="w-3.5 h-3.5" />} label="Android Limitations" />
          <div className="flex gap-3 bg-yellow-950/30 border border-yellow-500/20 rounded-lg p-3">
            <ShieldAlert className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-yellow-400 text-[10px] font-display tracking-wider uppercase">Important</p>
              <p className="text-yellow-500/80 text-[10px] leading-relaxed">
                Due to Android security restrictions, JARVIS cannot listen when the screen is fully off
                or the phone is locked — unlike Google Assistant which uses dedicated hardware.
                Background listening only works while the screen remains ON.
              </p>
            </div>
          </div>
          <div className="flex gap-3 bg-blue-950/30 border border-blue-500/20 rounded-lg p-3">
            <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-400/80 text-[10px] leading-relaxed">
              Local voice recognition is demo-level and not a secure biometric system.
              For real speaker verification, native Android ML (e.g. ONNX / TFLite) is required.
            </p>
          </div>
        </section>

      </div>
    </>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-jarvis-cyan-dark">{icon}</span>
      <p className="text-[10px] font-display tracking-[0.3em] text-jarvis-cyan-dark uppercase">{label}</p>
    </div>
  );
}
