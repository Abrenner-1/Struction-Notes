import { generateContent, Type } from './geminiClient';

export async function analyzeDailyLog(rawLog: string, trackerData: any) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a Construction Production Analyst. 
    Analyze the following raw field log and extract the installation quantity.
    
    Log: "${rawLog}"
    Item: ${trackerData.itemName}
    Unit: ${trackerData.unit}
    Estimated Total: ${trackerData.totalEstimatedQuantity}
    Already Installed: ${trackerData.installedQuantity}
    
    Tasks:
    1. Extract the number of ${trackerData.unit} installed from the log.
    2. Provide a short note describing the installation activities.
    3. Calculate the new total installed percentage.
    4. Estimate the remaining working days until completion based on a hypothetical burn rate derived from this entry (use your best judgment for a typical daily output if it seems consistent).
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "quantity": number,
      "notes": "string",
      "percentComplete": number,
      "burnRateInfo": "string (e.g. 50 CY/day average)",
      "estimatedCompletionDays": number
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
            quantity: { type: Type.NUMBER },
            notes: { type: Type.STRING },
            percentComplete: { type: Type.NUMBER },
            burnRateInfo: { type: Type.STRING },
            estimatedCompletionDays: { type: Type.NUMBER }
          },
          required: ["quantity", "notes", "percentComplete", "burnRateInfo", "estimatedCompletionDays"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Quantity Analysis Error:", error);
    throw error;
  }
}
