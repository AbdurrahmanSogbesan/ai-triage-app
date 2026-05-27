import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Short, human-readable display IDs derived from the full UUIDs we store.
 * Display-only and lossy — two UUIDs could in theory share the same prefix.
 * The full UUID stays the source of truth on the row.
 */
export function shortReportId(reportId: string): string {
  return `R-${reportId.slice(0, 8).toUpperCase()}`
}

export function shortPatientId(patientId: string): string {
  return `P-${patientId.slice(0, 4).toUpperCase()}`
}
