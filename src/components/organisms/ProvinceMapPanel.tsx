"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { provinces } from "@/data/provinces";

const InteractiveMap = dynamic(
  () => import("@/components/organisms/InteractiveMap"),
  { ssr: false, loading: () => (
    <div className="flex h-[440px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        <span className="text-xs text-slate-400">Loading map...</span>
      </div>
    </div>
  )}
);

interface ProvinceMapPanelProps {
  provinceId: number;
}

export default function ProvinceMapPanel({ provinceId }: ProvinceMapPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const province = provinces.find((p) => p.id === provinceId);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleDistrictClick = useCallback(
    (districtId: number) => {
      setSelectedId((prev) => (prev === districtId ? null : districtId));
      // Scroll the constituency grid into view after a tick
      setTimeout(() => {
        const el = document.getElementById(`district-zone-${districtId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    },
    []
  );

  const handleChipClick = useCallback((districtId: number) => {
    setSelectedId((prev) => (prev === districtId ? null : districtId));
  }, []);

  if (!province) return null;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {province.name} Province — District & Constituency Map
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click a district on the map or below to see its constituencies
          </p>
        </div>
        {selectedId && (
          <button
            onClick={() => setSelectedId(null)}
            className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Map */}
      <InteractiveMap
        provinceId={provinceId}
        onDistrictClick={handleDistrictClick}
        height={440}
        showProvinceBorders={false}
        selectedDistrictId={selectedId}
        showLabels
        fitMaxZoom={11}
        fitPadding={[8, 8]}
      />

      {/* All districts + constituency zones */}
      <div ref={gridRef} className="border-t border-slate-100 bg-slate-50/60 p-5 space-y-3">
        {province.districts.map((d) => {
          const isSelected = selectedId === d.districtId;
          return (
            <div
              key={d.districtId}
              id={`district-zone-${d.districtId}`}
              className={`rounded-xl border transition-all duration-200 ${
                isSelected
                  ? "border-slate-300 bg-white shadow-sm"
                  : "border-slate-200 bg-white/70 hover:bg-white"
              }`}
            >
              {/* District header row */}
              <button
                onClick={() => handleChipClick(d.districtId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isSelected ? "text-white" : "text-slate-500 bg-slate-100"
                  }`}
                  style={isSelected ? { backgroundColor: province.color } : undefined}
                >
                  {d.constituencies}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                    {d.name}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    {d.constituencies} {d.constituencies === 1 ? "seat" : "seats"}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSelected ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Constituency buttons */}
              {isSelected && (
                <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2 animate-fade-in">
                  {Array.from({ length: d.constituencies }, (_, i) => {
                    const constNum = i + 1;
                    const slug = `${d.name.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "-")}-${constNum}`;
                    return (
                      <Link
                        key={constNum}
                        href={`/analytics?view=constituency&id=${slug}`}
                        className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: province.color }}
                        >
                          {constNum}
                        </span>
                        <span className="font-medium text-slate-700 group-hover:text-slate-900">
                          {d.name}-{constNum}
                        </span>
                        <svg
                          className="h-3.5 w-3.5 text-slate-300 group-hover:text-red-500 transition-colors"
                          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
