import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="56" y1="44" x2="450" y2="470" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EF4444" />
            <stop offset="0.52" stopColor="#F97316" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
        <rect x="28" y="28" width="456" height="456" rx="106" fill="url(#bg)" />
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
    ),
    size
  );
}
