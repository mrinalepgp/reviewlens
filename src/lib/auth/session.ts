import { createHmac, timingSafeEqual } from 'node:crypto';
import { normalizeRole, type Role } from './rbac';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Signed operator session
//
// The operator ("dev bypass") session is a cookie the server mints for the
// seeded SuperAdmin / demo accounts that skip the Supabase email-confirmation
// round trip. It used to be raw JSON: `httpOnly` stops page scripts reading it,
// but nothing stopped a caller forging `{"role":"admin"}` with curl, which read
// straight through to `user.devRole === 'admin'`. Every cookie is now HMAC
// signed and verified before its claims are trusted, and unsigned cookies are
// rejected outright.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const OPERATOR_SESSION_COOKIE = 'reviewlens_dev_session';
export const OPERATOR_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface OperatorSession {
  id: string;
  email: string;
  role: Role;
  plan: string;
  credits: number;
  fullName: string;
  /** Unix seconds. Verified server-side so an expired cookie cannot be replayed. */
  exp: number;
}

function resolveSecret(): string | null {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Serialize + sign a session. Returns `null` when no signing secret is
 * configured — callers must treat that as "operator login unavailable" rather
 * than silently issuing an unauthenticated cookie.
 */
export function encodeOperatorSession(
  session: Omit<OperatorSession, 'exp'> & { exp?: number }
): string | null {
  const secret = resolveSecret();
  if (!secret) {
    console.error(
      '[Auth] AUTH_SESSION_SECRET (or NEXTAUTH_SECRET) is unset or shorter than 16 chars — refusing to mint an operator session.'
    );
    return null;
  }
  const payload: OperatorSession = {
    ...session,
    role: normalizeRole(session.role),
    exp: session.exp ?? Math.floor(Date.now() / 1000) + OPERATOR_SESSION_MAX_AGE,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

/**
 * Verify signature + expiry and return the claims, or `null` for anything
 * suspect: missing secret, malformed cookie, bad signature, legacy unsigned
 * JSON, or an expired session.
 */
export function verifyOperatorSession(raw: string | undefined | null): OperatorSession | null {
  if (!raw) return null;
  const secret = resolveSecret();
  if (!secret) return null;

  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return null; // legacy unsigned JSON cookie — reject

  const body = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (!safeEqual(signature, sign(body, secret))) return null;

  let payload: OperatorSession;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload?.id || !payload?.email) return null;
  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;

  // Re-normalize on read: the ladder is the only thing authorization consults.
  payload.role = normalizeRole(payload.role);
  return payload;
}

export const OPERATOR_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: OPERATOR_SESSION_MAX_AGE,
} as const;
