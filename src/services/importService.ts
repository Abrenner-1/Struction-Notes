import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import { generateContent, Type } from './geminiClient';

const MAX_IMPORT_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * Parses an Excel or CSV file into a JSON array of rows
 */
export async function parseExcelToRawData(file: File): Promise<Record<string, unknown>[]> {
  validateScheduleImportFile(file);

  if (isCsvFile(file)) {
    return parseCsvToRawData(file);
  }

  const rows = await readSheet(file);
  return rowsToObjects(rows);
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
  
  const response = await generateContent({
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

function validateScheduleImportFile(file: File) {
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new Error('Schedule import files must be 20 MB or smaller.');
  }

  const name = file.name.toLowerCase();
  if (name.endsWith('.xls')) {
    throw new Error('Legacy .xls files are not supported for security reasons. Please save the file as .xlsx or .csv and import again.');
  }

  if (!name.endsWith('.xlsx') && !name.endsWith('.csv')) {
    throw new Error('Schedule imports must be .xlsx or .csv files.');
  }
}

function isCsvFile(file: File) {
  return file.name.toLowerCase().endsWith('.csv');
}

function parseCsvToRawData(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => String(header || '').trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
          return;
        }

        resolve(results.data.map(normalizeObjectRow).filter(rowHasValues));
      },
      error: (error) => reject(error),
    });
  });
}

function rowsToObjects(rows: unknown[][]): Record<string, unknown>[] {
  const headerIndex = rows.findIndex(rowHasValues);
  if (headerIndex === -1) return [];

  const headers = buildHeaders(rows[headerIndex]);
  return rows
    .slice(headerIndex + 1)
    .filter(rowHasValues)
    .map((row) => {
      const item: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        item[header] = normalizeCellValue(row[index]);
      });
      return item;
    })
    .filter(rowHasValues);
}

function buildHeaders(headerRow: unknown[]): string[] {
  const seen = new Map<string, number>();

  return headerRow.map((cell, index) => {
    const base = String(normalizeCellValue(cell) || `Column ${index + 1}`).trim();
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} ${count + 1}`;
  });
}

function normalizeObjectRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeCellValue(value)]),
  );
}

function normalizeCellValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value ?? '';
}

function rowHasValues(row: unknown[] | Record<string, unknown>): boolean {
  const values = Array.isArray(row) ? row : Object.values(row);
  return values.some((value) => String(value ?? '').trim().length > 0);
}
