import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function formulatePCO(rawDescription: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a Construction Change Order expert. Your task is to take a raw field description of a construction change and formulate a professional Potential Change Order (PCO).
    
    Raw Description: "${rawDescription}"
    
    Tasks:
    1. Draft a professional, contractual description for the Owner. Use formal language (e.g., "Contractor was directed to...", "Due to field obstructions...").
    2. Categorize the reason for the change into one of: "Design Gap", "Field Condition", or "Owner Request".
    3. Suggest which RFI number or Drawing Revision might be associated with this change to ensure airtight documentation.
    4. Provide a creative but descriptive Title for the PCO.
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "title": "string",
      "professionalDescription": "string",
      "category": "Design Gap" | "Field Condition" | "Owner Request" | "Other",
      "suggestedReferences": "string (e.g. RFI-102, Rev 4 Sheet A101)"
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
            title: { type: Type.STRING },
            professionalDescription: { type: Type.STRING },
            category: { type: Type.STRING },
            suggestedReferences: { type: Type.STRING }
          },
          required: ["title", "professionalDescription", "category", "suggestedReferences"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini PCO Formulation Error:", error);
    throw error;
  }
}
