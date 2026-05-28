import { generateContent, Type } from './geminiClient';

export async function generatePreConAgenda(specSection: string, submittalInfo: string) {
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are a Construction Quality Control Manager. 
    Analyze the following Specification Section and Approved Submittal information to generate a Pre-Installation Meeting Agenda.
    
    Specification Details:
    ${specSection}
    
    Submittal Details:
    ${submittalInfo}
    
    Tasks:
    1. Identify 'Critical Installation Constraints' (e.g., environmental limits, substrate prep, specific tolerances).
    2. Identify 'Mock-up Requirements' (size, location, required approvals).
    3. Generate a 10-point checklist for the Project Engineer (PE) to use during the meeting to ensure no technical details are missed.
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "criticalConstraints": ["string", ...],
      "mockupRequirements": ["string", ...],
      "checklist": ["string", ...] (must be exactly 10 points)
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
            criticalConstraints: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            mockupRequirements: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            checklist: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["criticalConstraints", "mockupRequirements", "checklist"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Pre-Con Agenda Generation Error:", error);
    throw error;
  }
}
