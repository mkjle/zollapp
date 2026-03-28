import React, { useState } from "react";
import { useLearningStore } from "./store/useLearningStore";
import { StartScreen } from "./components/StartScreen";
import { LearningView } from "./components/LearningView";
import { QuestionOverview } from "./components/QuestionOverview";
import { ArrowLeft, GraduationCap } from "lucide-react";

type View = "start" | "learning" | "overview";

export default function App() {
  const { 
    questions, 
    updateStage, 
    assignModule, 
    addQuestions,
    progress, 
    importProgress,
    resetProgress,
    resetStages
  } = useLearningStore();
  
  const [view, setView] = useState<View>("start");
  const [learningMode, setLearningMode] = useState<{
    mode: "smart" | "module" | "random";
    moduleId?: number | null;
  }>({ mode: "smart" });

  const handleStartMode = (mode: "smart" | "module" | "random", moduleId?: number | null) => {
    setLearningMode({ mode, moduleId });
    setView("learning");
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(progress));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "zoll_lernfortschritt.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        importProgress(json);
      } catch (err) {
        console.error("Invalid progress file", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation Bar (only for overview) */}
      {view === "overview" && (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <button 
              onClick={() => setView("start")}
              className="flex items-center gap-2 text-slate-600 font-bold hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Zurück
            </button>
            <div className="flex items-center gap-2 font-black text-indigo-600">
              <GraduationCap className="w-6 h-6" />
              <span>Zoll mündliche Prüfung</span>
            </div>
            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>
      )}

      <main>
        {view === "start" && (
          <StartScreen 
            questions={questions}
            onStartMode={handleStartMode}
            onDownload={handleDownload}
            onUpload={handleUpload}
            onQuestionsAdded={addQuestions}
            onViewOverview={() => setView("overview")}
            onReset={resetProgress}
            onResetStages={resetStages}
          />
        )}

        {view === "learning" && (
          <LearningView 
            mode={learningMode.mode}
            moduleId={learningMode.moduleId}
            allQuestions={questions}
            onAnswer={updateStage}
            onAssign={assignModule}
            onBack={() => setView("start")}
            lastAnswered={progress.lastAnswered}
          />
        )}

        {view === "overview" && (
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="mb-12">
              <h1 className="text-4xl font-black text-slate-900 mb-2">Fragenübersicht</h1>
              <p className="text-slate-500">Alle verfügbaren Fragen aus den Modulen 2 bis 8.</p>
            </div>
            <QuestionOverview 
              questions={questions} 
              onAssign={assignModule}
              onAnswer={updateStage}
            />
          </div>
        )}
      </main>

      {/* Global CSS for perspective and custom scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}} />
    </div>
  );
}
