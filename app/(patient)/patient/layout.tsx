import { RoleShell } from "@/components/shell/role-shell";
import { ME_PATIENT } from "@/lib/data/mock-cases";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleShell
      role="patient"
      user={{
        name: `${ME_PATIENT.firstName} ${ME_PATIENT.lastName}`,
        subtitle: `Patient · ID ${ME_PATIENT.id}`,
      }}
    >
      {children}
    </RoleShell>
  );
}
