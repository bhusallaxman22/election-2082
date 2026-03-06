import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
          color: "#f8fafc",
          fontFamily: "Arial, sans-serif",
          padding: "46px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            borderRadius: "34px",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.92) 100%)",
            padding: "42px",
          }}
        >
          <div
            style={{
              width: "220px",
              height: "220px",
              borderRadius: "48px",
              background: "linear-gradient(135deg, #ef4444 0%, #f97316 52%, #0ea5e9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "34px",
            }}
          >
            <svg width="164" height="164" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
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
            <div style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "4px", color: "#93c5fd" }}>
              ELECTION 2082
            </div>
            <div style={{ fontSize: "70px", fontWeight: 800, marginTop: "12px", lineHeight: 1.05 }}>
              Federal Parliament Tracker
            </div>
            <div style={{ fontSize: "30px", marginTop: "15px", color: "#cbd5e1" }}>
              Real-time votes, constituencies and party momentum
            </div>
            <div style={{ fontSize: "24px", marginTop: "26px", color: "#f9a8d4", fontWeight: 700 }}>
              Updated continuously
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
