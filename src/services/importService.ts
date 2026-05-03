import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * Parses an Excel or CSV file into a JSON array of rows
 */
export async function parseExcelToRawData(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

export interface ExtractedTask {
  title: string;
  description?: string;
  division?: string;
  subcontractor?: string;
  startDate?: string; // YYYY-MM-DD
  finishDate?: string; // YYYY-MM-DD
  dueDate?: string; // Keep for compatibility
  activityId?: string;
}

/**
 * Uses Gemini to intelligently map raw Excel rows to construction tasks
 */
export async function extractTasksWithGemini(rawItems: any[]): Promise<ExtractedTask[]> {
  if (!rawItems || rawItems.length === 0) return [];

  // Filter out completely empty or irrelevant rows to maximize the context window effectiveness
  const cleanedItems = rawItems.filter(item => {
    const values = Object.values(item).filter(v => v !== null && v !== "" && v !== undefined);
    return values.length >= 2; // Need at least two columns with data to be a likely task
  });

  // Construction schedules can be long. We process a significant chunk.
  // Gemini 3 Flash has a massive context window; 1500 rows is very safe for Flash 
  // and covers almost all high-level site schedules.
  const sampleData = cleanedItems.slice(0, 1500); 
  const jsonStr = JSON.stringify(sampleData);
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert Construction Scheduler and project analyst. I will provide you with a JSON array of rows from a construction schedule (Excel/CSV).
    
    Your goal: Extract ALL actionable activities with high accuracy.
    
    CRITICAL INSTRUCTIONS:
    1. COLUMN MAPPING: First, scan the data to identify columns like "Activity ID", "Activity Name", "Start", "Finish", "Subcontractor", "Trade". Note columns might have different names (e.g. "Vendor" instead of "Subcontractor").
    2. ROW TYPES: 
       - Activities are specific tasks (e.g. "Install Drywall", "Pour Slab").
       - Summary levels (WBS) represent phases (e.g. "Building A", "Finishes").
       - DO NOT extract summary levels, only actionable activities.
    3. DETECTING ACTIVITIES: A row is an activity if it has a specific task name and usually has a date. If a row has dates but look like a summary, skip it.
    4. FIELD EXTRACTION:
       - 'title': The primary name of the activity.
       - 'activityId': If the schedule has a unique ID for the activity (like 'A1020'), extract it here.
       - 'startDate': The planned START date of the activity.
       - 'finishDate': The planned FINISH (completion) date of the activity.
       - 'dueDate': Map this to the finish date as well for backward compatibility.
       - 'division': The trade/division.
       - 'subcontractor': The assigned company.
    5. DATE FORMATTING:
       - AMBIGUITY AWARENESS: Be extremely careful with MM/DD/YY vs DD/MM/YY. For a US-based project (USPS Louisville), MM/DD/YY is standard. If you see "04/08/27", interpret it based on context or common US patterns unless clearly shown otherwise.
       - IMPORTANT: Some Excel files use serial numbers for dates (e.g. 45312). Convert these to 'YYYY-MM-DD'. (45312 is around early 2024).
       - Always return 'YYYY-MM-DD' strings.
    6. DATA CLEANING: Strip leading/trailing spaces or special characters (like indentation dashes used for hierarchies) from titles.
    
    Raw Data: ${jsonStr}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { 
              type: Type.STRING,
              description: "The name of the activity or task"
            },
            description: { 
              type: Type.STRING,
              description: "Brief extra detail from other columns if relevant (e.g. area, floor)"
            },
            division: {
              type: Type.STRING,
              description: "The CSI division code or name (e.g. '03 Concrete', '09 Finishes')"
            },
            subcontractor: {
              type: Type.STRING,
              description: "The name of the company or trade assigned to the task"
            },
            activityId: {
               type: Type.STRING,
               description: "A unique identifier for the task if found in the schedule (e.g. 'A1001')"
            },
            startDate: { 
              type: Type.STRING, 
              description: "The start date in YYYY-MM-DD format"
            },
            finishDate: { 
              type: Type.STRING, 
              description: "The completion date in YYYY-MM-DD format"
            },
            dueDate: { 
              type: Type.STRING, 
              description: "Alias for finishDate in YYYY-MM-DD format"
            },
          },
          required: ["title"]
        }
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return [];
    
    // Sometimes Gemini might wrap the array in a markdown block or add chatter, 
    // though responseMimeType usually prevents this. We'll be safe.
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      // Fallback for markdown-wrapped JSON if it happens
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }
    
    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response for task extraction:", e);
    return [];
  }
}
