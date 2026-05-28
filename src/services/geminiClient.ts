import { auth } from '../lib/firebase';

export const Type = {
  TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
  NULL: 'NULL',
} as const;

export interface GenerateContentRequest {
  model: string;
  contents: unknown;
  config?: unknown;
}

export interface GenerateContentResponse {
  text: string;
}

export async function generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Sign in with your account to use AI-assisted tools.');
  }

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || 'AI request failed.');
  }

  return {
    text: typeof payload?.text === 'string' ? payload.text : '',
  };
}
