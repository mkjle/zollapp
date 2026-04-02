import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, 
  BookOpen, 
  Shuffle, 
  Download, 
  Upload, 
  LayoutDashboard, 
  GraduationCap,
  ChevronRight,
  AlertCircle,
  X,
  Play,
  RefreshCw,
  Search,
  Key
} from "lucide-react";
import { MODULES, Question } from "../data/questions";
import { cn } from "../lib/utils";

interface StartScreenProps {
  questions: (Question & { stage: number; currentModuleId: number | null })[];
  onStartMode: (mode: "smart" | "module" | "random", moduleId?: number | null) => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
  onViewOverview: () => void;
  onResetStages: () => void;
  onResetModulePosition: (moduleId: number | null) => void;
  onUpdateModulePosition: (moduleId: number | null, index: number) => void;
  geminiApiKey: string;
  onUpdateGeminiApiKey: (key: string) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  questions,
  onStartMode,
  onDownload,
  onUpload,
  onViewOverview,
  onResetStages,
  onResetModulePosition,
  onUpdateModulePosition,
  geminiApiKey,
  onUpdateGeminiApiKey
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [selectedModuleForOptions, setSelectedModuleForOptions] = React.useState<number | null>(null);
  const [showQuestionSearch, setShowQuestionSearch] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const stats = {
    total: questions.length,
    mastered: questions.filter(q => q.stage === 4).length,
    learning: questions.filter(q => q.stage > 0 && q.stage < 4).length,
    new: questions.filter(q => q.stage === 0).length,
    unassigned: questions.filter(q => q.currentModuleId === null).length
  };

  const progressPercent = Math.round((stats.mastered / stats.total) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold tracking-wide uppercase">
            <GraduationCap className="w-4 h-4" />
            Zoll mündliche Prüfung
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight">
            Meistere deine <span className="text-indigo-600">Prüfung.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-lg">
            Lerne effizient mit unserem intelligenten Karteikarten-System. Bereite dich gezielt auf deine mündliche Prüfung vor.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button
              onClick={() => onStartMode("smart")}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={questions.length === 0}
            >
              <Zap className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
              Smart Learn starten
            </button>
            <button
              onClick={onViewOverview}
              className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-3"
            >
              <LayoutDashboard className="w-5 h-5" />
              Fragenübersicht
            </button>
          </div>
        </div>

        {/* Progress Card */}
        <div className="w-full md:w-80 bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Dein Fortschritt</h3>
              <span className="text-indigo-600 font-black text-2xl">{progressPercent}%</span>
            </div>

            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Gelernt</div>
                <div className="text-xl font-black text-slate-800">{stats.mastered}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">In Arbeit</div>
                <div className="text-xl font-black text-slate-800">{stats.learning}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
              <button 
                onClick={onDownload}
                className="flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all text-xs font-bold"
              >
                <Download className="w-4 h-4" />
                Fortschritt speichern
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all text-xs font-bold"
              >
                <Upload className="w-4 h-4" />
                Fortschritt laden
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
              />
              
              {questions.length > 0 && (
                <div className="pt-2 space-y-2">
                  {!showResetConfirm ? (
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider"
                    >
                      Lernfortschritt zurücksetzen
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-[10px] font-bold text-indigo-700 text-center uppercase">Fortschritt wirklich auf 0 setzen?</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            onResetStages();
                            setShowResetConfirm(false);
                          }}
                          className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase"
                        >
                          Ja
                        </button>
                        <button 
                          onClick={() => setShowResetConfirm(false)}
                          className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold uppercase"
                        >
                          Nein
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Gemini API Key Input */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gemini API Key</span>
                </div>
                <input 
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => onUpdateGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <p className="mt-1 text-[9px] text-slate-400 leading-tight">
                  Wird lokal im Browser und in der Download-Datei gespeichert.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Modes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            Nach Modulen lernen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODULES.map(m => {
              const moduleQuestions = questions.filter(q => q.currentModuleId === m.id);
              const mastered = moduleQuestions.filter(q => q.stage === 4).length;
              const total = moduleQuestions.length;
              
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModuleForOptions(m.id)}
                  className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all text-left relative overflow-hidden"
                >
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase">
                        Modul {m.id}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <h4 className="font-bold text-slate-800 leading-tight pr-4">
                      {m.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-400" 
                          style={{ width: total > 0 ? `${(mastered / total) * 100}%` : '0%' }} 
                        />
                      </div>
                      <span>{mastered}/{total}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Shuffle className="w-6 h-6 text-indigo-500" />
            Spezial-Modi
          </h2>
          <div className="space-y-4">
            <button
              onClick={() => onStartMode("random")}
              className="w-full bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl text-white text-left shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-transform group"
            >
              <Shuffle className="w-8 h-8 mb-4 opacity-50 group-hover:rotate-12 transition-transform" />
              <h4 className="text-xl font-bold mb-2">Zufallsmodus</h4>
              <p className="text-indigo-100 text-sm">
                Fragen werden komplett zufällig ausgewählt, unabhängig von der Stufe.
              </p>
            </button>

            {stats.unassigned > 0 && (
              <button
                onClick={() => onStartMode("module", null)}
                className="w-full bg-amber-50 p-6 rounded-3xl border border-amber-100 text-left hover:bg-amber-100 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500 rounded-xl text-white">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <span className="font-black text-amber-600 uppercase text-xs tracking-widest">Aktion erforderlich</span>
                </div>
                <h4 className="text-xl font-bold text-amber-900 mb-2">Nicht zugeordnet</h4>
                <p className="text-amber-700 text-sm">
                  Du hast {stats.unassigned} Fragen ohne Modul-Zuweisung. Jetzt ordnen!
                </p>
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Module Options Modal */}
      {selectedModuleForOptions !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">
                {MODULES.find(m => m.id === selectedModuleForOptions)?.name}
              </h3>
              <button 
                onClick={() => setSelectedModuleForOptions(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  onStartMode("module", selectedModuleForOptions);
                  setSelectedModuleForOptions(null);
                }}
                className="w-full p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group"
              >
                <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Weitermachen</div>
                  <div className="text-xs text-slate-500">Dort fortfahren, wo du aufgehört hast</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onStartMode("smart", selectedModuleForOptions);
                  setSelectedModuleForOptions(null);
                }}
                className="w-full p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group"
              >
                <div className="p-3 bg-amber-100 rounded-xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Smart Learn</div>
                  <div className="text-xs text-slate-500">Intelligente Wiederholung für dieses Modul</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onStartMode("random", selectedModuleForOptions);
                  setSelectedModuleForOptions(null);
                }}
                className="w-full p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group"
              >
                <div className="p-3 bg-violet-100 rounded-xl text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Zufällig</div>
                  <div className="text-xs text-slate-500">Alle Fragen dieses Moduls in zufälliger Reihenfolge</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onResetModulePosition(selectedModuleForOptions);
                  onStartMode("module", selectedModuleForOptions);
                  setSelectedModuleForOptions(null);
                }}
                className="w-full p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group"
              >
                <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Von vorne</div>
                  <div className="text-xs text-slate-500">Beginne wieder bei der ersten Frage</div>
                </div>
              </button>

              <button
                onClick={() => setShowQuestionSearch(true)}
                className="w-full p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group"
              >
                <div className="p-3 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Ab Frage...</div>
                  <div className="text-xs text-slate-500">Suche eine Frage und fange dort an</div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Question Search Modal */}
      <AnimatePresence>
        {showQuestionSearch && selectedModuleForOptions !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-2xl w-full border border-slate-100 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Frage auswählen</h3>
                  <p className="text-sm text-slate-500">Modul {selectedModuleForOptions}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowQuestionSearch(false);
                    setSearchTerm("");
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Frage suchen..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {(() => {
                  const moduleQuestions = questions.filter(q => q.currentModuleId === selectedModuleForOptions);
                  const filtered = moduleQuestions.filter(q => 
                    q.question.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400">
                        Keine Fragen gefunden.
                      </div>
                    );
                  }

                  return filtered.map((q) => {
                    const index = moduleQuestions.findIndex(mq => mq.id === q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          onUpdateModulePosition(selectedModuleForOptions, index);
                          onStartMode("module", selectedModuleForOptions);
                          setShowQuestionSearch(false);
                          setSelectedModuleForOptions(null);
                          setSearchTerm("");
                        }}
                        className="w-full p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left flex items-start gap-4 group"
                      >
                        <div className="min-w-[2.5rem] h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-sm group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 text-sm leading-snug mb-1">
                            {q.question}
                          </div>
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
                      </button>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
