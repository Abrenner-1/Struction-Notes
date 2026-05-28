import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function walk(relativeDir) {
  const absoluteDir = join(root, relativeDir);
  return readdirSync(absoluteDir).flatMap((entry) => {
    const relativePath = join(relativeDir, entry);
    const absolutePath = join(root, relativePath);
    return statSync(absolutePath).isDirectory() ? walk(relativePath) : [relativePath];
  });
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const packageJson = JSON.parse(read('package.json'));
const dependencies = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
};

const srcFiles = walk('src').filter((file) => /\.(ts|tsx)$/.test(file));
const clientSource = srcFiles.map((file) => [file, read(file)]);

for (const [file, source] of clientSource) {
  assert(!source.includes('@google/genai'), `${file} imports @google/genai in client source`);
  assert(!source.includes('process.env.GEMINI_API_KEY'), `${file} reads GEMINI_API_KEY in client source`);
}

const viteConfig = read('vite.config.ts');
assert(!viteConfig.includes("'process.env.GEMINI_API_KEY'"), 'vite.config.ts still injects GEMINI_API_KEY into the browser bundle');
assert(!viteConfig.includes('"process.env.GEMINI_API_KEY"'), 'vite.config.ts still injects GEMINI_API_KEY into the browser bundle');

assert(!dependencies.xlsx, 'xlsx dependency is still installed');
assert(!dependencies.express, 'express dependency is still installed');
assert(!dependencies['@types/express'], '@types/express dependency is still installed');

assert(read('api/gemini.ts').includes('handleGeminiRequest'), 'api/gemini.ts does not use the secured Gemini handler');
assert(read('server/gemini.ts').includes('verifyFirebaseIdToken'), 'server/gemini.ts does not verify Firebase ID tokens');

for (const file of [
  'src/components/Meetings.tsx',
  'src/views/ProjectCanvas.tsx',
  'src/components/NoteCard.tsx',
  'src/components/TaskItem.tsx',
]) {
  assert(read(file).includes('sanitizeRichText'), `${file} is missing rich-text sanitization`);
}

if (failures.length > 0) {
  console.error('Security fix checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Security fix checks passed.');
