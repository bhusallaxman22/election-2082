"use client";

import React from "react";

interface VoteBarProps {
  percentage: number;
  color: string;
  height?: number;
  animated?: boolean;
}

export default function VoteBar({
  percentage,
  color,
  height = 6,
  animated = true,
}: VoteBarProps) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{
        height: `${height}px`,
        backgroundColor: `${color}10`,
      }}
    >
      <div
        className={`h-full rounded-full ${animated ? "transition-all duration-1000 ease-out" : ""}`}
        style={{
          width: `${Math.min(percentage, 100)}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
        }}
      />
    </div>
  );
}
