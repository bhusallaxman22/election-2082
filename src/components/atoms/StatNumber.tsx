"use client";

import React from "react";

interface StatNumberProps {
  value: number | string;
  label: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export default function StatNumber({
  value,
  label,
  color = "text-gray-900",
  size = "md",
}: StatNumberProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className="flex flex-col items-center">
      <span className={`${sizeClasses[size]} font-bold ${color}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">
        {label}
      </span>
    </div>
  );
}
