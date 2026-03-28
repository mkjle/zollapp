import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { GoogleGenAI, Type } from "@google/genai";
import { Question, MODULES } from "../data/questions";
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";

// Correct worker setup for Vite
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfUploadProps {
  onQuestionsAdded: (questions: Question[]) => void;
}

export function PdfUpload({ onQuestionsAdded }: PdfUploadProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [foundCount, setFoundCount] = useState(0);
  const [quarterStatuses, setQuarterStatuses] = useState<string[]>(["", "", "", ""]);

  const extractTextFromPdf = async (file: File): Promise<{ text: string; pageCount: number }[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    loadingTask.onProgress = (progressData) => {
      if (progressData.total > 0) {
        const percent = Math.round((progressData.loaded / progressData.total) * 100);
        setStatus(`Lade PDF (${percent}%)...`);
      }
    };

    const pdf = await loadingTask.promise;
    const pages: { text: string; pageCount: number }[] = [];
    
    setProgress({ current: 0, total: pdf.numPages });

    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus(`Lese Seite ${i} von ${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(" ");
      pages.push({ text, pageCount: i });
      setProgress(prev => ({ ...prev, current: i }));
    }

    return pages;
  };

  const processChunk = async (chunk: { text: string; pageCount: number }[], fileName: string, ai: GoogleGenAI, chunkIndex: number, retryCount = 0): Promise<Question[]> => {
    const combinedText = chunk.map(p => `[PAGE ${p.pageCount}]\n${p.text}`).join("\n\n");
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extrahiere ALLE Prüfungsfragen und Antworten aus dem folgenden Text für die Zoll-Prüfungsvorbereitung.
        
        WICHTIG:
        1. Jede Frage muss eine klare, präzise Antwort haben.
        2. Ordne jede Frage einem dieser Module zu (nur die ID zurückgeben):
           - 2: Staats-, Europa- & Verwaltungsrecht
           - 3: BGB, HGR & Beamtenrecht
           - 4: BWL & Haushalt
           - 5: Abgabenordnung (AO)
           - 6: Verbrauchssteuerrecht
           - 7: Zollrecht & Außenwirtschaft
           - 8: Strafprozessrecht
        
        Antworte NUR mit einem validen JSON-Array.
        
        Text:
        ${combinedText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.ARRAY, items: { type: Type.STRING } },
                moduleId: { type: Type.NUMBER, description: "Die ID des Moduls (2-8)" },
                reasoning: { type: Type.STRING, description: "Kurze Begründung für die Modulwahl" },
                page: { type: Type.NUMBER }
              },
              required: ["question", "answer", "page", "moduleId", "reasoning"]
            }
          }
        }
      });

      const text = response.text || "[]";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanJson);
      
      const questions: Question[] = result.map((q: any, idx: number) => {
        // Ensure moduleId is valid or null
        let mid = q.moduleId ? Number(q.moduleId) : null;
        if (mid && (mid < 2 || mid > 8)) mid = null;

        return {
          id: `ext-${fileName.replace(/[^a-z0-9]/gi, '_')}-p${q.page || chunk[0].pageCount}-${chunkIndex}-${idx}`,
          question: q.question,
          answer: Array.isArray(q.answer) ? q.answer : [String(q.answer)],
          moduleId: mid,
          sources: [{ doc: fileName, page: q.page || chunk[0].pageCount }]
        };
      });
      
      setFoundCount(prev => prev + questions.length);
      return questions;
    } catch (e) {
      console.error(`Error processing chunk starting at page ${chunk[0].pageCount}`, e);
      if (retryCount < 2) {
        // Wait a bit before retrying to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return processChunk(chunk, fileName, ai, chunkIndex, retryCount + 1);
      }
      return [];
    }
  };

  const processWithGemini = async (pdfData: { text: string; pageCount: number }[], fileName: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chunkSize = 4; // Smaller chunks for better reliability and avoiding output limits
    
    const quarterSize = Math.ceil(pdfData.length / 4);
    const quarters = [
      pdfData.slice(0, quarterSize),
      pdfData.slice(quarterSize, quarterSize * 2),
      pdfData.slice(quarterSize * 2, quarterSize * 3),
      pdfData.slice(quarterSize * 3)
    ];

    setStatus(`Analysiere Dokument in 4 parallelen Prozessen...`);
    setFoundCount(0);
    setQuarterStatuses(["Warten...", "Warten...", "Warten...", "Warten..."]);

    const processQuarter = async (quarterData: { text: string; pageCount: number }[], qIdx: number) => {
      // Stagger the start of each quarter slightly to avoid initial rate limit burst
      await new Promise(resolve => setTimeout(resolve, qIdx * 1500));
      
      if (quarterData.length === 0) {
        setQuarterStatuses(prev => {
          const next = [...prev];
          next[qIdx] = "Keine Seiten";
          return next;
        });
        return [];
      }

      const quarterQuestions: Question[] = [];
      for (let i = 0; i < quarterData.length; i += chunkSize) {
        const chunk = quarterData.slice(i, i + chunkSize);
        const startPage = chunk[0].pageCount;
        const endPage = chunk[chunk.length - 1].pageCount;
        
        setQuarterStatuses(prev => {
          const next = [...prev];
          next[qIdx] = `Seiten ${startPage}-${endPage} (${Math.round((i / quarterData.length) * 100)}%)`;
          return next;
        });

        const questions = await processChunk(chunk, fileName, ai, qIdx * 1000 + i);
        quarterQuestions.push(...questions);
      }
      
      setQuarterStatuses(prev => {
        const next = [...prev];
        next[qIdx] = "Fertig!";
        return next;
      });
      
      return quarterQuestions;
    };

    // Run all 4 quarters in parallel
    const results = await Promise.all(quarters.map((q, idx) => processQuarter(q, idx)));
    
    return results.flat();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setStatus("Initialisiere...");
    setFoundCount(0);

    try {
      const pdfData = await extractTextFromPdf(file);
      setStatus("KI-Extraktion startet...");
      const questions = await processWithGemini(pdfData, file.name);
      
      if (questions.length > 0) {
        onQuestionsAdded(questions);
        setStatus(`Erfolgreich ${questions.length} Fragen extrahiert!`);
      } else {
        setError("Keine Fragen im Dokument gefunden.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Fehler: " + (err.message || "Unbekannter Fehler bei der PDF-Verarbeitung"));
    } finally {
      setIsExtracting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-sm hover:border-indigo-300 transition-all group">
      <div className="flex flex-col items-center justify-center gap-6">
        {isExtracting ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-md">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            
            <div className="w-full space-y-4">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="truncate">{status}</span>
                {progress.total > 0 && (
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                )}
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                />
              </div>

              {isExtracting && quarterStatuses.some(s => s !== "") && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {quarterStatuses.map((s, i) => (
                    <div key={i} className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Prozess {i + 1}</div>
                      <div className="text-xs font-medium text-slate-600 truncate">{s || "Warten..."}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {foundCount > 0 && (
                <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold text-sm animate-pulse pt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {foundCount} Fragen bisher gefunden...
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900">PDF Fragen-Extraktor</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Lade dein PDF hoch. Die KI liest alle Fragen und Antworten automatisch aus.
              </p>
            </div>
            <label className="cursor-pointer bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
              PDF auswählen
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={isExtracting}
              />
            </label>
          </>
        )}

        {error && (
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl text-sm font-medium border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {!isExtracting && status.includes("Erfolgreich") && (
          <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-2xl text-sm font-bold border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
