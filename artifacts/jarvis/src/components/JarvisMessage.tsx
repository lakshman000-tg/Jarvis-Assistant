import { motion } from "framer-motion";
import { Cpu, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface JarvisMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
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
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-none bg-white/5 border border-white/20 flex items-center justify-center hud-clip-reverse">
          <User className="w-5 h-5 text-gray-400" />
        </div>
      )}
    </motion.div>
  );
}
