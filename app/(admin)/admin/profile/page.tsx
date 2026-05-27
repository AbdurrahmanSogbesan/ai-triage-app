import { redirect } from "next/navigation";

import { ProfileScreen } from "@/components/clinical/profile-screen";
import { getSessionProfile } from "@/lib/auth/session";

export default async function AdminProfilePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const { profile } = session;

  const fields = [
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.phone ?? "—" },
    { label: "Role", value: "Administrator" },
    { label: "Department", value: profile.department ?? "—" },
    {
      label: "Joined",
      value: new Date(profile.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  ];

  return (
    <ProfileScreen
      user={{
        name: `${profile.first_name} ${profile.last_name}`,
        subtitle: profile.department ?? "Administrator",
      }}
      fields={fields}
    />
  );
}
