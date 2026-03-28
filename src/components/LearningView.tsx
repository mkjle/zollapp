import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Trophy, Zap, Layers, Shuffle } from "lucide-react";
import { Flashcard } from "./Flashcard";
import { Question, MODULES } from "../data/questions";
import confetti from "canvas-confetti";

interface LearningViewProps {
  mode: "smart" | "module" | "random";
  moduleId?: number | null;
  allQuestions: (Question & { stage: number; currentModuleId: number | null })[];
  onAnswer: (questionId: string, correct: boolean) => void;
  onAssign: (questionId: string, moduleId: number) => void;
  onBack: () => void;
  lastAnswered: string[];
}

export const LearningView: React.FC<LearningViewProps> = ({
  mode,
  moduleId,
  allQuestions,
  onAnswer,
  onAssign,
  onBack,
  lastAnswered
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });

  // Filter and sort questions based on mode
  const sessionQuestions = useMemo(() => {
    let filtered = [...allQuestions];

    if (mode === "module") {
      filtered = filtered.filter(q => q.currentModuleId === moduleId);
    } else if (mode === "smart") {
      // Smart Learn: Stage 0 first, then 1, etc.
      // But avoid questions in lastAnswered (deferred for 10)
      const available = filtered.filter(q => !lastAnswered.includes(q.id));
      const deferred = filtered.filter(q => lastAnswered.includes(q.id));
      
      // Sort available by stage
      available.sort((a, b) => a.stage - b.stage);
      
      // If we have very few available, we might have to include deferred at the end
      filtered = [...available, ...deferred];
    } else if (mode === "random") {
      filtered.sort(() => Math.random() - 0.5);
    }

    return filtered;
  }, [allQuestions, mode, moduleId, lastAnswered]);

  const currentQuestion = sessionQuestions[currentIndex];

  const handleAnswer = (correct: boolean) => {
    if (!currentQuestion) return;

    onAnswer(currentQuestion.id, correct);
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    if (correct && currentQuestion.stage === 3) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Move to next
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Session finished or loop back?
      // For now, let's just loop or show a finish screen
      setCurrentIndex(0);
    }
  };

  if (sessionQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-400">
          <Layers className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Keine Fragen gefunden</h2>
        <p className="text-slate-500 mb-8 max-w-xs">
          In diesem Bereich gibt es aktuell keine Fragen zum Üben.
        </p>
        <button
          onClick={onBack}
          className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          Zurück zum Start
        </button>
      </div>
    );
  }

  const progressPercent = Math.round((currentIndex / sessionQuestions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <button 
          onClick={onBack}
          className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-600"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            {mode === "smart" ? "Smart Learn" : mode === "random" ? "Zufallsmodus" : `Modul ${moduleId}`}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <Zap className="w-4 h-4 fill-emerald-600" />
              <span>{sessionStats.correct}</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="text-slate-400 font-medium">
              {currentIndex + 1} / {sessionQuestions.length}
            </div>
          </div>
        </div>

        <div className="w-12" /> {/* Spacer */}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full mb-12 overflow-hidden">
        <motion.div 
          className="h-full bg-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Card Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
          <Flashcard 
            question={currentQuestion} 
            onAnswer={handleAnswer}
            onAssign={(mid) => onAssign(currentQuestion.id, mid)}
          />
        </motion.div>
      </AnimatePresence>

      {/* Session Summary Footer */}
      <div className="mt-12 flex justify-center gap-8 text-slate-400 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          Stufe 0-4 Tracking aktiv
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          Falsch = Zurück auf 0
        </div>
      </div>
    </div>
  );
};
