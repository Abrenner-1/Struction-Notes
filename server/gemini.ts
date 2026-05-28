import { GoogleGenAI } from '@google/genai';
import { webcrypto } from 'node:crypto';
import { IncomingMessage } from 'node:http';

type EnvSource = Record<string, string | undefined>;

interface GeminiRequestBody {
  model?: unknown;
  contents?: unknown;
  config?: unknown;
}

interface ValidatedGeminiRequest {
  model: string;
  contents: unknown;
  config?: unknown;
}

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface FirebaseJwtPayload {
  aud?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
  user_id?: string;
}

interface JwkSet {
  keys: JsonWebKey[];
}

const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_AI_REQUEST_BYTES = 8 * 1024 * 1024;
const JWKS_CACHE_MS = 60 * 60 * 1000;

let cachedJwks: { keys: JsonWebKey[]; expiresAt: number } | null = null;

export class GeminiApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function parseJsonRequest(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_AI_REQUEST_BYTES) {
      throw new GeminiApiError(413, 'AI request is too large.');
    }
    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new GeminiApiError(400, 'AI request body must be valid JSON.');
  }
}

export async function handleGeminiRequest(
  body: unknown,
  authorizationHeader: string | string[] | undefined,
  env: EnvSource = process.env,
) {
  const request = validateGeminiRequest(body);
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiApiError(500, 'AI service is not configured.');
  }

  await verifyRequestAuthorization(authorizationHeader, env);

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: request.model,
    contents: request.contents,
    config: request.config,
  });

  return {
    text: response.text || '',
  };
}

function validateGeminiRequest(body: unknown): ValidatedGeminiRequest {
  const request = body as GeminiRequestBody;
  const size = Buffer.byteLength(JSON.stringify(request || {}), 'utf8');
  if (size > MAX_AI_REQUEST_BYTES) {
    throw new GeminiApiError(413, 'AI request is too large.');
  }

  if (!request || typeof request !== 'object') {
    throw new GeminiApiError(400, 'AI request body must be an object.');
  }

  if (typeof request.model !== 'string' || !request.model.trim()) {
    throw new GeminiApiError(400, 'AI model is required.');
  }

  if (!request.model.startsWith('gemini-')) {
    throw new GeminiApiError(400, 'AI model is not allowed.');
  }

  if (request.contents === undefined || request.contents === null) {
    throw new GeminiApiError(400, 'AI contents are required.');
  }

  return {
    model: request.model,
    contents: request.contents,
    config: request.config,
  };
}

async function verifyRequestAuthorization(
  authorizationHeader: string | string[] | undefined,
  env: EnvSource,
) {
  if (env.ALLOW_UNVERIFIED_AI_REQUESTS === 'true') {
    return;
  }

  const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new GeminiApiError(500, 'Firebase project ID is required to verify AI requests.');
  }

  const authorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new GeminiApiError(401, 'A valid Firebase sign-in is required for AI tools.');
  }

  await verifyFirebaseIdToken(match[1], projectId);
}

async function verifyFirebaseIdToken(token: string, projectId: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new GeminiApiError(401, 'Invalid Firebase token.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = parseJwtPart<JwtHeader>(encodedHeader);
  const payload = parseJwtPart<FirebaseJwtPayload>(encodedPayload);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new GeminiApiError(401, 'Invalid Firebase token header.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.sub || payload.sub.length > 128) {
    throw new GeminiApiError(401, 'Invalid Firebase token subject.');
  }

  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new GeminiApiError(401, 'Firebase token is for the wrong project.');
  }

  if (!payload.exp || payload.exp <= now || !payload.iat || payload.iat > now + 300) {
    throw new GeminiApiError(401, 'Firebase token is expired or not yet valid.');
  }

  const key = await getFirebaseJwk(header.kid);
  const cryptoKey = await webcrypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const verified = await webcrypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );

  if (!verified) {
    throw new GeminiApiError(401, 'Firebase token signature is invalid.');
  }
}

async function getFirebaseJwk(kid: string): Promise<JsonWebKey> {
  const now = Date.now();
  if (!cachedJwks || cachedJwks.expiresAt <= now) {
    const response = await fetch(FIREBASE_JWKS_URL);
    if (!response.ok) {
      throw new GeminiApiError(503, 'Could not verify Firebase sign-in.');
    }

    const jwks = await response.json() as JwkSet;
    cachedJwks = {
      keys: jwks.keys || [],
      expiresAt: now + JWKS_CACHE_MS,
    };
  }

  const key = cachedJwks.keys.find((candidate) => (candidate as JsonWebKey & { kid?: string }).kid === kid);
  if (!key) {
    throw new GeminiApiError(401, 'Unknown Firebase token key.');
  }

  return key;
}

function parseJwtPart<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(base64UrlToBytes(value)).toString('utf8')) as T;
  } catch {
    throw new GeminiApiError(401, 'Invalid Firebase token payload.');
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Buffer.from(base64, 'base64');
}
