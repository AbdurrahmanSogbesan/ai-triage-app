import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Outpatient Triage — Sunshine Medical Centre",
    short_name: "Triage",
    description:
      "AI-assisted outpatient intake and triage for Sunshine Medical Centre, Lagos.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF9",
    theme_color: "#047857",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
