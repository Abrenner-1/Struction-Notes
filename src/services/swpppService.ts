import { generateContent, Type } from './geminiClient';

export async function analyzeSWPPPPhoto(base64Image: string, bmpName: string) {
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are a Certified Professional in Erosion and Sediment Control (CPESC). 
    Analyze the attached photo of a ${bmpName} (Best Management Practice) for SWPPP compliance.
    
    Tasks:
    1. Detect any failure or deficiency in the ${bmpName} (e.g., fence is down, inlet protection is clogged).
    2. If a failure is detected, describe it clearly.
    3. Create a professional Work Order description for a laborer to fix the issue within the 48-hour EPA window.
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "isCompliant": boolean,
      "failureDescription": "string",
      "workOrderDescription": "string"
    }
  `;

  try {
    const response = await generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCompliant: { type: Type.BOOLEAN },
            failureDescription: { type: Type.STRING },
            workOrderDescription: { type: Type.STRING }
          },
          required: ["isCompliant", "failureDescription", "workOrderDescription"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("SWPPP AI Error:", error);
    throw error;
  }
}
