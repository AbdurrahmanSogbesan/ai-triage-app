import { ImageResponse } from "next/og";

import { PULSE_PATH } from "@/lib/brand";

export const alt =
  "Outpatient Triage — AI-assisted intake for Sunshine Medical Centre, Lagos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Manchester Triage System levels, most to least urgent — same values as the
// severity tokens in globals.css.
const MTS_COLOURS = ["#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#2563EB"];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FAFAF9",
          position: "relative",
        }}
      >
        <svg
          width="760"
          height="760"
          viewBox="0 0 24 24"
          fill="none"
          style={{ position: "absolute", right: -120, top: -80, opacity: 0.07 }}
        >
          <path
            d={PULSE_PATH}
            stroke="#047857"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 88px",
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 24,
              background: "#047857",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="66" height="66" viewBox="0 0 24 24" fill="none">
              <path
                d={PULSE_PATH}
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              marginTop: 44,
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#0F172A",
            }}
          >
            Outpatient Triage
          </div>
          <div style={{ marginTop: 10, fontSize: 32, color: "#64748B" }}>
            Sunshine Medical Centre · Lagos
          </div>
          <div
            style={{
              marginTop: 36,
              fontSize: 28,
              color: "#047857",
              fontWeight: 600,
            }}
          >
            AI-assisted intake, triaged on the Manchester scale.
          </div>
        </div>

        <div style={{ display: "flex", height: 14 }}>
          {MTS_COLOURS.map((colour) => (
            <div key={colour} style={{ flex: 1, background: colour }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
