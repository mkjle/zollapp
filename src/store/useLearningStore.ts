import { useState, useEffect, useCallback, useMemo } from "react";
import { RAW_QUESTIONS, Question } from "../data/questions";
import defaultProgress from "../data/default/default.json";

export interface Progress {
  stages: Record<string, number>; // questionId -> stage (0-4)
  customModules: Record<string, number | null>; // questionId -> moduleId
  lastAnswered: string[]; // List of recently answered question IDs to avoid immediate repetition
  customQuestions: Question[]; // Questions added by the user
  modulePositions: Record<string, number>; // moduleId (as string) -> last index
  geminiApiKey?: string; // Gemini API Key for AI features
}

export function useLearningStore() {
  const [progress, setProgress] = useState<Progress>(() => {
    const saved = localStorage.getItem("zoll-progress");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Deduplicate existing questions by ID just in case
        const customQuestions = parsed.customQuestions || [];
        const uniqueQuestions: Question[] = [];
        const seenIds = new Set<string>();
        
        for (const q of customQuestions) {
          if (!seenIds.has(q.id)) {
            uniqueQuestions.push(q);
            seenIds.add(q.id);
          }
        }

        return {
          stages: parsed.stages || {},
          customModules: parsed.customModules || {},
          lastAnswered: parsed.lastAnswered || [],
          customQuestions: uniqueQuestions,
          modulePositions: parsed.modulePositions || {},
          geminiApiKey: parsed.geminiApiKey || ""
        };
      } catch (e) {
        console.error("Failed to parse progress", e);
      }
    }
    return (defaultProgress as any as Progress) || { 
      stages: {}, 
      customModules: {}, 
      lastAnswered: [], 
      customQuestions: [],
      modulePositions: {},
      geminiApiKey: ""
    };
  });

  useEffect(() => {
    localStorage.setItem("zoll-progress", JSON.stringify(progress));
  }, [progress]);

  const updateStage = useCallback((questionId: string, correct: boolean) => {
    setProgress((prev) => {
      const currentStage = prev.stages[questionId] || 0;
      const newStage = correct ? Math.min(currentStage + 1, 4) : 0;
      
      // Update lastAnswered queue (max 10 items)
      const newLastAnswered = [...prev.lastAnswered, questionId];
      if (newLastAnswered.length > 10) {
        newLastAnswered.shift();
      }

      return {
        ...prev,
        stages: { ...prev.stages, [questionId]: newStage },
        lastAnswered: newLastAnswered,
      };
    });
  }, []);

  const assignModule = useCallback((questionId: string, moduleId: number | null) => {
    setProgress((prev) => ({
      ...prev,
      customModules: { ...prev.customModules, [questionId]: moduleId },
    }));
  }, []);

  const addQuestions = useCallback((newQuestions: Question[]) => {
    setProgress((prev) => {
      const existingQuestions = [...prev.customQuestions, ...RAW_QUESTIONS];
      const existingIds = new Set(existingQuestions.map(q => q.id));
      const existingTexts = new Set(existingQuestions.map(q => q.question.toLowerCase().trim()));
      
      const uniqueNewQuestions: Question[] = [];
      const seenInNewBatch = new Set<string>();

      for (const newQ of newQuestions) {
        const text = newQ.question.toLowerCase().trim();
        // Check if ID or Text already exists
        if (!existingIds.has(newQ.id) && !existingTexts.has(text) && !seenInNewBatch.has(newQ.id)) {
          uniqueNewQuestions.push(newQ);
          seenInNewBatch.add(newQ.id);
        }
      }

      return {
        ...prev,
        customQuestions: [...prev.customQuestions, ...uniqueNewQuestions]
      };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress((defaultProgress as any as Progress) || { 
      stages: {}, 
      customModules: {}, 
      lastAnswered: [], 
      customQuestions: [],
      modulePositions: {}
    });
  }, []);

  const resetStages = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      stages: {},
      lastAnswered: [],
      modulePositions: {}
    }));
  }, []);

  const importProgress = useCallback((data: Progress) => {
    setProgress(data);
  }, []);

  const getQuestionModule = useCallback((q: Question) => {
    return progress.customModules[q.id] ?? q.moduleId;
  }, [progress.customModules]);

  const allQuestions = useMemo(() => {
    const map = new Map<string, Question>();
    [...RAW_QUESTIONS, ...progress.customQuestions].forEach(q => {
      map.set(q.id, q);
    });
    return Array.from(map.values());
  }, [progress.customQuestions]);

  const questions = useMemo(() => {
    return allQuestions.map(q => {
      const customMid = progress.customModules[q.id];
      const originalMid = q.moduleId;
      
      const effectiveMid = customMid !== undefined ? customMid : originalMid;
      
      // Ensure it's a number or null, and avoid 0 if it was null/undefined
      const finalMid = (effectiveMid !== null && effectiveMid !== undefined) 
        ? Number(effectiveMid) 
        : null;
      
      return {
        ...q,
        currentModuleId: isNaN(finalMid as number) ? null : finalMid,
        stage: progress.stages[q.id] || 0
      };
    });
  }, [allQuestions, progress.customModules, progress.stages]);

  const resetModulePosition = useCallback((moduleId: number | null) => {
    if (moduleId === null) return;
    setProgress((prev) => {
      const newPositions = { ...prev.modulePositions };
      delete newPositions[moduleId.toString()];
      return {
        ...prev,
        modulePositions: newPositions
      };
    });
  }, []);

  const updateModulePosition = useCallback((moduleId: number | null, index: number) => {
    if (moduleId === null) return;
    setProgress((prev) => {
      if (prev.modulePositions[moduleId.toString()] === index) return prev;
      return {
        ...prev,
        modulePositions: {
          ...prev.modulePositions,
          [moduleId.toString()]: index
        }
      };
    });
  }, []);

  const updateGeminiApiKey = useCallback((key: string) => {
    setProgress((prev) => ({
      ...prev,
      geminiApiKey: key
    }));
  }, []);

  return {
    progress,
    questions,
    updateStage,
    assignModule,
    addQuestions,
    resetProgress,
    resetStages,
    resetModulePosition,
    updateModulePosition,
    updateGeminiApiKey,
    importProgress,
    getQuestionModule
  };
}
