import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Mic, Loader2, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Question } from "../data/questions";
import { explainQuestion, transcribeAudio, getGemini } from "../lib/gemini";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GeminiChatProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiChat: React.FC<GeminiChatProps> = ({ question, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize with explanation
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleInitialExplanation();
    }
  }, [isOpen]);

  // Scroll to bottom - Disabled per user request to read from top
  // useEffect(() => {
  //   if (scrollRef.current) {
  //     scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  //   }
  // }, [messages, isTyping]);

  const handleInitialExplanation = async () => {
    setIsTyping(true);
    try {
      const explanation = await explainQuestion(
        question.question,
        question.answer,
        question.sources.map(s => `Dokument ${s.doc}, Seite ${s.page}`).join("; ")
      );

      setMessages([{ role: "assistant", content: explanation || "Entschuldigung, ich konnte keine Erklärung generieren." }]);
    } catch (error) {
      console.error("Error generating explanation:", error);
      setMessages([{ role: "assistant", content: error instanceof Error ? error.message : "Fehler bei der Kommunikation mit der KI." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const ai = getGemini();
      
      const history = messages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `Du bist ein hilfreicher KI-Experte. Du hilfst bei der Vorbereitung auf eine Fachprüfung. 
          Beziehe dich immer auf die aktuelle Frage: "${question.question}" und die richtige Lösung: "${Array.isArray(question.answer) ? question.answer.join(", ") : question.answer}".
          Antworte präzise und auf Deutsch. 
          WICHTIG: KEINE Begrüßungen, KEINE Einleitungen, KEINE Verabschiedungen. Antworte direkt auf die Frage des Nutzers.`,
        },
        contents: [
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: "user", parts: [{ text: text }] }
        ]
      });

      setMessages(prev => [...prev, { role: "assistant", content: response.text || "Keine Antwort erhalten." }]);
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages(prev => [...prev, { role: "assistant", content: error instanceof Error ? error.message : "Fehler bei der Kommunikation mit der KI." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleAudioTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Mikrofonzugriff verweigert oder nicht verfügbar.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsTranscribing(true); // Sofort Ladezustand anzeigen
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
        
      const transcribedText = await transcribeAudio(base64Audio, "audio/webm");

      if (transcribedText) {
        setInput(transcribedText);
      }
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-white w-full max-w-2xl h-[90vh] sm:h-[80vh] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">KI-Experte</h3>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Prüfungsvorbereitung</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30"
            >
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                      msg.role === "user" ? "bg-indigo-100 text-indigo-600" : "bg-white text-slate-400 border border-slate-100"
                    }`}>
                      {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                    }`}>
                      <div className="prose prose-sm max-w-none prose-slate">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-lg bg-white text-slate-400 border border-slate-100 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span className="text-sm text-slate-400 font-medium">KI denkt nach...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Stelle eine Rückfrage..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pr-12 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none min-h-[52px] max-h-32"
                      rows={1}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      {isTranscribing ? (
                        <div className="p-2 flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-1.5 border border-indigo-100">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">Transkribiere...</span>
                        </div>
                      ) : (
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`p-2 rounded-xl transition-all ${
                            isRecording 
                              ? "bg-rose-500 text-white shadow-lg shadow-rose-200" 
                              : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          }`}
                          title={isRecording ? "Aufnahme stoppen" : "Spracheingabe"}
                        >
                          <Mic className={`w-5 h-5 ${isRecording ? "animate-pulse" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    KI-Antworten können Fehler enthalten.
                  </p>
                  {isRecording && (
                    <p className="text-[10px] text-rose-500 font-bold animate-pulse">
                      Aufnahme läuft...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
