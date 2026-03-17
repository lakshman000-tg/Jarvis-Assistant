import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

export function JarvisHeader() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full flex flex-col items-center justify-center p-6 relative z-10"
    >
      <div className="flex items-center gap-4 text-jarvis-cyan">
        <Cpu className="w-8 h-8 animate-pulse-glow" />
        <h1 className="text-4xl md:text-6xl font-display font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white to-jarvis-cyan filter drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
          J.A.R.V.I.S
        </h1>
        <Cpu className="w-8 h-8 animate-pulse-glow" />
      </div>
      <p className="mt-2 text-jarvis-cyan-dark font-display text-sm md:text-base tracking-[0.3em] uppercase">
        Just A Rather Very Intelligent System
      </p>
      
      {/* Decorative HUD lines */}
      <div className="w-full max-w-2xl mt-4 flex items-center justify-between opacity-50">
        <div className="h-px bg-gradient-to-r from-transparent via-jarvis-cyan to-transparent flex-1" />
        <div className="px-4 text-xs font-display tracking-widest text-jarvis-cyan">SYS.ONLINE</div>
        <div className="h-px bg-gradient-to-r from-transparent via-jarvis-cyan to-transparent flex-1" />
      </div>
    </motion.header>
  );
}
