import { RoleShell } from "@/components/shell/role-shell";
import { ME_CLINICIAN } from "@/lib/data/mock-cases";

export default function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleShell
      role="clinician"
      user={{
        name: ME_CLINICIAN.name,
        subtitle: `${ME_CLINICIAN.department} · ${ME_CLINICIAN.mdcnNumber}`,
      }}
    >
      {children}
    </RoleShell>
  );
}
