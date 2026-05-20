import { ProfileScreen } from "@/components/clinical/profile-screen";
import { ME_CLINICIAN } from "@/lib/data/mock-cases";

export default function ClinicianProfilePage() {
  const fields = [
    { label: "Email", value: ME_CLINICIAN.email },
    { label: "Phone", value: ME_CLINICIAN.phone },
    { label: "MDCN number", value: ME_CLINICIAN.mdcnNumber },
    { label: "Speciality", value: ME_CLINICIAN.speciality },
    { label: "Department", value: ME_CLINICIAN.department },
    { label: "Languages", value: ME_CLINICIAN.languages.join(", ") },
  ];

  return (
    <ProfileScreen
      user={{
        name: ME_CLINICIAN.name,
        subtitle: `${ME_CLINICIAN.speciality} · ${ME_CLINICIAN.department}`,
      }}
      fields={fields}
    />
  );
}
