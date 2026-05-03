import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function parseWarrantyLetter(letterText: string) {
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are a Project Closeout Manager. 
    Analyze the following text from a subcontractor warranty letter.
    
    Letter Content:
    "${letterText}"
    
    Tasks:
    1. Identify the 'Start Date' (often Substantial Completion) and 'End Date'.
    2. Determine if this qualifies as an 'Extended Warranty' (more than 2 years or specified as extended).
    3. Extract a list of specific 'Exclusions' that might void the warranty.
    4. Identify the Subcontractor and the Scope of Work (e.g., Roofing, HVAC, Plumbing).
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "subcontractor": "string",
      "scopeOfWork": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "isExtended": boolean,
      "exclusions": ["string", ...]
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
            subcontractor: { type: Type.STRING },
            scopeOfWork: { type: Type.STRING },
            startDate: { type: Type.STRING },
            endDate: { type: Type.STRING },
            isExtended: { type: Type.BOOLEAN },
            exclusions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["subcontractor", "scopeOfWork", "startDate", "endDate", "isExtended", "exclusions"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Warranty Parsing Error:", error);
    throw error;
  }
}
