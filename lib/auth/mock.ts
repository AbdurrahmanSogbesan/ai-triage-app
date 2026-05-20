import type { Role } from "@/lib/types";

export const MOCK_COOKIE = "mock-role";

const ROLES: Role[] = ["patient", "clinician", "admin"];

export function isRole(value: string | undefined | null): value is Role {
  return value !== null && value !== undefined && (ROLES as string[]).includes(value);
}

/**
 * Phase 1 mock auth: pick role from the email domain. Replaced in Phase 2 by
 * real Supabase Auth + profile-table role lookup. Keep this file isolated so
 * deleting it is a one-line operation later.
 */
export function roleFromEmail(email: string): Role {
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith("@sunshine.admin.ng")) return "admin";
  if (normalized.endsWith("@sunshine.med.ng")) return "clinician";
  return "patient";
}

export function roleRoot(role: Role): string {
  return `/${role}`;
}
