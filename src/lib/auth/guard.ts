import { createClient, getAuthenticatedUser, type AppUser } from '@/utils/supabase/server';
import { hasRole, type Role } from './rbac';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Data Access Layer guards
//
// Next 16's proxy runs ahead of the app and is only an optimistic check; it can
// be bypassed by anything that calls a Server Action or Route Handler directly.
// Authorization is therefore re-asserted here, at the point of data access.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/** Resolve the caller or throw 401. Never returns a placeholder identity. */
export async function requireUser(): Promise<AppUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthError('Unauthorized. Please sign in to continue.', 401);
  }
  return user;
}

/** Resolve the caller and assert they sit at or above `role`, else throw 401/403. */
export async function requireRole(role: Role): Promise<AppUser> {
  const user = await requireUser();
  if (!hasRole(user.role, role)) {
    throw new AuthError(`Forbidden. This action requires the ${role} role or higher.`, 403);
  }
  return user;
}

/**
 * Append to the immutable audit trail. Best-effort by design: an audit write
 * must never take down the action it is describing, but failures are logged so
 * a missing trail is visible in ops rather than silent.
 */
export async function recordAuditEvent(entry: {
  actorId: string;
  actorEmail?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      resource: entry.resource ?? null,
      metadata: entry.metadata ?? {},
    });
    if (error) console.warn('[Audit] Failed to persist audit event:', error.message);
  } catch (err) {
    console.warn('[Audit] Audit sink unavailable:', err instanceof Error ? err.message : err);
  }
}
