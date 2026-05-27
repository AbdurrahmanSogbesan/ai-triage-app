import type { Enums } from "@/types/database";

export type Role = Enums<"user_role">;

export function roleRoot(role: Role): string {
  return `/${role}`;
}
