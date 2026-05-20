import { RoleShell } from "@/components/shell/role-shell";
import { ME_ADMIN } from "@/lib/data/mock-cases";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleShell
      role="admin"
      user={{
        name: ME_ADMIN.name,
        subtitle: ME_ADMIN.role,
      }}
    >
      {children}
    </RoleShell>
  );
}
