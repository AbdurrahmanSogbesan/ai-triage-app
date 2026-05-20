import { ProfileScreen } from "@/components/clinical/profile-screen";
import { ME_ADMIN } from "@/lib/data/mock-cases";

export default function AdminProfilePage() {
  const fields = [
    { label: "Email", value: ME_ADMIN.email },
    { label: "Phone", value: ME_ADMIN.phone },
    { label: "Role", value: ME_ADMIN.role },
    { label: "Department", value: ME_ADMIN.department },
    { label: "Joined", value: ME_ADMIN.joined },
  ];

  return (
    <ProfileScreen
      user={{
        name: ME_ADMIN.name,
        subtitle: ME_ADMIN.role,
      }}
      fields={fields}
    />
  );
}
