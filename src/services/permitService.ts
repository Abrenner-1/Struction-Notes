import { generateContent, Type } from './geminiClient';

export async function processInspectionResult(permitNumber: string, result: string) {
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are a Construction Permit Coordinator. 
    A site inspection for permit ${permitNumber} just concluded with the following result:
    "${result}"
    
    Tasks:
    1. Determine if the inspection failed.
    2. If it failed, extract the specific 'Correction Requirements'.
    3. Draft a professional 'Re-inspection Request' email/letter that the project team can send once corrections are made.
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "isFailed": boolean,
      "correctionRequirements": "string",
      "draftReinspectionRequest": "string"
    }
  `;

  try {
    const response = await generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isFailed: { type: Type.BOOLEAN },
            correctionRequirements: { type: Type.STRING },
            draftReinspectionRequest: { type: Type.STRING }
          },
          required: ["isFailed", "correctionRequirements", "draftReinspectionRequest"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Permit AI Error:", error);
    throw error;
  }
}
