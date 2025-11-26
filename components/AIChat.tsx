import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá. Eu sou o assistente do Zero Vício. Estou aqui para te ouvir e te apoiar. Como você está se sentindo hoje?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(userMsg.text);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
      <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400">
          <Bot size={20} />
        </div>
        <div>
          <h3 className="font-bold text-white">IA Assistente</h3>
          <p className="text-xs text-slate-400">Suporte 24/7</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-purple-600 text-white rounded-tr-none' 
                : 'bg-slate-700 text-slate-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400">
               <Bot size={14} />
             </div>
             <div className="bg-slate-700 p-3 rounded-2xl rounded-tl-none">
               <Loader2 size={16} className="animate-spin text-slate-400" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-full px-4 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};