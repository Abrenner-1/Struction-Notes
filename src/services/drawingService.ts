import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function auditDrawingSet(newSetData: string, existingIndex: any[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a Construction Drawing Auditor. I am providing you with:
    1. A raw text dump of a NEW set of revised drawings (index/list).
    2. A JSON list of EXISTING drawings in the current "Set of Record".
    
    Tasks:
    1. Identify 'Added' sheets (in new set but not in existing).
    2. Identify 'Deleted/Removed' sheets (in existing but not in new set).
    3. Identify 'Revised' sheets (same sheet number but new revision date or number).
    4. Extract 'Revision Cloud' changes from the descriptions for each sheet.
    5. Generate a 'Notification List' of affected subcontractors based on the sheet titles and change descriptions (e.g., if a revised sheet is "Electrical Floor Plan", notify Electrical sub).
    
    Output Format: return ONLY a JSON object with this structure:
    {
      "added": [ { "sheetNumber": "string", "sheetTitle": "string", "revisionNumber": "string", "revisionDate": "YYYY-MM-DD", "revisionDescription": "string", "discipline": "string" } ],
      "deleted": [ { "sheetNumber": "string", "sheetTitle": "string" } ],
      "revised": [ { "sheetNumber": "string", "sheetTitle": "string", "revisionNumber": "string", "revisionDate": "YYYY-MM-DD", "revisionDescription": "string", "discipline": "string", "changeSummary": "string" } ],
      "notificationList": [ { "subcontractor": "string", "affectedSheets": ["string"], "reason": "string" } ]
    }

    NEW SET DATA:
    ${newSetData}

    EXISTING INDEX:
    ${JSON.stringify(existingIndex)}
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
            added: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sheetNumber: { type: Type.STRING },
                  sheetTitle: { type: Type.STRING },
                  revisionNumber: { type: Type.STRING },
                  revisionDate: { type: Type.STRING },
                  revisionDescription: { type: Type.STRING },
                  discipline: { type: Type.STRING }
                },
                required: ["sheetNumber", "sheetTitle", "revisionNumber", "revisionDate"]
              }
            },
            deleted: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sheetNumber: { type: Type.STRING },
                  sheetTitle: { type: Type.STRING }
                },
                required: ["sheetNumber", "sheetTitle"]
              }
            },
            revised: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sheetNumber: { type: Type.STRING },
                  sheetTitle: { type: Type.STRING },
                  revisionNumber: { type: Type.STRING },
                  revisionDate: { type: Type.STRING },
                  revisionDescription: { type: Type.STRING },
                  discipline: { type: Type.STRING },
                  changeSummary: { type: Type.STRING }
                },
                required: ["sheetNumber", "sheetTitle", "revisionNumber", "revisionDate"]
              }
            },
            notificationList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subcontractor: { type: Type.STRING },
                  affectedSheets: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reason: { type: Type.STRING }
                },
                required: ["subcontractor", "affectedSheets", "reason"]
              }
            }
          },
          required: ["added", "deleted", "revised", "notificationList"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Audit Error:", error);
    throw error;
  }
}
