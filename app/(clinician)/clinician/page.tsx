import { ME_CLINICIAN, getCasesAssignedTo } from "@/lib/data/mock-cases";

import { ClinicianDashboard } from "./_components/clinician-dashboard";

export default function ClinicianDashboardPage() {
  const cases = getCasesAssignedTo(ME_CLINICIAN.name);
  return <ClinicianDashboard cases={cases} />;
}
