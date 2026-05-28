import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { GeminiApiError, handleGeminiRequest, parseJsonRequest } from './server/gemini';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), geminiDevApiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

function geminiDevApiPlugin(env: Record<string, string>) {
  return {
    name: 'struction-notes-gemini-dev-api',
    configureServer(server: any) {
      server.middlewares.use('/api/gemini', async (req: any, res: any) => {
        res.setHeader('Cache-Control', 'no-store');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST');
          res.end(JSON.stringify({ error: 'Method not allowed.' }));
          return;
        }

        try {
          const body = await parseJsonRequest(req);
          const result = await handleGeminiRequest(body, req.headers.authorization, {
            ...process.env,
            ...env,
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (error) {
          const status = error instanceof GeminiApiError ? error.status : 500;
          const message = error instanceof GeminiApiError && status < 500
            ? error.message
            : 'AI request failed.';

          console.error('Gemini dev API error:', error);
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}
