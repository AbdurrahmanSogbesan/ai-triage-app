import { getCompletedCases } from "../_components/actions";
import { ClinicianHistory } from "./_components/clinician-history";

export default async function ClinicianHistoryPage() {
  const cases = await getCompletedCases();
  return <ClinicianHistory cases={cases} />;
}
