import { useState, useCallback, useRef } from 'react';
import { getSendOpenaiMessageUrl } from '@workspace/api-client-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

export function useJarvisChat(conversationId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((role: 'user' | 'assistant' | 'system', content: string) => {
    setMessages(prev => [...prev, { id: Math.random().toString(36).substring(7), role, content }]);
  }, []);

  const askJarvis = useCallback(async (text: string, onSpeechReady: (text: string) => void) => {
    if (!conversationId) return;
    
    addMessage('user', text);
    setIsAnalyzing(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const url = getSendOpenaiMessageUrl(conversationId);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAssistantMessage = '';
      
      const assistantMsgId = Math.random().toString(36).substring(7);
      
      // Add empty assistant message to stream into
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true }]);
      setIsAnalyzing(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                // Done streaming
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m));
                onSpeechReady(fullAssistantMessage);
              } else if (data.content) {
                fullAssistantMessage += data.content;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: fullAssistantMessage } : m));
              }
            } catch (e) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Chat error:', error);
      setIsAnalyzing(false);
      addMessage('system', 'ERROR: Connection to main AI frame lost.');
    }
  }, [conversationId, addMessage]);

  return {
    messages,
    isAnalyzing,
    addMessage,
    askJarvis
  };
}
