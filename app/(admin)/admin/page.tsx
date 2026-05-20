import { AdminQueue } from "./_components/admin-queue";
import { CASES, CLINICIANS } from "@/lib/data/mock-cases";

export default function AdminQueuePage() {
  return <AdminQueue cases={CASES} clinicians={CLINICIANS} />;
}
