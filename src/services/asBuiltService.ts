import { generateContent, Type } from './geminiClient';

export async function validateAsBuilt(designImageBase64: string, redlineImageBase64: string) {
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are a Lead Design Coordinator. 
    I am providing two images:
    1. The "Original Design" sheet.
    2. The "Field Redline" (Construction Record) sheet which contains handwritten notes and clouds.
    
    Tasks:
    1. Detect all handwritten redline annotations, 'clouded' changes, or marked deviations.
    2. Summarize each deviation technically (e.g., 'Main electrical feeder rerouted 10 feet East of Column Line J').
    3. Generate a checklist for the CAD team to ensure every field change is accurately reflected in the final digital 'Record Set'.
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "sheetNumber": "string",
      "sheetName": "string",
      "deviations": [
        { "category": "Mechanical" | "Electrical" | "Plumbing" | "Structural" | "General", "description": "string", "location": "string" },
        ...
      ],
      "cadChecklist": ["string", ...]
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
                data: designImageBase64
              }
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: redlineImageBase64
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
            sheetNumber: { type: Type.STRING },
            sheetName: { type: Type.STRING },
            deviations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  location: { type: Type.STRING }
                },
                required: ["category", "description", "location"]
              }
            },
            cadChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["sheetNumber", "sheetName", "deviations", "cadChecklist"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("As-Built Validation Error:", error);
    throw error;
  }
}
