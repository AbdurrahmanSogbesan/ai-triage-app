import { redirect } from "next/navigation";

import { roleRoot } from "@/lib/auth/roles";
import { getSessionProfile } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSessionProfile();
  redirect(session ? roleRoot(session.profile.role) : "/login");
}
