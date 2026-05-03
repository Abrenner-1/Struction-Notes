import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function checkCompliance(subData: any) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a construction 'Compliance Gatekeeper'. 
    Analyze the following subcontractor compliance status:
    Subcontractor: ${subData.subcontractorName}
    COI Expiration: ${subData.coiExpirationDate}
    Contract Signed: ${subData.contractSigned ? 'Yes' : 'No'}
    Safety Plan Approved: ${subData.safetyPlanApproved ? 'Yes' : 'No'}
    Mobilization Date: ${subData.mobilizationDate}
    Current Date: ${new Date().toISOString().split('T')[0]}

    Logic:
    1. If mobilization is within 7 days AND (COI is expired OR safety plan is 'No' OR contract is 'No'), trigger a HIGH PRIORITY alert.
    2. COI is considered expired if expiration date < Current Date.
    3. Draft a professional 'Missing Docs' email to the sub's project coordinator (${subData.contactEmail}) if they are non-compliant.

    Output Format: return ONLY a JSON object with this structure:
    {
      "isHighPriorityAlert": boolean,
      "alertReason": "string (empty if no alert)",
      "suggestedStatus": "Compliant" | "Non-Compliant" | "Expiring Soon",
      "draftEmail": {
        "to": "string",
        "subject": "string",
        "body": "string"
      }
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
            isHighPriorityAlert: { type: Type.BOOLEAN },
            alertReason: { type: Type.STRING },
            suggestedStatus: { type: Type.STRING },
            draftEmail: {
              type: Type.OBJECT,
              properties: {
                to: { type: Type.STRING },
                subject: { type: Type.STRING },
                body: { type: Type.STRING }
              },
              required: ["to", "subject", "body"]
            }
          },
          required: ["isHighPriorityAlert", "alertReason", "suggestedStatus", "draftEmail"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Compliance Check Error:", error);
    throw error;
  }
}
