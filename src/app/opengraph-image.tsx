import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          padding: "48px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            borderRadius: "36px",
            padding: "42px",
            color: "#f8fafc",
          }}
        >
          <div
            style={{
              width: "240px",
              height: "240px",
              borderRadius: "52px",
              background: "linear-gradient(135deg, #ef4444 0%, #f97316 52%, #0ea5e9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "36px",
            }}
          >
            <svg width="176" height="176" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path d="M90 336L178 228L248 294L316 204L424 336H90Z" fill="#F8FAFC" fillOpacity="0.96" />
              <path
                d="M168 188L210 154L238 178L272 140L312 170L344 146L370 176"
                stroke="#F8FAFC"
                strokeWidth="22"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect x="318" y="194" width="112" height="112" rx="28" fill="#ffffff" />
              <path d="M343 250L365 272L405 230" stroke="#22C55E" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "4px", color: "#94a3b8" }}>
              LIVE ELECTION DASHBOARD
            </div>
            <div style={{ fontSize: "74px", fontWeight: 800, marginTop: "14px", lineHeight: 1.05 }}>
              Nepal Election 2082
            </div>
            <div style={{ fontSize: "32px", marginTop: "16px", color: "#cbd5e1" }}>
              Federal Parliament Results, Candidate Races and Province Insights
            </div>
            <div style={{ fontSize: "24px", marginTop: "28px", color: "#fda4af", fontWeight: 700 }}>
              election-2082 dashboard
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
