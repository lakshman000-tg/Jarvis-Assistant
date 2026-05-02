import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Cpu, User, Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface JarvisMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

function SpeakButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = useCallback(async () => {
    // Stop if already playing
    if (playing) {
      audioRef.current?.pause();
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    setPlaying(true);
    try {
      const res = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'onyx' }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPlaying(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPlaying(false);
      };
      audio.play();
    } catch {
      setPlaying(false);
    }
  }, [playing, text]);

  return (
    <button
      onClick={handleClick}
      title={playing ? "Stop speaking" : "Speak this message"}
      className={cn(
        "flex-shrink-0 w-6 h-6 flex items-center justify-center transition-colors",
        playing
          ? "text-jarvis-cyan animate-pulse"
          : "text-jarvis-cyan/30 hover:text-jarvis-cyan/80"
      )}
    >
      {playing
        ? <Square className="w-3.5 h-3.5 fill-current" />
        : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
}

export function JarvisMessage({ role, content, isStreaming }: JarvisMessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-2 text-xs font-display tracking-widest uppercase hud-clip">
          {content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex w-full gap-4 my-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-none bg-jarvis-cyan/10 border border-jarvis-cyan flex items-center justify-center hud-clip">
          <Cpu className="w-5 h-5 text-jarvis-cyan" />
        </div>
      )}

      <div className={cn(
        "max-w-[80%] relative p-4 font-body text-base md:text-lg leading-relaxed shadow-lg",
        isUser
          ? "bg-jarvis-panel border-r-2 border-b-2 border-jarvis-cyan/40 text-gray-200 hud-clip-reverse"
          : "bg-jarvis-dark border-l-2 border-t-2 border-jarvis-cyan text-jarvis-cyan shadow-[0_0_15px_rgba(0,255,255,0.1)] hud-clip"
      )}>
        {content || (isStreaming && <span className="animate-pulse">_</span>)}
        {isStreaming && content && <span className="inline-block w-2 h-4 ml-1 bg-jarvis-cyan animate-pulse" />}

        {/* Speak button — only on completed assistant messages */}
        {!isUser && !isStreaming && content && (
          <div className="flex justify-end mt-2 -mb-1">
            <SpeakButton text={content} />
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-none bg-white/5 border border-white/20 flex items-center justify-center hud-clip-reverse">
          <User className="w-5 h-5 text-gray-400" />
        </div>
      )}
    </motion.div>
  );
}
