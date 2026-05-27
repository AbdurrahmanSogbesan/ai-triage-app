import { redirect } from "next/navigation";

import { roleRoot } from "@/lib/auth/roles";
import { getSessionProfile } from "@/lib/auth/session";
import { RoleShell } from "@/components/shell/role-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") {
    redirect(roleRoot(session.profile.role));
  }

  const { profile } = session;
  return (
    <RoleShell
      role="admin"
      user={{
        name: `${profile.first_name} ${profile.last_name}`,
        subtitle: profile.department ?? "Administrator",
      }}
    >
      {children}
    </RoleShell>
  );
}
