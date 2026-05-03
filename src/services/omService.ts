import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function extractEquipmentData(manualText: string) {
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are a Facilities Maintenance Engineer. 
    Analyze the following text from an Equipment O&M Manual and extract data for CMMS importation.
    
    Manual Content:
    "${manualText}"
    
    Tasks:
    1. Identify the Equipment Tag ID (e.g., AHU-1, P-01).
    2. Identify the Equipment Name, Manufacturer, and Model Number.
    3. Extract the 'Recommended Maintenance Schedule' (Tasks and Frequencies).
    4. List all 'Spare Parts' with their corresponding part numbers if mentioned.
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "tagId": "string",
      "equipmentName": "string",
      "manufacturer": "string",
      "modelNumber": "string",
      "maintenanceSchedule": [
        { "task": "string", "frequency": "string" },
        ...
      ],
      "spareParts": [
        { "name": "string", "partNumber": "string" },
        ...
      ]
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
            tagId: { type: Type.STRING },
            equipmentName: { type: Type.STRING },
            manufacturer: { type: Type.STRING },
            modelNumber: { type: Type.STRING },
            maintenanceSchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  frequency: { type: Type.STRING }
                },
                required: ["task", "frequency"]
              }
            },
            spareParts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  partNumber: { type: Type.STRING }
                },
                required: ["name", "partNumber"]
              }
            }
          },
          required: ["tagId", "equipmentName", "manufacturer", "modelNumber", "maintenanceSchedule", "spareParts"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("OM Extraction Error:", error);
    throw error;
  }
}
