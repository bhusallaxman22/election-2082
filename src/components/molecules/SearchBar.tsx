"use client";

import React from "react";
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  className?: string;
}

export default function SearchBar({
  placeholder = "Search candidates...",
  onSearch,
  className = "",
}: SearchBarProps) {
  return (
    <Input
      prefix={<SearchOutlined className="text-slate-400" />}
      placeholder={placeholder}
      allowClear
      size="large"
      onChange={(e) => onSearch(e.target.value)}
      className={`glass-input ${className}`}
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(148,163,184,0.28)",
        borderRadius: "14px",
      }}
    />
  );
}
