import { generateContent, Type } from './geminiClient';

export async function analyzePunchPhoto(base64Image: string) {
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are a Construction Quality Control Inspector. 
    Analyze the attached photo of a site deficiency and extract the following details for a punch list entry.
    
    Tasks:
    1. Describe the defect or deficiency clearly.
    2. Assign it to the correct CSI Division (e.g., Division 09 - Finishes, Division 03 - Concrete).
    3. Suggest the most likely responsible subcontractor (e.g., Painter, Concrete Sub, Electrician).
    4. Provide conceptual floor plan coordinates (x and y as values between 0 and 100) representing where this issue might be pinned on a logical 100x100 grid.
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "description": "string",
      "csiDivision": "string",
      "responsibleSub": "string",
      "location": "string (e.g. Room 302, North Wall)",
      "coordinates": { "x": number, "y": number }
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
            description: { type: Type.STRING },
            csiDivision: { type: Type.STRING },
            responsibleSub: { type: Type.STRING },
            location: { type: Type.STRING },
            coordinates: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER }
              },
              required: ["x", "y"]
            }
          },
          required: ["description", "csiDivision", "responsibleSub", "location", "coordinates"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Punch Photo Analysis Error:", error);
    throw error;
  }
}
