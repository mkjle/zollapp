import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Mic, MicOff, Loader2, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Question } from "../data/questions";

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

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleInitialExplanation = async () => {
    setIsTyping(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Du bist ein hochqualifizierter KI-Tutor für eine Fachprüfung (z.B. Sachkundeprüfung nach § 34a GewO oder ähnliches).
        Deine Aufgabe ist es, die folgende Frage und die dazugehörige richtige Lösung fachlich fundiert und verständlich zu erklären.
        
        FRAGE: "${question.question}"
        RICHTIGE LÖSUNG: "${Array.isArray(question.answer) ? question.answer.join(", ") : question.answer}"
        QUELLEN/KONTEXT: ${question.sources.map(s => `Dokument ${s.doc}, Seite ${s.page}`).join("; ")}
        
        BITTE GEHE WIE FOLGT VOR:
        1. Erkläre kurz und prägnant, warum die Lösung korrekt ist.
        2. Nimm, falls sinnvoll und möglich, Bezug auf konkrete Gesetze, Paragraphen oder Vorschriften (z.B. GewO, BGB, StGB, BewachV).
        3. Gib einen praktischen Tipp oder eine Merkhilfe, um sich dieses Wissen für die Prüfung besser einzuprägen.
        
        Antworte auf Deutsch in einem freundlichen, motivierenden und professionellen Ton. Benutze Markdown für eine klare Strukturierung (Fettgedrucktes, Listen, etc.).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setMessages([{ role: "assistant", content: response.text || "Entschuldigung, ich konnte keine Erklärung generieren." }]);
    } catch (error) {
      console.error("Error generating explanation:", error);
      setMessages([{ role: "assistant", content: "Fehler: Die KI konnte nicht erreicht werden. Bitte prüfe deine Internetverbindung." }]);
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
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `Du bist ein hilfreicher KI-Tutor. Du hilfst bei der Vorbereitung auf eine Fachprüfung. 
          Beziehe dich immer auf die aktuelle Frage: "${question.question}" und die richtige Lösung: "${Array.isArray(question.answer) ? question.answer.join(", ") : question.answer}".
          Antworte präzise, freundlich und auf Deutsch.`,
        },
      });

      // Reconstruct history for chat
      // Note: sendMessage only takes a string, so we might need a different approach if we want full history
      // But for simplicity, we'll just send the current message with context
      const history = messages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: "user", parts: [{ text: text }] }
        ]
      });

      setMessages(prev => [...prev, { role: "assistant", content: response.text || "Keine Antwort erhalten." }]);
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Fehler bei der Kommunikation mit der KI." }]);
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
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: "audio/webm",
              },
            },
            {
              text: "Transkribiere dieses Audio exakt auf Deutsch. Gib nur den Text zurück.",
            },
          ],
        });

        const transcribedText = response.text?.trim();
        if (transcribedText) {
          setInput(transcribedText);
          // Optionally send immediately
          // handleSend(transcribedText);
        }
      };
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
                  <h3 className="font-bold text-slate-800">KI-Tutor</h3>
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
                        <div className="p-2">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        </div>
                      ) : (
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`p-2 rounded-xl transition-all ${
                            isRecording 
                              ? "bg-rose-100 text-rose-600 animate-pulse" 
                              : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          }`}
                          title={isRecording ? "Aufnahme stoppen" : "Spracheingabe"}
                        >
                          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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
