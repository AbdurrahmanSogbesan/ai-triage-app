import { redirect } from "next/navigation";

import { ProfileScreen } from "@/components/clinical/profile-screen";
import { getSessionProfile } from "@/lib/auth/session";
import { BaselineEditor } from "./_components/baseline-editor";

function formatDob(dob: string | null) {
  if (!dob) return "—";
  return new Date(dob).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PatientProfilePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const { profile } = session;

  const fields = [
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.phone ?? "—" },
    { label: "Date of birth", value: formatDob(profile.date_of_birth) },
    {
      label: "Sex",
      value:
        profile.sex === "M" ? "Male" : profile.sex === "F" ? "Female" : "—",
    },
    { label: "Blood group", value: profile.blood_group ?? "—" },
    { label: "Genotype", value: profile.genotype ?? "—" },
    { label: "Language", value: profile.preferred_language ?? "en" },
  ];

  return (
    <ProfileScreen
      user={{
        name: `${profile.first_name} ${profile.last_name}`,
        subtitle: profile.email,
      }}
      fields={fields}
    >
      <BaselineEditor
        initialBloodGroup={profile.blood_group}
        initialGenotype={profile.genotype}
        initialPreferredLanguage={profile.preferred_language ?? "en"}
      />
    </ProfileScreen>
  );
}
