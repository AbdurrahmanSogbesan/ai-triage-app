import { AdminQueue } from "./_components/admin-queue";
import { getAdminQueue, getClinicianRoster } from "./_components/actions";

export default async function AdminQueuePage() {
  const [cases, clinicians] = await Promise.all([
    getAdminQueue(),
    getClinicianRoster(),
  ]);
  return <AdminQueue cases={cases} clinicians={clinicians} />;
}
