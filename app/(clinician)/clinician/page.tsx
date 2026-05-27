import { ClinicianDashboard } from "./_components/clinician-dashboard";
import { getAssignedCases } from "./_components/actions";

export default async function ClinicianDashboardPage() {
  const cases = await getAssignedCases();
  return <ClinicianDashboard cases={cases} />;
}
