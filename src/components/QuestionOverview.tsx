import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Filter, ChevronRight, BookOpen, Layers, Tag, X, Maximize2 } from "lucide-react";
import { Question, MODULES } from "../data/questions";
import { cn } from "../lib/utils";
import { Flashcard } from "./Flashcard";

interface QuestionOverviewProps {
  questions: (Question & { stage: number; currentModuleId: number | null })[];
  onAssign: (questionId: string, moduleId: number | null) => void;
  onAnswer: (questionId: string, correct: boolean) => void;
}

export const QuestionOverview: React.FC<QuestionOverviewProps> = ({ questions, onAssign, onAnswer }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<number | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<(Question & { stage: number; currentModuleId: number | null }) | null>(null);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = selectedModule === "all" || q.currentModuleId === selectedModule;
    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Fragen durchsuchen..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedModule("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
              selectedModule === "all" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            Alle
          </button>
          <button
            onClick={() => setSelectedModule(null)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
              selectedModule === null 
                ? "bg-amber-600 text-white shadow-lg shadow-amber-100" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            Nicht zugeordnet
          </button>
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedModule(m.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                selectedModule === m.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              Modul {m.id}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredQuestions.map(q => (
          <div 
            key={q.id}
            onClick={() => setPreviewQuestion(q)}
            className={cn(
              "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-indigo-200",
              previewQuestion?.id === q.id && "ring-2 ring-indigo-500/5"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1",
                    q.currentModuleId === null ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-500"
                  )}>
                    {q.currentModuleId ? `Modul ${q.currentModuleId}` : "Nicht zugeordnet"}
                  </span>
                  <div className="flex gap-0.5">
                    {[...Array(4)].map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          i < q.stage ? "bg-indigo-500" : "bg-slate-100"
                        )} 
                      />
                    ))}
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 leading-snug">
                  {q.question}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 text-slate-300 group-hover:text-indigo-500 transition-all">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {q.sources.map((s, i) => (
                  <span key={i} className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    Dok {s.doc}, S. {s.page}
                  </span>
                ))}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAssigningId(q.id);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all text-[10px] font-bold border border-slate-100"
              >
                <Tag className="w-3 h-3" />
                Modul ändern
              </button>
            </div>
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Layers className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-medium">Keine passenden Fragen gefunden.</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
            onClick={() => setPreviewQuestion(null)}
          >
            <div className="w-full max-w-3xl relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="absolute -top-12 right-0 text-white hover:text-indigo-300 transition-colors flex items-center gap-2 font-bold"
              >
                <X className="w-6 h-6" />
                Schließen
              </button>
              <Flashcard 
                question={previewQuestion}
                onAnswer={(correct) => {
                  onAnswer(previewQuestion.id, correct);
                  setPreviewQuestion(null);
                }}
                onAssign={(mid) => {
                  onAssign(previewQuestion.id, mid);
                  // Update local preview state to reflect change
                  setPreviewQuestion({ ...previewQuestion, currentModuleId: mid });
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment Modal Overlay */}
      <AnimatePresence>
        {assigningId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setAssigningId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-800 mb-6">Modul zuweisen</h3>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    onAssign(assigningId, null);
                    setAssigningId(null);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 hover:bg-amber-100 transition-all text-sm font-bold text-amber-700"
                >
                  Nicht zugeordnet
                </button>
                {MODULES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onAssign(assigningId, m.id);
                      setAssigningId(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-sm font-medium text-slate-700"
                  >
                    Modul {m.id}: {m.name}
                  </button>
                ))}
                <button
                  onClick={() => setAssigningId(null)}
                  className="mt-6 w-full py-3 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
