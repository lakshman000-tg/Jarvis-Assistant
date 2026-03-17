import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Terminal } from "lucide-react";
import { useCreateOpenaiConversation } from "@workspace/api-client-react";
import { useJarvisChat } from "@/hooks/use-jarvis-chat";
import { useSpeech } from "@/hooks/use-speech";
import { JarvisHeader } from "@/components/JarvisHeader";
import { JarvisMic } from "@/components/JarvisMic";
import { JarvisMessage } from "@/components/JarvisMessage";

export function Jarvis() {
  const [convId, setConvId] = useState<number | null>(null);
  const [textInput, setTextInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [isSystemOnline, setIsSystemOnline] = useState(false);

  const { mutateAsync: createConv } = useCreateOpenaiConversation();
  const { messages, addMessage, askJarvis, isAnalyzing } = useJarvisChat(convId);

  // Initialize System
  useEffect(() => {
    createConv({ data: { title: "JARVIS Session" } })
      .then(res => {
        setConvId(res.id);
        setIsSystemOnline(true);
        // We do not speak automatically here due to browser auto-play policies.
        addMessage('system', 'System online. Core systems engaged. Awaiting input.');
      })
      .catch(() => {
        addMessage('system', 'ERROR: Failed to establish secure connection to core database.');
      });
  }, [createConv, addMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Handle local AI commands before hitting LLM
  const handleCommands = (text: string) => {
    // Strip wake word prefix if present
    const lower = text.toLowerCase().replace(/^hey\s+jarvis[,.]?\s*/i, '');
    let responseText = null;

    if (lower.includes("open youtube")) {
      window.open("https://www.youtube.com", "_blank");
      responseText = "Opening YouTube 🚀";
    } else if (lower.includes("tell time") || lower.includes("what time")) {
      const time = new Date().toLocaleTimeString();
      responseText = `The current time is ${time} ⏰`;
    } else if (lower.startsWith("search google")) {
      const query = lower.replace("search google", "").trim();
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
      responseText = `Searching Google for ${query} 🔍`;
    } else if (lower.includes("open gmail")) {
      window.open("https://mail.google.com", "_blank");
      responseText = "Opening Gmail 📧";
    } else if (lower.includes("play music")) {
      window.open("https://music.youtube.com", "_blank");
      responseText = "Playing music 🎵";
    } else if (lower.includes("play telugu songs")) {
      window.open(`https://www.youtube.com/results?search_query=Telugu+songs`, "_blank");
      responseText = "Opening Telugu songs 🎵";
    } else if (lower.includes("play telugu love songs") || lower.includes("latest hits") || lower.includes("upbeat") || lower.includes("party songs")) {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(lower)}`, "_blank");
      responseText = `Searching YouTube for your requested mood 🎵`;
    }

    if (responseText) {
      addMessage('user', text);
      addMessage('assistant', responseText);
      speak(responseText);
      return true;
    }
    return false;
  };

  const processInput = (text: string) => {
    if (!text.trim() || !isSystemOnline) return;
    
    // Strip wake word prefix
    const cleanText = text.replace(/^hey\s+jarvis[,.]?\s*/i, '').trim();
    if (!cleanText) return;
    
    // Check built-in commands first
    const handled = handleCommands(cleanText);
    if (!handled) {
      // Send to AI
      askJarvis(cleanText, (aiResponse) => {
        speak(aiResponse);
      });
    }
  };

  const { isListening, isSupported, interimText, startListening, stopListening, speak } = useSpeech(
    // onResult
    (text) => {
      processInput(text);
    }
  );

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      processInput(textInput);
      setTextInput("");
    }
  };


  return (
    <div className="min-h-screen w-full relative flex flex-col bg-jarvis-navy overflow-hidden">
      {/* Background image & effects */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-screen">
        <img 
          src={`${import.meta.env.BASE_URL}images/jarvis-core.png`} 
          alt="Jarvis Core" 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="scanlines" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-jarvis-navy/80 to-jarvis-navy pointer-events-none z-0" />

      {/* Main UI */}
      <div className="relative z-10 flex flex-col h-screen max-w-5xl mx-auto w-full px-4 sm:px-6">
        <JarvisHeader />

        {/* Chat Area */}
        <div 
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 space-y-4 rounded-xl border border-jarvis-cyan/20 bg-black/40 backdrop-blur-md hud-clip shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <JarvisMessage key={msg.id} {...msg} />
            ))}
            
            {isAnalyzing && (
              <JarvisMessage 
                key="analyzing" 
                role="assistant" 
                content="JARVIS is analyzing..." 
                isStreaming={true} 
              />
            )}
            
            {interimText && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-end my-4"
              >
                <div className="text-jarvis-cyan-dark font-body italic">
                  {interimText}...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="mt-6 mb-8 flex flex-col items-center gap-6">
          <JarvisMic 
            isListening={isListening} 
            onClick={isListening ? stopListening : startListening}
            disabled={!isSystemOnline || !isSupported}
          />
          
          <form 
            onSubmit={handleSubmitText} 
            className="w-full max-w-2xl relative flex items-center group"
          >
            <div className="absolute left-4 text-jarvis-cyan/50 group-focus-within:text-jarvis-cyan transition-colors">
              <Terminal size={20} />
            </div>
            
            <input 
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={isSupported ? "Speak or type your command..." : "Speech not supported. Type your command..."}
              disabled={!isSystemOnline}
              className="w-full bg-jarvis-dark/80 border-b-2 border-t-0 border-x-0 border-jarvis-cyan/30 text-jarvis-cyan placeholder:text-jarvis-cyan-dark font-display px-12 py-4 focus:outline-none focus:border-jarvis-cyan focus:bg-jarvis-dark shadow-[0_4px_15px_-3px_rgba(0,255,255,0.1)] transition-all uppercase tracking-widest disabled:opacity-50"
            />
            
            <button 
              type="submit"
              disabled={!textInput.trim() || !isSystemOnline}
              className="absolute right-2 p-2 text-jarvis-cyan-dark hover:text-jarvis-cyan disabled:opacity-50 disabled:hover:text-jarvis-cyan-dark transition-colors"
            >
              <Send size={24} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
