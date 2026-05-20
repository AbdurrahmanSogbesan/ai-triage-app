import type { LucideIcon } from "lucide-react";
import { History, LayoutGrid, List, User, Home } from "lucide-react";
import type { Role } from "@/lib/types";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  patient: [
    { label: "Dashboard", href: "/patient", icon: Home },
    { label: "Sessions", href: "/patient/sessions", icon: History },
    { label: "Profile", href: "/patient/profile", icon: User },
  ],
  clinician: [
    { label: "Dashboard", href: "/clinician", icon: LayoutGrid },
    { label: "History", href: "/clinician/history", icon: History },
    { label: "Profile", href: "/clinician/profile", icon: User },
  ],
  admin: [
    { label: "Queue", href: "/admin", icon: List },
    { label: "Profile", href: "/admin/profile", icon: User },
  ],
};

export const ROLE_META: Record<Role, { subtitle: string }> = {
  patient: { subtitle: "Outpatient Triage" },
  clinician: { subtitle: "Sunshine Medical" },
  admin: { subtitle: "Sunshine Medical" },
};
