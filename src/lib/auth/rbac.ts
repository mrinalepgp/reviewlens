// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Role-Based Access Control — canonical role ladder for ReviewLens
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ROLES = ['viewer', 'analyst', 'org_admin', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];

/** Higher rank == more privilege. Used for `>=` comparisons, never string equality. */
const RANK: Record<Role, number> = {
  viewer: 0,
  analyst: 1,
  org_admin: 2,
  superadmin: 3,
};

/**
 * Legacy role strings persisted by earlier builds (`admin`, `free`) and the
 * marketing-facing plan names still land in `user_metadata.role`. Normalize
 * everything through one funnel so authorization never branches on a raw string.
 */
export function normalizeRole(raw: unknown): Role {
  const value = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (value) {
    case 'superadmin':
    case 'super_admin':
    case 'admin':
      return 'superadmin';
    case 'org_admin':
    case 'orgadmin':
    case 'owner':
      return 'org_admin';
    case 'analyst':
    case 'member':
      return 'analyst';
    default:
      return 'viewer';
  }
}

/** True when `actual` sits at or above `required` on the ladder. */
export function hasRole(actual: unknown, required: Role): boolean {
  return RANK[normalizeRole(actual)] >= RANK[required];
}

export function isAdminRole(actual: unknown): boolean {
  return hasRole(actual, 'org_admin');
}

export const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Viewer',
  analyst: 'Analyst',
  org_admin: 'Org Admin',
  superadmin: 'SuperAdmin',
};
