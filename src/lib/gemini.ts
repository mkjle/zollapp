import { GoogleGenAI } from "@google/genai";

/**
 * WICHTIG: Hier kannst du deinen API-Key direkt eintragen, 
 * falls die Umgebungsvariablen nicht funktionieren.
 * Beispiel: const MANUAL_API_KEY = "AIzaSy...";
 */
const MANUAL_API_KEY = "AIzaSyBxrMEXfMJTIEcW8JFsIWFGudh5hS8U0qk"; 

export const getApiKey = () => {
  return MANUAL_API_KEY || 
         process.env.GEMINI_API_KEY || 
         (import.meta as any).env?.VITE_GEMINI_API_KEY || 
         "";
};

export const getGemini = () => {
  const key = getApiKey();
  if (!key) {
    throw new Error("Gemini API Key nicht gefunden. Bitte in src/lib/gemini.ts eintragen.");
  }
  return new GoogleGenAI({ apiKey: key });
};

export const explainQuestion = async (question: string, answer: string | string[], context?: string) => {
  const ai = getGemini();
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Du bist ein hochqualifizierter KI-Experte für eine Fachprüfung (z.B. Sachkundeprüfung nach § 34a GewO oder ähnliches).
    Deine Aufgabe ist es, die folgende Frage und die dazugehörige richtige Lösung fachlich fundiert und verständlich zu erklären.
    
    FRAGE: "${question}"
    RICHTIGE LÖSUNG: "${Array.isArray(answer) ? answer.join(", ") : answer}"
    QUELLEN/KONTEXT: ${context || "Keine Quellen angegeben"}
    
    WICHTIGE REGELN:
    - KEINE Begrüßung (z.B. kein "Hallo", "Guten Tag", "Hier ist die Erklärung").
    - KEINE Einleitung.
    - KEINE Verabschiedung oder Schlussfloskeln am Ende.
    - Beginne DIREKT mit der fachlichen Erklärung.
    
    BITTE GEHE WIE FOLGT VOR:
    1. Erkläre kurz und prägnant, warum die Lösung korrekt ist.
    2. Nimm, falls sinnvoll und möglich, Bezug auf konkrete Gesetze, Paragraphen oder Vorschriften (z.B. GewO, BGB, StGB, BewachV).
    3. Gib einen praktischen Tipp oder eine Merkhilfe, um sich dieses Wissen für die Prüfung besser einzuprägen.
    
    Antworte auf Deutsch in einem professionellen Ton. Benutze Markdown für eine klare Strukturierung (Fettgedrucktes, Listen, etc.).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
};

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  const ai = getGemini();
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          data: base64Audio,
          mimeType,
        },
      },
      {
        text: "Transkribiere dieses Audio exakt auf Deutsch. Gib nur den Text zurück.",
      },
    ],
  });

  return response.text;
};
