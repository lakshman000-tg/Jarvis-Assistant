import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Terminal, HelpCircle, Radio, Power } from "lucide-react";
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
import { processCommand } from "@/services/commandProcessor";
import { cn } from "@/lib/utils";

type AppView = "chat" | "dashboard" | "commands";

const TABS: { id: AppView; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "dashboard", label: "Dashboard" },
  { id: "commands", label: "Commands" },
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

  // Stable ref so speech callback can always call the latest processInput
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

  const respondWith = useCallback((response: string, originalInput: string) => {
    setLastCommand(originalInput);
    setLastResponse(response);
    addMessage("user", originalInput);
    addMessage("assistant", response);
    speak(response);
  }, [addMessage, speak]);

  const processInput = useCallback((rawText: string) => {
    if (!rawText.trim() || !isSystemOnline) return;

    const result = processCommand(rawText, {
      navigate: (v) => setView(v as AppView),
      lockApp: () => setAppLocked(true),
      logout: () => {
        const msg = "Session terminated. Goodbye! 👋";
        addMessage("user", rawText);
        addMessage("assistant", msg);
        setLastCommand(rawText);
        setLastResponse(msg);
        speak(msg);
        setTimeout(() => {
          setIsSystemOnline(false);
          setConvId(null);
        }, 2500);
      },
      showHelp: () => setShowHelp(true),
    });

    if (result.handled) {
      result.action();
      // For logout, messaging is handled inline above
      if (!rawText.toLowerCase().replace(/^hey\s+jarvis[,.]?\s*/i, '').match(/\blog\s*(out|off)\b|\bsign\s*out\b/)) {
        respondWith(result.response, rawText);
      }
    } else {
      // Send to JARVIS AI
      updateStatus("processing");
      setLastCommand(rawText);
      askJarvis(rawText.replace(/^hey\s+jarvis[,.]?\s*/i, '').trim(), (aiResponse) => {
        setLastResponse(aiResponse);
        speak(aiResponse);
      });
    }
  }, [isSystemOnline, respondWith, askJarvis, speak, addMessage, updateStatus]);

  useEffect(() => { processInputRef.current = processInput; }, [processInput]);

  // Init conversation
  useEffect(() => {
    createConv({ data: { title: "JARVIS Session" } })
      .then((res) => {
        setConvId(res.id);
        setIsSystemOnline(true);
        addMessage("system", "System online. JARVIS is ready. Say \"Hey JARVIS\" or type a command.");
      })
      .catch(() => {
        addMessage("system", "ERROR: Failed to connect to JARVIS core.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current && view === "chat") {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, view]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      processInput(textInput);
      setTextInput("");
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

          {/* Voice diagnostic banner — shown when mic can't work */}
          <VoiceDiagnosticBanner permissionDenied={status === "noPermission"} />

          {/* Status bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "flex items-center justify-between px-3 py-2 mb-2 rounded border text-xs font-display tracking-widest uppercase transition-colors",
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
              aria-label="Command help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-0 mb-3 border-b border-jarvis-cyan/10">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "flex-1 py-2 text-xs font-display tracking-[0.2em] uppercase transition-all border-b-2 -mb-px",
                  view === tab.id
                    ? "border-jarvis-cyan text-jarvis-cyan"
                    : "border-transparent text-jarvis-cyan-dark hover:text-jarvis-cyan"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* CHAT */}
              {view === "chat" && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full flex flex-col"
                >
                  <div
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 rounded-xl border border-jarvis-cyan/20 bg-black/40 backdrop-blur-md hud-clip shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]"
                  >
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => <JarvisMessage key={msg.id} {...msg} />)}
                      {isAnalyzing && (
                        <JarvisMessage key="analyzing" role="assistant" content="JARVIS is analyzing..." isStreaming />
                      )}
                      {interimText && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex justify-end my-2"
                        >
                          <div className="text-jarvis-cyan-dark font-body italic text-sm">{interimText}...</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* DASHBOARD */}
              {view === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full overflow-y-auto rounded-xl border border-jarvis-cyan/20 bg-black/40 backdrop-blur-md"
                >
                  <JarvisStatusPanel
                    voiceStatus={status}
                    voiceMode={mode}
                    lastCommand={lastCommand}
                    lastResponse={lastResponse}
                  />
                </motion.div>
              )}

              {/* COMMANDS */}
              {view === "commands" && (
                <motion.div
                  key="commands"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full overflow-y-auto rounded-xl border border-jarvis-cyan/20 bg-black/40 backdrop-blur-md p-4 space-y-4"
                >
                  <p className="text-[10px] font-display tracking-[0.3em] text-jarvis-cyan-dark uppercase">
                    Quick Action Buttons
                  </p>
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
                      { label: "Open Settings ⚙️", cmd: "open settings" },
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

                  <button
                    onClick={() => setShowHelp(true)}
                    className="w-full bg-jarvis-cyan/5 border border-jarvis-cyan/30 text-jarvis-cyan text-xs font-display tracking-[0.2em] uppercase py-3 rounded hover:bg-jarvis-cyan/10 transition-all flex items-center justify-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4" /> View All Voice Commands
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-4 mb-5 flex flex-col items-center gap-3">
            {/* Wake word + mic row */}
            <div className="flex items-center justify-center gap-3 flex-wrap w-full">
              {/* Continuous "Hey JARVIS" mode */}
              <button
                onClick={mode === "wakeWord" ? stopListening : startWakeMode}
                disabled={!isSupported || !isSystemOnline}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-display tracking-widest uppercase border rounded transition-all",
                  mode === "wakeWord"
                    ? "border-jarvis-cyan bg-jarvis-cyan/10 text-jarvis-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                    : "border-jarvis-cyan/30 text-jarvis-cyan-dark hover:border-jarvis-cyan hover:text-jarvis-cyan",
                  (!isSupported || !isSystemOnline) && "opacity-40 cursor-not-allowed"
                )}
              >
                <Radio className={cn("w-4 h-4", mode === "wakeWord" && "animate-pulse")} />
                {mode === "wakeWord" ? "Hey JARVIS: ON" : "Hey JARVIS"}
              </button>

              {/* Manual one-shot mic */}
              <JarvisMic
                isListening={isListening && mode === "manual"}
                onClick={mode === "manual" ? stopListening : startManualMode}
                disabled={!isSupported || !isSystemOnline}
              />

              {mode !== "off" && (
                <button
                  onClick={stopListening}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-display tracking-widest uppercase border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded transition-all"
                >
                  <Power className="w-4 h-4" /> Stop
                </button>
              )}
            </div>

            {/* Test text input */}
            <form onSubmit={handleSubmitText} className="w-full max-w-2xl relative flex items-center group">
              <div className="absolute left-4 text-jarvis-cyan/50 group-focus-within:text-jarvis-cyan transition-colors">
                <Terminal size={18} />
              </div>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder='Type "Hey JARVIS, open youtube" to test...'
                disabled={!isSystemOnline}
                className="w-full bg-jarvis-dark/80 border-b-2 border-t-0 border-x-0 border-jarvis-cyan/30 text-jarvis-cyan placeholder:text-jarvis-cyan-dark/50 font-body px-12 py-3 focus:outline-none focus:border-jarvis-cyan focus:bg-jarvis-dark transition-all text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || !isSystemOnline}
                className="absolute right-2 p-2 text-jarvis-cyan-dark hover:text-jarvis-cyan disabled:opacity-40 transition-colors"
              >
                <Send size={20} />
              </button>
            </form>

            {!isSupported && (
              <p className="text-yellow-500/70 text-[10px] font-display tracking-widest text-center">
                ⚠ Voice recognition unavailable in this browser. Use the text input above to test commands.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
