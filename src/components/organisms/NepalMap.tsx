"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { provinces } from "@/data/provinces";
import type { LiveCandidate } from "@/context/ElectionDataContext";

// Province color palette (fill + darker hover)
const PROVINCE_COLORS: Record<number, { fill: string; hover: string }> = {
  1: { fill: "#e5b6ac", hover: "#d49385" },
  2: { fill: "#95cbdd", hover: "#6db5d1" },
  3: { fill: "#b2d8a6", hover: "#8ec97e" },
  4: { fill: "#f2a55a", hover: "#e78d2f" },
  5: { fill: "#f4c2f1", hover: "#ea9ce6" },
  6: { fill: "#ffe380", hover: "#ffda4d" },
  7: { fill: "#bcc0e7", hover: "#9da2d8" },
};

// SVG IDs 77 & 78 duplicate 45 & 52 (pre-split GeoJSON); skip rendering them
const SPLIT_SVG_IDS = new Set([77, 78]);
// When clicking the unsplit polygon, show both East/West halves
const SPLIT_DISTRICTS: Record<number, number[]> = {
  45: [45, 77], // Nawalparasi East + West
  52: [52, 78], // Rukum East + West
};

interface DistrictInfo {
  districtId: number;
  name: string;
  constituencies: number;
  provinceId: number;
  provinceName: string;
  slug: string;
}

interface ConstituencyDetail {
  constituency: string;
  districtId: number;
  constNumber: number;
  candidates: LiveCandidate[];
  totalVotes: number;
  countingStatus: string;
}

export default function NepalMap() {
  const router = useRouter();

  // Flat district lookup built once from provinces data
  const districtMap = useMemo(() => {
    const map: Record<number, DistrictInfo> = {};
    for (const prov of provinces) {
      for (const d of prov.districts) {
        map[d.districtId] = {
          districtId: d.districtId,
          name: d.name,
          constituencies: d.constituencies,
          provinceId: prov.id,
          provinceName: prov.name,
          slug: d.slug,
        };
      }
    }
    return map;
  }, []);

  const [hoveredDistrict, setHoveredDistrict] = useState<number | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [districtPaths, setDistrictPaths] = useState<Record<number, string>>({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Constituency drill-down
  const [selectedConstituency, setSelectedConstituency] = useState<{
    districtId: number;
    constNum: number;
    districtName: string;
  } | null>(null);
  const [constDetail, setConstDetail] = useState<ConstituencyDetail | null>(null);
  const [constLoading, setConstLoading] = useState(false);

  // Load district SVG paths
  useEffect(() => {
    fetch("/assets/images/np-districts.svg")
      .then((res) => res.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const paths: Record<number, string> = {};
        doc.querySelectorAll("path[id]").forEach((el) => {
          const id = el.getAttribute("id");
          const d = el.getAttribute("d");
          if (id && d) {
            const numId = parseInt(id.replace("d", ""), 10);
            if (!isNaN(numId)) paths[numId] = d;
          }
        });
        setDistrictPaths(paths);
      })
      .catch(() => {});
  }, []);

  // Fetch constituency detail when a seat is clicked
  useEffect(() => {
    if (!selectedConstituency) {
      setConstDetail(null);
      return;
    }
    let cancelled = false;
    setConstLoading(true);
    fetch(`/api/constituency?district=${selectedConstituency.districtId}&const=${selectedConstituency.constNum}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setConstDetail({
            constituency: json.data.constituency,
            districtId: json.data.districtId,
            constNumber: json.data.constNumber,
            candidates: json.data.candidates.slice(0, 5),
            totalVotes: json.data.totalVotes,
            countingStatus: json.data.countingStatus,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setConstLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedConstituency]);

  const handleDistrictClick = useCallback((districtId: number) => {
    setSelectedConstituency(null);
    setConstDetail(null);
    setSelectedDistrict((prev) => (prev === districtId ? null : districtId));
  }, []);

  const handleConstClick = useCallback(
    (districtId: number, constNum: number, districtName: string) => {
      setSelectedConstituency((prev) =>
        prev?.districtId === districtId && prev?.constNum === constNum
          ? null
          : { districtId, constNum, districtName }
      );
    },
    []
  );

  const hasLoaded = Object.keys(districtPaths).length > 0;

  // Districts shown in the detail panel (handles split districts)
  const activeDistricts = useMemo(() => {
    if (!selectedDistrict) return [];
    const ids = SPLIT_DISTRICTS[selectedDistrict] || [selectedDistrict];
    return ids.map((id) => districtMap[id]).filter(Boolean);
  }, [selectedDistrict, districtMap]);

  const activeProvince = useMemo(() => {
    if (!activeDistricts.length) return null;
    return provinces.find((p) => p.id === activeDistricts[0].provinceId) || null;
  }, [activeDistricts]);

  const hoveredInfo = hoveredDistrict ? districtMap[hoveredDistrict] : null;

  // IDs to render (skip duplicate split polygons d77/d78)
  const renderableIds = useMemo(() => {
    return Object.keys(districtPaths)
      .map(Number)
      .filter((id) => !SPLIT_SVG_IDS.has(id));
  }, [districtPaths]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Election District Map</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Click on any district to view constituency results</p>
        </div>
        {(selectedDistrict || selectedConstituency) && (
          <button
            onClick={() => {
              setSelectedDistrict(null);
              setSelectedConstituency(null);
              setConstDetail(null);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200"
          >
            Clear selection
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Map */}
        <div className="flex-1 relative">
          {!hasLoaded ? (
            <div className="flex h-[320px] items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : (
            <svg
              viewBox="0 0 1000 569"
              className="w-full h-auto"
              xmlns="http://www.w3.org/2000/svg"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
            >
              {renderableIds.map((dId) => {
                const pathD = districtPaths[dId];
                const info = districtMap[dId];
                if (!pathD || !info) return null;

                const colors = PROVINCE_COLORS[info.provinceId];
                if (!colors) return null;

                const isHovered = hoveredDistrict === dId;
                const isSelected = selectedDistrict === dId;
                const isSameProvince = selectedDistrict
                  ? districtMap[selectedDistrict]?.provinceId === info.provinceId
                  : false;

                return (
                  <path
                    key={dId}
                    d={pathD}
                    fill={
                      isSelected ? colors.hover
                        : isHovered ? colors.hover
                          : isSameProvince ? `${colors.fill}dd`
                            : colors.fill
                    }
                    stroke={isSelected ? "#374151" : "#fff"}
                    strokeWidth={isSelected ? "1.8" : "0.5"}
                    strokeLinejoin="round"
                    className="cursor-pointer transition-colors duration-150"
                    onMouseEnter={() => setHoveredDistrict(dId)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                    onClick={() => handleDistrictClick(dId)}
                  />
                );
              })}
            </svg>
          )}

          {/* Hover tooltip */}
          {hoveredInfo && !selectedDistrict && (
            <div
              className="absolute z-10 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 shadow-md text-xs animate-fade-in pointer-events-none"
              style={{
                left: Math.min(mousePos.x + 12, 280),
                top: mousePos.y - 10,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: PROVINCE_COLORS[hoveredInfo.provinceId]?.fill }}
                />
                <span className="font-semibold text-gray-900">{hoveredInfo.name}</span>
              </div>
              <div className="text-gray-500">
                {hoveredInfo.provinceName} · {hoveredInfo.constituencies} {hoveredInfo.constituencies === 1 ? "constituency" : "constituencies"}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {activeDistricts.length > 0 && (
          <div className="lg:w-80 shrink-0 animate-fade-in">
            <div className="rounded-lg border border-gray-200 bg-white max-h-[70vh] overflow-y-auto">
              {/* District header */}
              <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: PROVINCE_COLORS[activeDistricts[0].provinceId]?.hover }}
                  >
                    {activeDistricts[0].districtId}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {activeDistricts.length === 1
                        ? activeDistricts[0].name
                        : activeDistricts.map((d) => d.name).join(" / ")}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {activeDistricts[0].provinceName}
                      {activeDistricts.length > 1 &&
                        activeDistricts[1].provinceName !== activeDistricts[0].provinceName &&
                        ` / ${activeDistricts[1].provinceName}`}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="text-center rounded-md bg-gray-50 py-1.5">
                    <div className="text-sm font-bold text-gray-900">
                      {activeDistricts.reduce((s, d) => s + d.constituencies, 0)}
                    </div>
                    <div className="text-[9px] text-gray-400">Seats</div>
                  </div>
                  <div className="text-center rounded-md bg-gray-50 py-1.5">
                    <div className="text-sm font-bold text-gray-900">
                      P{[...new Set(activeDistricts.map((d) => d.provinceId))].join("/")}
                    </div>
                    <div className="text-[9px] text-gray-400">Province</div>
                  </div>
                </div>
              </div>

              {/* Province info */}
              {activeProvince && (() => {
                const prov = activeProvince;
                const totalLeads = prov.partyResults.reduce((s, r) => s + r.leads + r.wins, 0);
                return (
                  <div className="p-4 border-b border-gray-100">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                      Province: {prov.name}
                    </div>
                    <div className="flex rounded-md overflow-hidden h-2.5 bg-gray-100 mb-2.5">
                      {prov.partyResults
                        .filter((r) => r.leads > 0 || r.wins > 0)
                        .map((r, i) => (
                          <div
                            key={i}
                            className="h-full"
                            style={{
                              width: `${((r.leads + r.wins) / prov.totalSeats) * 100}%`,
                              backgroundColor: r.partyColor,
                            }}
                          />
                        ))}
                    </div>
                    <div className="space-y-1.5">
                      {prov.partyResults
                        .filter((r) => r.leads > 0 || r.wins > 0)
                        .map((r, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: r.partyColor }} />
                              <span className="text-xs text-gray-600">{r.partyShortName}</span>
                            </div>
                            <span className="text-xs font-medium text-gray-800">{r.leads + r.wins}</span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">{totalLeads} of {prov.totalSeats} seats counted</div>
                  </div>
                );
              })()}

              {/* Clickable constituency seats */}
              <div className="p-4">
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-3">
                  Click a seat to view results
                </div>
                <div className="space-y-3">
                  {activeDistricts.map((d) => (
                    <div key={d.districtId}>
                      <div className="text-xs font-semibold text-gray-700 mb-1.5">{d.name}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: d.constituencies }, (_, i) => {
                          const constNum = i + 1;
                          const isActive =
                            selectedConstituency?.districtId === d.districtId &&
                            selectedConstituency?.constNum === constNum;
                          return (
                            <button
                              key={constNum}
                              onClick={() => handleConstClick(d.districtId, constNum, d.name)}
                              className={`px-2.5 py-1.5 text-[11px] rounded-md border transition-all ${
                                isActive
                                  ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                              }`}
                            >
                              {d.name}-{constNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Constituency result card */}
                {selectedConstituency && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden animate-fade-in">
                    {constLoading ? (
                      <div className="p-4 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        <span className="ml-2 text-xs text-gray-500">Loading results...</span>
                      </div>
                    ) : constDetail ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-200 bg-white">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900">{constDetail.constituency}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              constDetail.countingStatus === "Result declared"
                                ? "bg-emerald-100 text-emerald-700"
                                : constDetail.totalVotes > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                            }`}>
                              {constDetail.countingStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {constDetail.totalVotes.toLocaleString()} total votes
                          </div>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {constDetail.candidates.map((c, i) => {
                            const pct = constDetail.totalVotes > 0
                              ? ((c.votes / constDetail.totalVotes) * 100).toFixed(1)
                              : "0";
                            const isWinner = c.status === "won";
                            return (
                              <div key={c.id} className={`px-4 py-2.5 flex items-center gap-3 ${i === 0 ? 'bg-white' : ''}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isWinner ? 'bg-emerald-100 text-emerald-700' :
                                  i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {isWinner ? '✓' : i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-medium text-gray-800 truncate">{c.name}</span>
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                      style={{ backgroundColor: c.partyColor + "20", color: c.partyColor }}
                                    >
                                      {c.partyShortName}
                                    </span>
                                    {isWinner && (
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                                        WON
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ width: `${pct}%`, backgroundColor: c.partyColor }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className={`text-[11px] font-bold ${isWinner ? 'text-emerald-700' : i === 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {c.votes.toLocaleString()}
                                  </div>
                                  <div className="text-[9px] text-gray-400">{pct}%</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-xs text-gray-500 text-center">
                        No data available for this constituency
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => router.push(`/provinces/${activeDistricts[0].provinceId}`)}
                  className="mt-4 w-full text-center text-xs text-red-600 hover:text-red-700 font-medium py-2 rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  View Province Details →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Province legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {provinces.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600"
          >
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}
