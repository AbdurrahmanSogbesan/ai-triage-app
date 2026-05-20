import { redirect } from "next/navigation";

import { getMockRole } from "@/lib/auth/session";
import { roleRoot } from "@/lib/auth/mock";

export default async function HomePage() {
  const role = await getMockRole();
  redirect(role ? roleRoot(role) : "/login");
}
