import { redirect } from "next/navigation";

import { ProfileScreen } from "@/components/clinical/profile-screen";
import { getSessionProfile } from "@/lib/auth/session";

export default async function ClinicianProfilePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const { profile } = session;

  const fields = [
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.phone ?? "—" },
    { label: "MDCN number", value: profile.mdcn_number ?? "—" },
    { label: "Speciality", value: profile.speciality ?? "—" },
    { label: "Department", value: profile.department ?? "—" },
    {
      label: "Languages",
      value: profile.languages?.length ? profile.languages.join(", ") : "—",
    },
  ];

  const subtitleParts = [profile.speciality, profile.department].filter(
    (s): s is string => Boolean(s)
  );

  return (
    <ProfileScreen
      user={{
        name: `${profile.first_name} ${profile.last_name}`,
        subtitle: subtitleParts.length ? subtitleParts.join(" · ") : profile.email,
      }}
      fields={fields}
    />
  );
}
