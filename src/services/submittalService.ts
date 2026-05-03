import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeSubmittalLog(rawData: string) {
  const model = "gemini-3-flash-preview";

  const prompt = `
    You are a Construction Project Manager assistant. I am providing you with a raw text dump from a construction submittal log (CSV or PDF content).
    
    Tasks:
    1. Parse the data into specific submittal items.
    2. Extract: Spec Section, Description, Subcontractor, Scheduled Install Date (YYYY-MM-DD), and Manufacturer Lead Time (in weeks).
    3. Calculate 'Procurement Float' for every item. 
       Float Calculation: [Scheduled Install Date] - (Today: ${new Date().toISOString().split('T')[0]}) - (Lead Time Weeks * 7).
    4. Categorize Traffic Light Status:
       - 'red': Float < 14 days
       - 'yellow': Float between 14 and 30 days
       - 'green': Float > 30 days
    5. Identify 'Follow-up Priority' (High/Medium/Low) based on float.
    6. Draft a concise 'Follow-up List' for the PE with specific vendor names and why they should be called.
    
    Raw Data:
    ${rawData}
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
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  specSection: { type: Type.STRING },
                  description: { type: Type.STRING },
                  subcontractor: { type: Type.STRING },
                  scheduledInstallDate: { type: Type.STRING },
                  leadTimeWeeks: { type: Type.NUMBER },
                  procurementFloat: { type: Type.NUMBER },
                  trafficLightStatus: { type: Type.STRING },
                  followUpPriority: { type: Type.STRING },
                  vendorContact: { type: Type.STRING }
                },
                required: ["specSection", "description", "subcontractor", "scheduledInstallDate", "leadTimeWeeks", "procurementFloat", "trafficLightStatus", "followUpPriority"]
              }
            },
            peFollowUpSummary: { type: Type.STRING }
          },
          required: ["items", "peFollowUpSummary"]
        }
      }
    });

    const jsonStr = response.text;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}
