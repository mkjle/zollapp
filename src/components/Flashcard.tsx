import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, RotateCcw, HelpCircle, BookOpen, Tag } from "lucide-react";
import { Question, MODULES } from "../data/questions";
import { cn } from "../lib/utils";

interface FlashcardProps {
  question: Question & { stage: number; currentModuleId: number | null };
  onAnswer: (correct: boolean) => void;
  onAssign: (moduleId: number | null) => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ question, onAnswer, onAssign }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const handleFlip = () => {
    if (!showAssign) setIsFlipped(!isFlipped);
  };

  const moduleName = question.currentModuleId 
    ? MODULES.find(m => m.id === question.currentModuleId)?.name 
    : "Nicht zugeordnet";

  return (
    <div className="w-full max-w-2xl mx-auto perspective-1000">
      <motion.div
        className="relative w-full min-h-[400px] cursor-pointer"
        onClick={handleFlip}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front Side */}
        <div 
          className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-8 flex flex-col items-center justify-center text-center backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="absolute top-6 left-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <BookOpen className="w-4 h-4" />
            <span>{moduleName}</span>
          </div>
          
          <div className="absolute top-6 right-8 flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-2 h-2 rounded-full",
                  i < question.stage ? "bg-indigo-500" : "bg-slate-200"
                )} 
              />
            ))}
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
            {question.question}
          </h2>
          
          <p className="mt-8 text-slate-400 text-sm animate-pulse">
            Klicken zum Umdrehen
          </p>
        </div>

        {/* Back Side */}
        <div 
          className="absolute inset-0 w-full h-full bg-indigo-50 rounded-3xl shadow-xl border-2 border-indigo-100 p-8 flex flex-col backface-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Lösungsvorschlag:
            </h3>
            <ul className="space-y-3">
              {(Array.isArray(question.answer) ? question.answer : [String(question.answer)]).map((point, idx) => (
                <motion.li 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="flex items-start gap-3 text-slate-700"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2.5 shrink-0" />
                  <span>{point}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-6 border-t border-indigo-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {question.sources.map((s, i) => (
                <span key={i} className="bg-white px-2 py-1 rounded border border-slate-100">
                  Dok {s.doc}, S. {s.page}
                </span>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAssign(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium z-10"
              >
                <Tag className="w-4 h-4" />
                Modul ändern
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnswer(false);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 text-sm font-bold z-10"
              >
                <X className="w-4 h-4" />
                Nicht gewusst
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnswer(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 text-sm font-bold z-10"
              >
                <Check className="w-4 h-4" />
                Gewusst
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Assignment Modal Overlay */}
      <AnimatePresence>
        {showAssign && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowAssign(false)}
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
                    onAssign(null);
                    setShowAssign(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 hover:bg-amber-100 transition-all text-sm font-bold text-amber-700"
                >
                  Nicht zugeordnet
                </button>
                {MODULES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onAssign(m.id);
                      setShowAssign(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-sm font-medium text-slate-700"
                  >
                    Modul {m.id}: {m.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAssign(false)}
                className="mt-6 w-full py-3 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
              >
                Abbrechen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
