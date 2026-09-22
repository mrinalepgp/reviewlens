/**
 * Narrow an unknown caught value to a human-readable message.
 *
 * `catch (e: any)` silently defeats type checking across the whole block; this
 * lets call sites use `catch (e)` (typed `unknown`) and still read a message.
 */
export function errorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}
