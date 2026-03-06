"use client";

import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: string;
}

export default function GlassCard({
  children,
  className = "",
  hover = true,
  padding = "p-6 sm:p-7",
}: GlassCardProps) {
  return (
    <div className={`glass-card ${hover ? "glass-card-hover" : ""} ${padding} ${className}`}>
      {children}
    </div>
  );
}
