import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface JarvisMicProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function JarvisMic({ isListening, onClick, disabled }: JarvisMicProps) {
  return (
    <div className="relative w-40 h-40 flex items-center justify-center group">
      {/* Outer rotating dashed ring */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full border border-dashed border-jarvis-cyan/30 transition-all duration-500",
          isListening ? "animate-spin-slow opacity-100" : "opacity-30 group-hover:opacity-60"
        )} 
      />
      
      {/* Inner fast rotating ring */}
      <div 
        className={cn(
          "absolute inset-4 rounded-full border-t-2 border-l-2 border-jarvis-cyan transition-all duration-500",
          isListening ? "animate-spin-reverse opacity-80" : "opacity-0 group-hover:opacity-40"
        )} 
      />
      
      {/* Glow effect behind button */}
      {isListening && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.2 }}
          transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
          className="absolute inset-8 bg-jarvis-cyan/20 rounded-full blur-xl"
        />
      )}

      {/* Actual Button */}
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
          "bg-jarvis-dark border border-jarvis-cyan/50",
          "shadow-[0_0_15px_rgba(0,255,255,0.2)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]",
          isListening ? "shadow-[0_0_30px_rgba(0,255,255,0.8)] scale-110 border-jarvis-cyan bg-jarvis-cyan/10" : "hover:scale-105",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        {isListening ? (
          <Mic className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]" />
        ) : (
          <MicOff className="w-8 h-8 text-jarvis-cyan-dark" />
        )}
      </button>

      {/* Status Text */}
      <div className="absolute -bottom-8 w-full text-center">
        <p className="text-xs font-display tracking-widest text-jarvis-cyan-dark uppercase">
          {isListening ? (
            <motion.span 
              animate={{ opacity: [1, 0.5, 1] }} 
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-jarvis-cyan drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]"
            >
              Listening...
            </motion.span>
          ) : (
            "Awaiting Audio"
          )}
        </p>
      </div>
    </div>
  );
}
