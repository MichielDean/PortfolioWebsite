/**
 * Shared configuration for all job-hunter sources.
 * Single source of truth for target role titles used by all pollers.
 */
export const TARGET_ROLES: string[] = [
  'Director of Engineering',
  'Senior Engineering Manager',
  'VP of Engineering',
  'VP of QA',
];

export function matchesTargetRole(title: string, roles: string[] = TARGET_ROLES): boolean {
  const lower = title.toLowerCase();
  return roles.some((role) => lower.includes(role.toLowerCase()));
}
