import { GeminiApiError, handleGeminiRequest } from '../server/gemini';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleGeminiRequest(body, req.headers.authorization, process.env);
    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof GeminiApiError ? error.status : 500;
    const message = error instanceof GeminiApiError && status < 500
      ? error.message
      : 'AI request failed.';

    console.error('Gemini API error:', error);
    return res.status(status).json({ error: message });
  }
}
