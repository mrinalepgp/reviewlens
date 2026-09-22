import * as fs from 'fs';
import * as path from 'path';

/**
 * Load `.env.local` into `process.env` for standalone `tsx` scripts, which do
 * not get Next.js's automatic env loading. Existing values win, so an env var
 * exported in the shell always overrides the file.
 */
export function loadEnvLocal(file = '.env.local'): void {
  const envPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
