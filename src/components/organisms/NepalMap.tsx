"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { provinces } from "@/data/provinces";
import type { ProvinceData } from "@/data/provinces";
import type { LiveCandidate } from "@/context/ElectionDataContext";

interface ZoneConfig {
  id: string;
  name: string;
  nameNp: string;
  color: string;
  hoverColor: string;
  provinceId: number;
  districts: { name: string; districtId: number; constituencies: number }[];
  totalConstituencies: number;
}

// 14 administrative zones with district IDs and constituency counts
const ZONES: ZoneConfig[] = [
  { id: "NPME", name: "Mechi", nameNp: "मेची", color: "#e5b6ac", hoverColor: "#d49385", provinceId: 1,
    districts: [
      { name: "Taplejung", districtId: 1, constituencies: 1 },
      { name: "Panchthar", districtId: 2, constituencies: 2 },
      { name: "Ilam", districtId: 3, constituencies: 2 },
      { name: "Jhapa", districtId: 4, constituencies: 5 },
    ],
    totalConstituencies: 10 },
  { id: "NPKO", name: "Koshi", nameNp: "कोशी", color: "#dca899", hoverColor: "#c88a78", provinceId: 1,
    districts: [
      { name: "Morang", districtId: 9, constituencies: 5 },
      { name: "Sunsari", districtId: 10, constituencies: 3 },
      { name: "Dhankuta", districtId: 8, constituencies: 1 },
      { name: "Terhathum", districtId: 6, constituencies: 1 },
      { name: "Sankhuwasabha", districtId: 5, constituencies: 1 },
    ],
    totalConstituencies: 11 },
  { id: "NPSA", name: "Sagarmatha", nameNp: "सगरमाथा", color: "#d79e8e", hoverColor: "#c4806c", provinceId: 1,
    districts: [
      { name: "Bhojpur", districtId: 7, constituencies: 1 },
      { name: "Solukhumbu", districtId: 11, constituencies: 1 },
      { name: "Okhaldhunga", districtId: 13, constituencies: 1 },
      { name: "Khotang", districtId: 12, constituencies: 1 },
      { name: "Udayapur", districtId: 14, constituencies: 2 },
    ],
    totalConstituencies: 6 },
  { id: "NPJA", name: "Janakpur", nameNp: "जनकपुर", color: "#95cbdd", hoverColor: "#6db5d1", provinceId: 2,
    districts: [
      { name: "Saptari", districtId: 15, constituencies: 3 },
      { name: "Siraha", districtId: 16, constituencies: 3 },
      { name: "Dhanusha", districtId: 20, constituencies: 4 },
      { name: "Mahottari", districtId: 21, constituencies: 3 },
      { name: "Sarlahi", districtId: 22, constituencies: 4 },
      { name: "Rautahat", districtId: 32, constituencies: 3 },
      { name: "Bara", districtId: 33, constituencies: 3 },
      { name: "Parsa", districtId: 34, constituencies: 3 },
    ],
    totalConstituencies: 26 },
  { id: "NPBA", name: "Bagmati", nameNp: "बागमती", color: "#b2d8a6", hoverColor: "#8ec97e", provinceId: 3,
    districts: [
      { name: "Dolakha", districtId: 17, constituencies: 1 },
      { name: "Sindhupalchok", districtId: 30, constituencies: 2 },
      { name: "Rasuwa", districtId: 23, constituencies: 1 },
      { name: "Dhading", districtId: 24, constituencies: 2 },
      { name: "Nuwakot", districtId: 25, constituencies: 2 },
      { name: "Kathmandu", districtId: 26, constituencies: 10 },
      { name: "Bhaktapur", districtId: 27, constituencies: 2 },
      { name: "Lalitpur", districtId: 28, constituencies: 3 },
      { name: "Kavrepalanchok", districtId: 29, constituencies: 3 },
    ],
    totalConstituencies: 26 },
  { id: "NPNA", name: "Narayani", nameNp: "नारायणी", color: "#a2cf94", hoverColor: "#7fbd6d", provinceId: 3,
    districts: [
      { name: "Ramechhap", districtId: 18, constituencies: 1 },
      { name: "Sindhuli", districtId: 19, constituencies: 2 },
      { name: "Makwanpur", districtId: 31, constituencies: 2 },
      { name: "Chitwan", districtId: 35, constituencies: 3 },
    ],
    totalConstituencies: 8 },
  { id: "NPGA", name: "Gandaki", nameNp: "गण्डकी", color: "#f2a55a", hoverColor: "#e78d2f", provinceId: 4,
    districts: [
      { name: "Gorkha", districtId: 36, constituencies: 2 },
      { name: "Lamjung", districtId: 38, constituencies: 1 },
      { name: "Tanahun", districtId: 40, constituencies: 2 },
      { name: "Syangja", districtId: 41, constituencies: 2 },
      { name: "Kaski", districtId: 39, constituencies: 3 },
      { name: "Manang", districtId: 37, constituencies: 1 },
      { name: "Mustang", districtId: 48, constituencies: 1 },
    ],
    totalConstituencies: 12 },
  { id: "NPDH", name: "Dhaulagiri", nameNp: "धौलागिरी", color: "#eda043", hoverColor: "#d98520", provinceId: 4,
    districts: [
      { name: "Myagdi", districtId: 49, constituencies: 1 },
      { name: "Parbat", districtId: 51, constituencies: 1 },
      { name: "Baglung", districtId: 50, constituencies: 2 },
      { name: "Nawalparasi East", districtId: 45, constituencies: 2 },
    ],
    totalConstituencies: 6 },
  { id: "NPLU", name: "Lumbini", nameNp: "लुम्बिनी", color: "#f4c2f1", hoverColor: "#ea9ce6", provinceId: 5,
    districts: [
      { name: "Nawalparasi West", districtId: 77, constituencies: 1 },
      { name: "Rupandehi", districtId: 46, constituencies: 4 },
      { name: "Kapilvastu", districtId: 47, constituencies: 3 },
      { name: "Palpa", districtId: 43, constituencies: 1 },
      { name: "Arghakhanchi", districtId: 44, constituencies: 1 },
      { name: "Gulmi", districtId: 42, constituencies: 1 },
    ],
    totalConstituencies: 11 },
  { id: "NPRA", name: "Rapti", nameNp: "राप्ती", color: "#eeb0eb", hoverColor: "#e38fdf", provinceId: 5,
    districts: [
      { name: "Pyuthan", districtId: 54, constituencies: 1 },
      { name: "Rolpa", districtId: 53, constituencies: 1 },
      { name: "Rukum East", districtId: 52, constituencies: 1 },
      { name: "Dang", districtId: 56, constituencies: 3 },
      { name: "Banke", districtId: 65, constituencies: 3 },
      { name: "Bardiya", districtId: 66, constituencies: 2 },
    ],
    totalConstituencies: 11 },
  { id: "NPKA", name: "Karnali", nameNp: "कर्णाली", color: "#ffe380", hoverColor: "#ffda4d", provinceId: 6,
    districts: [
      { name: "Dolpa", districtId: 57, constituencies: 1 },
      { name: "Mugu", districtId: 58, constituencies: 1 },
      { name: "Humla", districtId: 61, constituencies: 1 },
      { name: "Jumla", districtId: 59, constituencies: 1 },
      { name: "Kalikot", districtId: 60, constituencies: 1 },
    ],
    totalConstituencies: 5 },
  { id: "NPBH", name: "Bheri", nameNp: "भेरी", color: "#ffd966", hoverColor: "#ffcc33", provinceId: 6,
    districts: [
      { name: "Dailekh", districtId: 63, constituencies: 2 },
      { name: "Surkhet", districtId: 64, constituencies: 2 },
      { name: "Jajarkot", districtId: 62, constituencies: 1 },
      { name: "Rukum West", districtId: 78, constituencies: 1 },
      { name: "Salyan", districtId: 55, constituencies: 1 },
    ],
    totalConstituencies: 7 },
  { id: "NPSE", name: "Seti", nameNp: "सेती", color: "#bcc0e7", hoverColor: "#9da2d8", provinceId: 7,
    districts: [
      { name: "Doti", districtId: 70, constituencies: 1 },
      { name: "Achham", districtId: 68, constituencies: 2 },
      { name: "Kailali", districtId: 71, constituencies: 4 },
      { name: "Kanchanpur", districtId: 75, constituencies: 2 },
    ],
    totalConstituencies: 9 },
  { id: "NPMA", name: "Mahakali", nameNp: "महाकाली", color: "#adb2de", hoverColor: "#8d94d0", provinceId: 7,
    districts: [
      { name: "Bajura", districtId: 67, constituencies: 1 },
      { name: "Bajhang", districtId: 69, constituencies: 1 },
      { name: "Darchula", districtId: 72, constituencies: 1 },
      { name: "Baitadi", districtId: 73, constituencies: 2 },
      { name: "Dadeldhura", districtId: 74, constituencies: 1 },
    ],
    totalConstituencies: 6 },
];

// Zone label positions
const ZONE_LABELS: Record<string, { x: number; y: number }> = {
  NPME: { x: 905, y: 380 },
  NPKO: { x: 830, y: 460 },
  NPSA: { x: 815, y: 360 },
  NPJA: { x: 701, y: 460 },
  NPBA: { x: 640, y: 350 },
  NPNA: { x: 580, y: 430 },
  NPGA: { x: 500, y: 280 },
  NPDH: { x: 430, y: 310 },
  NPLU: { x: 390, y: 400 },
  NPRA: { x: 320, y: 340 },
  NPKA: { x: 240, y: 180 },
  NPBH: { x: 295, y: 260 },
  NPSE: { x: 160, y: 210 },
  NPMA: { x: 100, y: 140 },
};

// ─── Constituency result panel types ─────────────────────────────────
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
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zonePaths, setZonePaths] = useState<Record<string, string>>({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Constituency drill-down state
  const [selectedConstituency, setSelectedConstituency] = useState<{
    districtId: number;
    constNum: number;
    districtName: string;
  } | null>(null);
  const [constDetail, setConstDetail] = useState<ConstituencyDetail | null>(null);
  const [constLoading, setConstLoading] = useState(false);

  useEffect(() => {
    fetch("/assets/images/np.svg")
      .then((res) => res.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const paths: Record<string, string> = {};
        doc.querySelectorAll("path[id]").forEach((el) => {
          const id = el.getAttribute("id");
          const d = el.getAttribute("d");
          if (id && d) paths[id] = d;
        });
        setZonePaths(paths);
      })
      .catch(() => {});
  }, []);

  // Fetch constituency details when a seat is clicked
  useEffect(() => {
    if (!selectedConstituency) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleZoneClick = useCallback((zone: ZoneConfig) => {
    setSelectedConstituency(null);
    setConstDetail(null);
    setSelectedZone((prev) => (prev === zone.id ? null : zone.id));
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

  const hasLoaded = Object.keys(zonePaths).length > 0;
  const activeZone = ZONES.find((z) => z.id === selectedZone);
  const hoveredZoneData = ZONES.find((z) => z.id === hoveredZone);

  const getProvinceForZone = (zone: ZoneConfig): ProvinceData | undefined => {
    return provinces.find((p) => p.id === zone.provinceId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Election Zone Map</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Click on any zone, then click a seat to view results</p>
        </div>
        {(selectedZone || selectedConstituency) && (
          <button
            onClick={() => {
              setSelectedZone(null);
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
              {ZONES.map((zone) => {
                const d = zonePaths[zone.id];
                if (!d) return null;
                const isHovered = hoveredZone === zone.id;
                const isSelected = selectedZone === zone.id;
                const isRelated = selectedZone ? ZONES.find((z) => z.id === selectedZone)?.provinceId === zone.provinceId : false;
                const label = ZONE_LABELS[zone.id];

                return (
                  <g key={zone.id}>
                    <path
                      d={d}
                      fill={isSelected ? zone.hoverColor : isHovered ? zone.hoverColor : isRelated ? `${zone.color}dd` : zone.color}
                      stroke={isSelected ? "#374151" : "#fff"}
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      strokeLinejoin="round"
                      className="cursor-pointer transition-colors duration-150"
                      onMouseEnter={() => setHoveredZone(zone.id)}
                      onMouseLeave={() => setHoveredZone(null)}
                      onClick={() => handleZoneClick(zone)}
                    />
                    {label && (
                      <text
                        x={label.x}
                        y={label.y}
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                        style={{
                          fontSize: zone.name.length > 8 ? "7px" : "8.5px",
                          fontWeight: isSelected ? 800 : 600,
                          fill: isSelected ? "#111827" : "#374151",
                        }}
                      >
                        {zone.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {/* Hover tooltip */}
          {hoveredZoneData && !selectedZone && (
            <div
              className="absolute z-10 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 shadow-md text-xs animate-fade-in pointer-events-none"
              style={{
                left: Math.min(mousePos.x + 12, 280),
                top: mousePos.y - 10,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: hoveredZoneData.color }} />
                <span className="font-semibold text-gray-900">{hoveredZoneData.name}</span>
                <span className="text-gray-400">{hoveredZoneData.nameNp}</span>
              </div>
              <div className="text-gray-500">
                {hoveredZoneData.districts.length} districts · {hoveredZoneData.totalConstituencies} constituencies
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {activeZone && (
          <div className="lg:w-80 shrink-0 animate-fade-in">
            <div className="rounded-lg border border-gray-200 bg-white max-h-[70vh] overflow-y-auto">
              {/* Zone header */}
              <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: activeZone.hoverColor }}>
                    {activeZone.id.replace("NP", "")}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{activeZone.name} Zone</div>
                    <div className="text-[11px] text-gray-400">{activeZone.nameNp}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center rounded-md bg-gray-50 py-1.5">
                    <div className="text-sm font-bold text-gray-900">{activeZone.districts.length}</div>
                    <div className="text-[9px] text-gray-400">Districts</div>
                  </div>
                  <div className="text-center rounded-md bg-gray-50 py-1.5">
                    <div className="text-sm font-bold text-gray-900">{activeZone.totalConstituencies}</div>
                    <div className="text-[9px] text-gray-400">Seats</div>
                  </div>
                  <div className="text-center rounded-md bg-gray-50 py-1.5">
                    <div className="text-sm font-bold text-gray-900">P{activeZone.provinceId}</div>
                    <div className="text-[9px] text-gray-400">Province</div>
                  </div>
                </div>
              </div>

              {/* Province info */}
              {(() => {
                const prov = getProvinceForZone(activeZone);
                if (!prov) return null;
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

              {/* Districts & clickable seats */}
              <div className="p-4">
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-3">
                  Click a seat to view results
                </div>
                <div className="space-y-3">
                  {activeZone.districts.map((d) => (
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
                  onClick={() => router.push(`/provinces/${activeZone.provinceId}`)}
                  className="mt-4 w-full text-center text-xs text-red-600 hover:text-red-700 font-medium py-2 rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  View Province Details →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {ZONES.map((z) => (
          <button
            key={z.id}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              selectedZone === z.id
                ? "border-gray-900 bg-gray-900 text-white"
                : hoveredZone === z.id
                ? "border-gray-400 bg-gray-50 text-gray-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
            onClick={() => handleZoneClick(z)}
            onMouseEnter={() => setHoveredZone(z.id)}
            onMouseLeave={() => setHoveredZone(null)}
          >
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: z.color }} />
            {z.name}
          </button>
        ))}
      </div>
    </div>
  );
}
