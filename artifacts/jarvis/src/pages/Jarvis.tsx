import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Terminal, HelpCircle, Radio, Power, Settings as SettingsIcon } from "lucide-react";
import { useCreateOpenaiConversation } from "@workspace/api-client-react";
import { useJarvisChat } from "@/hooks/use-jarvis-chat";
import { useSpeech } from "@/hooks/use-speech";
import { JarvisHeader } from "@/components/JarvisHeader";
import { JarvisMic } from "@/components/JarvisMic";
import { JarvisMessage } from "@/components/JarvisMessage";
import { JarvisStatusPanel } from "@/components/JarvisStatusPanel";
import { VoiceCommandHelp } from "@/components/VoiceCommandHelp";
import { AppLock } from "@/components/AppLock";
import { VoiceDiagnosticBanner } from "@/components/VoiceDiagnosticBanner";
import { VoiceStatusDot } from "@/components/VoiceStatusDot";
import { Settings } from "@/pages/Settings";
import { processCommand } from "@/services/commandProcessor";
import {
  loadSettings,
  loadProfile,
  verifyVoice,
} from "@/services/voiceProfileService";
import {
  startForegroundListener,
  stopForegroundListener,
  isListenerServiceRunning,
} from "@/services/foregroundListenerService";
import { cn } from "@/lib/utils";

type AppView = "chat" | "dashboard" | "commands" | "settings";

const TABS: { id: AppView; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "dashboard", label: "Dashboard" },
  { id: "commands", label: "Commands" },
  { id: "settings", label: "Settings" },
];

export function Jarvis() {
  const [convId, setConvId] = useState<number | null>(null);
  const [textInput, setTextInput] = useState("");
  const [view, setView] = useState<AppView>("chat");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [isSystemOnline, setIsSystemOnline] = useState(false);

  const [lastCommand, setLastCommand] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [appLocked, setAppLocked] = useState(false);

  const [serviceRunning, setServiceRunning] = useState(isListenerServiceRunning);
  const [screenActive, setScreenActive] = useState(document.visibilityState === "visible");

  const processInputRef = useRef<(text: string) => void>(() => {});

  const { mutateAsync: createConv } = useCreateOpenaiConversation();
  const { messages, addMessage, askJarvis, isAnalyzing } = useJarvisChat(convId);

  const onSpeechResult = useCallback((text: string) => {
    processInputRef.current(text);
  }, []);

  const {
    mode, status, isListening, isSupported,
    interimText, statusLabel,
    startWakeMode, startManualMode, stopListening,
    speak, updateStatus,
  } = useSpeech(onSpeechResult);

  // Screen visibility tracking
  useEffect(() => {
    const handler = () => setScreenActive(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const respondWith = useCallback((response: string, originalInput: string) => {
    setLastCommand(originalInput);
    setLastResponse(response);
    addMessage("user", originalInput);
    addMessage("assistant", response);
    speak(response);
  }, [addMessage, speak]);

  // ── Voice profile guard ─────────────────────────────────────────────────
  const guardVoiceProfile = useCallback(async (rawText: string, proceed: () => void) => {
    const settings = loadSettings();
    if (!settings.ownerOnlyMode || !loadProfile()) {
      proceed();
      return;
    }
    try {
      updateStatus("processing");
      const result = await verifyVoice(settings);
      if (result.authorized) {
        speak("Voice recognized.");
        setTimeout(proceed, 800);
      } else {
        respondWith("Unauthorized voice detected. Command rejected.", rawText);
      }
    } catch {
      proceed(); // fail open on error
    }
  }, [respondWith, speak, updateStatus]);

  const processInput = useCallback((rawText: string) => {
    if (!rawText.trim() || !isSystemOnline) return;

    const execute = () => {
      const result = processCommand(rawText, {
        navigate: (v) => {
          if (v === "settings") setView("settings");
          else setView(v as AppView);
        },
        lockApp: () => setAppLocked(true),
        logout: () => {
          const msg = "Session terminated. Goodbye!";
          addMessage("user", rawText);
          addMessage("assistant", msg);
          setLastCommand(rawText);
          setLastResponse(msg);
          speak(msg);
          setTimeout(() => { setIsSystemOnline(false); setConvId(null); }, 2500);
        },
        showHelp: () => setShowHelp(true),
      });

      if (result.handled) {
        result.action();
        if (!rawText.toLowerCase().replace(/^hey\s+jarvis[,.]?\s*/i, '').match(/\blog\s*(out|off)\b|\bsign\s*out\b/)) {
          respondWith(result.response, rawText);
        }
      } else {
        updateStatus("processing");
        setLastCommand(rawText);
        askJarvis(rawText.replace(/^hey\s+jarvis[,.]?\s*/i, '').trim(), (aiResponse) => {
          setLastResponse(aiResponse);
          speak(aiResponse);
        });
      }
    };

    guardVoiceProfile(rawText, execute);
  }, [isSystemOnline, respondWith, askJarvis, speak, addMessage, updateStatus, guardVoiceProfile]);

  useEffect(() => { processInputRef.current = processInput; }, [processInput]);

  // Init conversation + auto-start if configured
  useEffect(() => {
    createConv({ data: { title: "JARVIS Session" } })
      .then((res) => {
        setConvId(res.id);
        setIsSystemOnline(true);
        addMessage("system", 'System online. JARVIS is ready. Say "Hey JARVIS" or type a command.');
        const s = loadSettings();
        if (s.autoStart) setTimeout(() => startWakeMode(), 500);
        if (s.backgroundListening) {
          startForegroundListener().then(() => setServiceRunning(true));
        }
      })
      .catch(() => addMessage("system", "ERROR: Failed to connect to JARVIS core."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current && view === "chat") {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, view]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) { processInput(textInput); setTextInput(""); }
  };

  const handleWakeToggle = async () => {
    if (mode === "wakeWord") {
      stopListening();
      if (serviceRunning) { await stopForegroundListener(); setServiceRunning(false); }
    } else {
      startWakeMode();
      const s = loadSettings();
      if (s.backgroundListening) { await startForegroundListener(); setServiceRunning(true); }
    }
  };

  const statusColorClass =
    status === "error" || status === "noPermission"
      ? "border-red-500/40 bg-red-950/30 text-red-400"
      : status === "wakeDetected" || status === "speaking" || status === "listeningForCommand"
      ? "border-yellow-500/40 bg-yellow-950/30 text-yellow-300"
      : mode !== "off"
      ? "border-jarvis-cyan/30 bg-jarvis-cyan/5 text-jarvis-cyan"
      : "border-jarvis-cyan/10 bg-black/20 text-jarvis-cyan-dark";

  const dotColor =
    status === "error" || status === "noPermission" ? "bg-red-500"
    : status === "wakeDetected" || status === "speaking" || status === "listeningForCommand" ? "bg-yellow-400"
    : mode !== "off" ? "bg-jarvis-cyan"
    : "bg-gray-600";

  return (
    <>
      <AppLock locked={appLocked} onUnlock={() => setAppLocked(false)} />
      <VoiceCommandHelp open={showHelp} onClose={() => setShowHelp(false)} />

      <div className="min-h-screen w-full relative flex flex-col bg-jarvis-navy overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-screen">
          <img src={`${import.meta.env.BASE_URL}images/jarvis-core.png`} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="scanlines" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-jarvis-navy/80 to-jarvis-navy pointer-events-none z-0" />

        <div className="relative z-10 flex flex-col h-screen max-w-4xl mx-auto w-full px-3 sm:px-6">
          <JarvisHeader />

          <VoiceDiagnosticBanner permissionDenied={status === "noPermission"} />

          {/* Status bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "flex items-center justify-between px-3 py-2 mb-1 rounded border text-xs font-display tracking-widest uppercase transition-colors",
              statusColorClass
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <motion.div
                animate={mode !== "off" ? { opacity: [1, 0.3, 1] } : { opacity: 0.5 }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)}
              />
              <span className="truncate">{statusLabel}</span>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="hover:opacity-80 transition-opacity flex-shrink-0 ml-2"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Foreground service status dot */}
          {serviceRunning && (
            <div className="mb-1 px-1">
              <VoiceStatusDot running={serviceRunning} screenActive={screenActive} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0 mb-3 border-b border-jarvis-cyan/10">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-display tracking-[0.15em] uppercase transition-all border-b-2 -mb-px flex items-center justify-center gap-1",
                  view === tab.id
                    ? "border-jarvis-cyan text-jarvis-cyan"
                    : "border-transparent text-jarvis-cyan-dark hover:text-jarvis-cyan"
                )}
              >
                {tab.id === "settings" && <SettingsIcon className="w-3 h-3" />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">

              {/* CHAT */}
              {view === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full flex flex-col">
                  <div
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 rounded-xl border border-jarvis-cyan/20 bg-black/40 backdrop-blur-md hud-clip shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]"
                  >
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => <JarvisMessage key={msg.id} {...msg} />)}
                      {isAnalyzing && <JarvisMessage key="analyzing" role="assistant" content="JARVIS is analyzing..." isStreaming />}
                      {interimText && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-end my-2">
                          <div className="text-jarvis-cyan-dark font-body italic text-sm">{interimText}...</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* DASHBOARD */}
              {view === "dashboard" && (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full overflow-y-auto rounded-xl border border-jarvis-cyan/20 bg-black/40 backdrop-blur-md">
                  <JarvisStatusPanel voiceStatus={status} voiceMode={mode} lastCommand={lastCommand} lastResponse={lastResponse} />
                </motion.div>
              )}

              {/* COMMANDS */}
              {view === "commands" && (
                <motion.div key="commands" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full overflow-y-auto rounded-xl border border-jarvis-cyan/20 bg-black/40 backdrop-blur-md p-4 space-y-4">
                  <p className="text-[10px] font-display tracking-[0.3em] text-jarvis-cyan-dark uppercase">Quick Action Buttons</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Open YouTube 🚀", cmd: "open youtube" },
                      { label: "Open WhatsApp 💬", cmd: "open whatsapp" },
                      { label: "Play Music 🎵", cmd: "play music" },
                      { label: "Telugu Songs 🎶", cmd: "play telugu songs" },
                      { label: "What Time Is It ⏰", cmd: "what time is it" },
                      { label: "Today's Date 📅", cmd: "what is today's date" },
                      { label: "Open Gmail 📧", cmd: "open gmail" },
                      { label: "Google Maps 🗺️", cmd: "open maps" },
                      { label: "Lock App 🔐", cmd: "lock app" },
                      { label: "Help 📖", cmd: "help" },
                      { label: "Open Home 🏠", cmd: "open home" },
                      { label: "Settings ⚙️", cmd: "open settings" },
                    ].map(({ label, cmd }) => (
                      <button
                        key={cmd}
                        onClick={() => processInput(cmd)}
                        disabled={!isSystemOnline}
                        className="bg-jarvis-dark/60 border border-jarvis-cyan/20 text-jarvis-cyan text-xs font-display tracking-wider uppercase py-3 px-3 rounded hover:bg-jarvis-cyan/10 hover:border-jarvis-cyan/50 transition-all disabled:opacity-40 text-left leading-relaxed"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowHelp(true)} className="w-full bg-jarvis-cyan/5 border border-jarvis-cyan/30 text-jarvis-cyan text-xs font-display tracking-[0.2em] uppercase py-3 rounded hover:bg-jarvis-cyan/10 transition-all flex items-center justify-center gap-2">
                    <HelpCircle className="w-4 h-4" /> View All Voice Commands
                  </button>
                </motion.div>
              )}

              {/* SETTINGS */}
              {view === "settings" && (
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full overflow-y-auto rounded-xl border border-jarvis-cyan/20 bg-black/40 backdrop-blur-md">
                  <Settings onAutoStart={startWakeMode} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Controls — all in one row with the text input */}
          <div className="mt-3 mb-4 space-y-1.5">
            <form onSubmit={handleSubmitText} className="w-full flex items-center gap-1.5 bg-jarvis-dark/80 border border-jarvis-cyan/20 rounded-xl px-2 py-1.5 focus-within:border-jarvis-cyan/50 transition-colors">
              {/* Hey JARVIS toggle */}
              <button
                type="button"
                onClick={handleWakeToggle}
                disabled={!isSupported || !isSystemOnline}
                title={mode === "wakeWord" ? "Hey JARVIS: ON — click to stop" : "Activate Hey JARVIS wake word"}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-[10px] font-display tracking-widest uppercase border rounded-lg transition-all flex-shrink-0",
                  mode === "wakeWord"
                    ? "border-jarvis-cyan bg-jarvis-cyan/10 text-jarvis-cyan shadow-[0_0_10px_rgba(0,255,255,0.25)]"
                    : "border-jarvis-cyan/25 text-jarvis-cyan-dark hover:border-jarvis-cyan hover:text-jarvis-cyan",
                  (!isSupported || !isSystemOnline) && "opacity-40 cursor-not-allowed"
                )}
              >
                <Radio className={cn("w-3.5 h-3.5 flex-shrink-0", mode === "wakeWord" && "animate-pulse")} />
                <span className="hidden sm:inline">{mode === "wakeWord" ? "On" : "Hey JARVIS"}</span>
              </button>

              {/* Text input */}
              <div className="flex-1 relative flex items-center">
                <Terminal size={15} className="absolute left-2 text-jarvis-cyan/40 pointer-events-none" />
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type a command or say Hey JARVIS..."
                  disabled={!isSystemOnline}
                  className="w-full bg-transparent text-jarvis-cyan placeholder:text-jarvis-cyan-dark/40 font-body pl-7 pr-2 py-1.5 focus:outline-none text-sm disabled:opacity-50"
                />
              </div>

              {/* Manual mic */}
              <button
                type="button"
                onClick={mode === "manual" ? stopListening : startManualMode}
                disabled={!isSupported || !isSystemOnline}
                title="Manual voice input"
                className={cn(
                  "p-2 rounded-lg border transition-all flex-shrink-0",
                  isListening && mode === "manual"
                    ? "border-jarvis-cyan bg-jarvis-cyan/15 text-jarvis-cyan shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                    : "border-jarvis-cyan/20 text-jarvis-cyan-dark hover:border-jarvis-cyan hover:text-jarvis-cyan",
                  (!isSupported || !isSystemOnline) && "opacity-40 cursor-not-allowed"
                )}
              >
                <Radio className={cn("w-4 h-4", isListening && mode === "manual" && "animate-pulse")} />
              </button>

              {/* Stop (only when active) or Send */}
              {mode !== "off" ? (
                <button
                  type="button"
                  onClick={stopListening}
                  title="Stop listening"
                  className="p-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                >
                  <Power className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!textInput.trim() || !isSystemOnline}
                  className="p-2 text-jarvis-cyan-dark hover:text-jarvis-cyan disabled:opacity-30 transition-colors flex-shrink-0"
                >
                  <Send size={18} />
                </button>
              )}
            </form>

            {!isSupported && (
              <p className="text-yellow-500/60 text-[10px] font-display tracking-widest text-center">
                Voice unavailable in this browser — use text input
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
