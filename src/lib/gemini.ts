import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const getGemini = () => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export const explainQuestion = async (question: string, answer: string | string[], context?: string) => {
  const ai = getGemini();
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Du bist ein hilfreicher KI-Tutor für eine Fachprüfung (z.B. Sachkundeprüfung).
    Erkläre die folgende Frage und die richtige Lösung verständlich.
    Nimm Bezug auf die richtige Lösung und erkläre sie so, dass man sie sich gut merken kann.
    Falls sinnvoll und möglich, nimm Bezug auf relevante Gesetze oder Vorschriften.
    
    Frage: ${question}
    Richtige Lösung: ${Array.isArray(answer) ? answer.join(", ") : answer}
    ${context ? `Zusätzlicher Kontext: ${context}` : ""}
    
    Antworte auf Deutsch in einem freundlichen, erklärenden Ton. Benutze Markdown für die Formatierung.
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
        text: "Transkribiere dieses Audio exakt. Gib nur den transkribierten Text zurück, nichts anderes.",
      },
    ],
  });

  return response.text;
};
