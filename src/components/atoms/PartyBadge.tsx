"use client";

import React from "react";

interface PartyBadgeProps {
  name: string;
  color: string;
  size?: "sm" | "md";
}

export default function PartyBadge({
  name,
  color,
  size = "sm",
}: PartyBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full font-bold
        ${size === "sm" ? "px-3 py-0.5 text-[10px]" : "px-4 py-1.5 text-sm"}
      `}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1.5px solid ${color}30`,
      }}
    >
      {name}
    </span>
  );
}
