import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function transformDailyNotes(rawNotes: string) {
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are a professional Project Superintendent. 
    Analyze the following informal field notes and transform them into a professional construction daily report narrative.
    
    Informal Notes:
    "${rawNotes}"
    
    Tasks:
    1. Expand the work description into a professional 'Work Accomplished' section.
    2. Specifically isolate any 'Delays/Issues' (weather, equipment breakdown, manpower shortages, etc.).
    3. Suggest at least one but up to 3 'Action Items' for the Project Engineer (PE) or Superintendent based on mentions of delays or issues.
    4. Extract/Estimate the Total Manpower count if mentioned.
    5. Summarize the Weather if mentioned.
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "narrativeWorkAccomplished": "string",
      "narrativeDelaysIssues": "string",
      "suggestedActionItems": ["string", ...],
      "manpowerCount": number,
      "weatherCondition": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrativeWorkAccomplished: { type: Type.STRING },
            narrativeDelaysIssues: { type: Type.STRING },
            suggestedActionItems: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            manpowerCount: { type: Type.NUMBER },
            weatherCondition: { type: Type.STRING }
          },
          required: ["narrativeWorkAccomplished", "narrativeDelaysIssues", "suggestedActionItems", "manpowerCount", "weatherCondition"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Daily Log Transformer Error:", error);
    throw error;
  }
}
