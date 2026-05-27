import { redirect } from "next/navigation";

import { roleRoot } from "@/lib/auth/roles";
import { getSessionProfile } from "@/lib/auth/session";
import { RoleShell } from "@/components/shell/role-shell";

export default async function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "clinician") {
    redirect(roleRoot(session.profile.role));
  }

  const { profile } = session;
  const subtitleParts = [profile.department, profile.mdcn_number].filter(
    (s): s is string => Boolean(s)
  );
  return (
    <RoleShell
      role="clinician"
      user={{
        name: `${profile.first_name} ${profile.last_name}`,
        subtitle: subtitleParts.length ? subtitleParts.join(" · ") : profile.email,
      }}
    >
      {children}
    </RoleShell>
  );
}
