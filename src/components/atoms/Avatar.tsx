"use client";

import React, { useState } from "react";

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  src?: string;
}

export default function Avatar({ name, color = "#6366f1", size = 48, src }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-white/70 object-cover shadow-sm"
        style={{ width: size, height: size, boxShadow: `0 4px 10px -6px ${color}88` }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}dd, ${color})`,
        fontSize: size * 0.32,
        boxShadow: `0 4px 10px -6px ${color}88`,
      }}
    >
      {initials}
    </div>
  );
}
