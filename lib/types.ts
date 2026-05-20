export type Severity = "red" | "orange" | "yellow" | "green" | "blue";

export type SessionStatus =
  | "in_progress"
  | "abandoned"
  | "awaiting_referee"
  | "awaiting_clinician"
  | "completed";

export type Role = "patient" | "clinician" | "admin";

export type Vitals = {
  bpSys: number;
  bpDia: number;
  tempC: number;
  weightKg: number;
};

export type Case = {
  id: string;
  patientId: string;
  name: string;
  age: number;
  sex: "M" | "F";
  complaint: string;
  severity: Severity;
  confidence: number;
  arrivedAt: string;
  waitedMin: number;
  vitals: Vitals;
  assignedTo: string | null;
  status: SessionStatus;
};

export type PastSession = {
  id: string;
  date: string;
  complaint: string;
  status: SessionStatus;
  assignedTo?: string;
};

export type TranscriptTurn = {
  role: "ai" | "patient";
  text: string;
};

export type SoapReport = {
  subjective: {
    cc: string;
    hpi: string;
    pmh: string;
    meds: string;
    allergies: string;
    social: string;
  };
  objective: {
    vitalsNote: string;
    bp: string;
    temp: string;
    weight: string;
  };
  assessment: {
    primary: string;
    differentials: string[];
    rationale: string;
  };
  plan: string[];
};

export type Clinician = {
  id: string;
  name: string;
  load: number;
  capacity: number;
  speciality: string;
};

export type PatientProfile = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  sex: "M" | "F";
  phone: string;
  email: string;
  bloodGroup: string | null;
  genotype: string | null;
  language: string;
};

export type ClinicianProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  mdcnNumber: string;
  speciality: string;
  department: string;
  languages: string[];
};

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  joined: string;
};

export const HOSPITAL = "Sunshine Medical Centre, Lagos";

export const SEVERITY_META: Record<
  Severity,
  { label: string; meaning: string }
> = {
  red: { label: "Red", meaning: "Immediate" },
  orange: { label: "Orange", meaning: "Very Urgent" },
  yellow: { label: "Yellow", meaning: "Urgent" },
  green: { label: "Green", meaning: "Standard" },
  blue: { label: "Blue", meaning: "Non-Urgent" },
};

export const STATUS_META: Record<
  SessionStatus,
  { label: string; tone: "neutral" | "info" | "warn" | "success" | "danger" }
> = {
  in_progress: { label: "In progress", tone: "info" },
  abandoned: { label: "Abandoned", tone: "danger" },
  awaiting_referee: { label: "Awaiting AI verification", tone: "warn" },
  awaiting_clinician: { label: "Awaiting clinician", tone: "warn" },
  completed: { label: "Completed", tone: "success" },
};

export function confidenceBand(score: number): {
  band: "high" | "verify" | "manual";
  label: string;
  tone: "success" | "warn" | "danger";
} {
  if (score >= 85) return { band: "high", label: "High confidence", tone: "success" };
  if (score >= 75) return { band: "verify", label: "Verify carefully", tone: "warn" };
  return { band: "manual", label: "Manual review recommended", tone: "danger" };
}
