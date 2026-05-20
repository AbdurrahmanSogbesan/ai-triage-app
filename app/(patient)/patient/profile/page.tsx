import { ProfileScreen } from "@/components/clinical/profile-screen";
import { ME_PATIENT } from "@/lib/data/mock-cases";

function formatDob(dob: string) {
  return new Date(dob).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PatientProfilePage() {
  const fields = [
    { label: "Email", value: ME_PATIENT.email },
    { label: "Phone", value: ME_PATIENT.phone },
    { label: "Date of birth", value: formatDob(ME_PATIENT.dateOfBirth) },
    { label: "Sex", value: ME_PATIENT.sex === "M" ? "Male" : "Female" },
    { label: "Blood group", value: ME_PATIENT.bloodGroup ?? "—" },
    { label: "Genotype", value: ME_PATIENT.genotype ?? "—" },
    { label: "Language", value: ME_PATIENT.language },
  ];

  return (
    <ProfileScreen
      user={{
        name: `${ME_PATIENT.firstName} ${ME_PATIENT.lastName}`,
        subtitle: `Patient · ID ${ME_PATIENT.id}`,
      }}
      fields={fields}
    />
  );
}
