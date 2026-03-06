"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { provinces } from "@/data/provinces";

interface SeatData {
  districtId: number;
  constNumber: number;
  districtName: string;
  constituency: string;
  constituencySlug: string;
  provinceId: number;
  provinceName: string;
  partyShortName: string;
  partyColor: string;
  leaderName: string;
  leaderVotes: number;
  runnerUpName: string;
  runnerUpVotes: number;
  margin: number;
  totalVotes: number;
  status: "won" | "leading" | "counting" | "pending";
}

interface PlaceholderSeat {
  placeholder: true;
  districtId: number;
  constNumber: number;
  districtName: string;
  constituency: string;
  constituencySlug: string;
  provinceId: number;
  provinceName: string;
  status: "pending";
}

type SeatSlot = SeatData | PlaceholderSeat;

interface SeatMapProps {
  onSeatClick?: (seat: SeatData) => void;
  filterProvince?: number;
  filterParty?: string;
  filterStatus?: string;
  compact?: boolean;
}

interface SeatPoint {
  slot: SeatSlot;
  x: number;
  y: number;
}

const SEATING_TEMPLATE = [39, 35, 31, 27, 22, 11];
const PARTY_COLOR_MAP: Record<string, string> = {
  RSP: "#2563eb",
  NC: "#16a34a",
  NCP: "#c2185b",
  "CPN-UML": "#ef4444",
  OTH: "#f97316",
  MAOIST: "#ec4899",
  IND: "#1e3a8a",
  SSP: "#374151",
};

function isSeatData(slot: SeatSlot): slot is SeatData {
  return !("placeholder" in slot);
}

function normalizePartyKey(partyShortName: string): string {
  const key = partyShortName.trim().toUpperCase();
  if (!key) return "";

  if (key === "OTHERS" || key === "OTHER") return "OTH";
  if (key === "INDEPENDENT") return "IND";
  if (key === "UML" || key === "CPN UML" || key === "CPNUML") return "CPN-UML";
  if (key.includes("MAOIST")) return "MAOIST";

  return key;
}

function resolvePartyColor(partyShortName: string, fallbackColor?: string): string {
  const normalized = normalizePartyKey(partyShortName);
  return PARTY_COLOR_MAP[normalized] ?? fallbackColor ?? "#64748b";
}

function withAlpha(color: string, alpha: number): string {
  if (!/^#([0-9a-f]{6})$/i.test(color)) return color;
  const value = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(value * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color}${alphaHex}`;
}

function SeatGlyph({
  size,
  fillColor,
  strokeColor,
}: {
  size: number;
  fillColor: string;
  strokeColor: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="presentation" aria-hidden="true">
      <path
        d="M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="6.5"
        rx="2.3"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.6"
      />
      <path
        d="M7.3 16.5V20M16.7 16.5V20M4 20H20"
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getRowCounts(total: number): number[] {
  if (total <= 0) return [];

  const baseTotal = SEATING_TEMPLATE.reduce((sum, item) => sum + item, 0);
  const counts =
    total === baseTotal
      ? [...SEATING_TEMPLATE]
      : SEATING_TEMPLATE.map((count) => Math.floor((count * total) / baseTotal));

  let current = counts.reduce((sum, item) => sum + item, 0);
  let cursor = 0;

  while (current < total) {
    counts[cursor % counts.length] += 1;
    current += 1;
    cursor += 1;
  }

  while (current > total) {
    const index = counts.length - 1 - (cursor % counts.length);
    if (counts[index] > 0) {
      counts[index] -= 1;
      current -= 1;
    }
    cursor += 1;
  }

  return counts.filter((count) => count > 0);
}

function slotMatchesFilter(
  slot: SeatSlot,
  filterProvince?: number,
  filterParty?: string,
  filterStatus?: string
): boolean {
  if (filterProvince && slot.provinceId !== filterProvince) return false;

  if ("placeholder" in slot) {
    if (filterParty) return false;
    if (filterStatus && filterStatus !== "pending") return false;
    return true;
  }

  if (filterParty && slot.partyShortName.toLowerCase() !== filterParty.toLowerCase()) return false;
  if (filterStatus && slot.status !== filterStatus) return false;
  return true;
}

export default function SeatMap({
  onSeatClick,
  filterProvince,
  filterParty,
  filterStatus,
  compact = false,
}: SeatMapProps) {
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<SeatData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const res = await fetch("/api/all-results", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setSeats(json.data);
        }
      } catch {
        // silent fallback
      }
    };

    fetchSeats();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/sse");
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "sync_complete" && payload.constituenciesChanged > 0) {
            fetchSeats();
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // no-op
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const allSeatSlots = useMemo(() => {
    const seatLookup = new Map<string, SeatData>();
    for (const seat of seats) {
      seatLookup.set(`${seat.districtId}-${seat.constNumber}`, seat);
    }

    const slots: SeatSlot[] = [];
    for (const province of provinces) {
      for (const district of province.districts) {
        for (let seatNo = 1; seatNo <= district.constituencies; seatNo += 1) {
          const key = `${district.districtId}-${seatNo}`;
          const liveSeat = seatLookup.get(key);
          if (liveSeat) {
            slots.push(liveSeat);
          } else {
            slots.push({
              placeholder: true,
              districtId: district.districtId,
              constNumber: seatNo,
              districtName: district.name,
              constituency: `${district.name}-${seatNo}`,
              constituencySlug: `${district.slug}-${seatNo}`,
              provinceId: province.id,
              provinceName: province.name,
              status: "pending",
            });
          }
        }
      }
    }

    return slots;
  }, [seats]);

  const displaySlots = useMemo(
    () =>
      allSeatSlots.filter((slot) =>
        slotMatchesFilter(slot, filterProvince, filterParty, filterStatus)
      ),
    [allSeatSlots, filterProvince, filterParty, filterStatus]
  );

  const wonCount = displaySlots.filter((slot) => isSeatData(slot) && slot.status === "won").length;
  const leadingCount = displaySlots.filter((slot) => isSeatData(slot) && slot.status === "leading").length;
  const pendingCount = displaySlots.filter((slot) => ("placeholder" in slot ? true : slot.status === "pending")).length;

  const partyLegend = useMemo(() => {
    const map = new Map<string, { party: string; color: string; total: number }>();
    for (const slot of displaySlots) {
      if (!isSeatData(slot)) continue;
      if (!slot.partyShortName || slot.status === "pending") continue;
      const current = map.get(slot.partyShortName);
      if (current) {
        current.total += 1;
      } else {
        map.set(slot.partyShortName, {
          party: slot.partyShortName,
          color: resolvePartyColor(slot.partyShortName, slot.partyColor),
          total: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [displaySlots]);

  const seatPoints = useMemo(() => {
    const rows = getRowCounts(displaySlots.length);
    const points: SeatPoint[] = [];
    if (rows.length === 0) return points;

    const centerX = 50;
    const centerY = 70;
    const maxRadius = 42;
    const minRadius = rows.length === 1 ? 42 : 20;
    const radiusStep = rows.length > 1 ? (maxRadius - minRadius) / (rows.length - 1) : 0;
    const angleStart = Math.PI * 0.98;
    const angleEnd = Math.PI * 0.02;

    let pointer = 0;
    rows.forEach((count, rowIndex) => {
      const radius = maxRadius - rowIndex * radiusStep;
      for (let i = 0; i < count; i += 1) {
        const slot = displaySlots[pointer];
        if (!slot) break;
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = angleStart + (angleEnd - angleStart) * t;
        points.push({
          slot,
          x: centerX + radius * Math.cos(angle),
          y: centerY - radius * Math.sin(angle),
        });
        pointer += 1;
      }
    });

    return points;
  }, [displaySlots]);

  const seatSize = compact ? 16 : seatPoints.length > 120 ? 20 : 23;

  return (
    <div className={compact ? "" : "glass-card p-6 sm:p-7"}>
      {!compact && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Parliament View</p>
              <h2 className="mt-1 text-base font-black text-slate-900">Rounded Seat Arrangement</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> Won ({wonCount})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-400" /> Leading ({leadingCount})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-300" /> Pending ({pendingCount})
              </span>
            </div>
          </div>

          {partyLegend.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2.5">
              {partyLegend.map((party) => (
                <span
                  key={party.party}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/75 bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-700"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: party.color }} />
                  {party.party} ({party.total})
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <div className="relative mx-auto aspect-[2.2/1] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/75 bg-gradient-to-b from-slate-50 to-white/80 p-2.5 sm:p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.06),transparent_50%)]" />

        <div className="relative h-full w-full">
          {seatPoints.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-500">
                No seats matched your search and filters.
              </div>
            </div>
          ) : (
            seatPoints.map(({ slot, x, y }) => {
              const key = `${slot.districtId}-${slot.constNumber}`;
              const isWon = isSeatData(slot) && slot.status === "won";
              const isLeading = isSeatData(slot) && slot.status === "leading";
              const partyColor = isSeatData(slot)
                ? resolvePartyColor(slot.partyShortName, slot.partyColor)
                : "#d1d5db";
              const seatColor = isSeatData(slot)
                ? isWon
                  ? partyColor
                  : isLeading
                    ? withAlpha(partyColor, 0.55)
                    : "#cbd5e1"
                : "#d1d5db";
              const seatBorder = isSeatData(slot) && (isWon || isLeading) ? partyColor : "#cbd5e1";
              const label = isSeatData(slot)
                ? `${slot.constituency} — ${slot.partyShortName}${isWon ? " (Won)" : isLeading ? " (Leading)" : ""}`
                : `${slot.constituency} (Pending)`;

              const content = (
                <span
                  className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${seatSize}px`,
                    height: `${seatSize}px`,
                    filter: isWon ? `drop-shadow(0 0 2px ${withAlpha(seatBorder, 0.65)})` : "none",
                  }}
                  title={label}
                  onMouseEnter={(event) => {
                    if (!isSeatData(slot)) return;
                    setHoveredSeat(slot);
                    setTooltipPos({ x: event.clientX, y: event.clientY });
                  }}
                  onMouseMove={(event) => {
                    if (!hoveredSeat) return;
                    setTooltipPos({ x: event.clientX, y: event.clientY });
                  }}
                  onMouseLeave={() => setHoveredSeat(null)}
                >
                  <SeatGlyph size={seatSize} fillColor={seatColor} strokeColor={seatBorder} />
                  {isWon && (
                    <span
                      className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white text-[10px] font-black leading-none text-white"
                      style={{ backgroundColor: partyColor }}
                    >
                      ✓
                    </span>
                  )}
                </span>
              );

              if (!isSeatData(slot)) {
                return <React.Fragment key={key}>{content}</React.Fragment>;
              }

              return (
                <Link
                  key={key}
                  href={`/results?constituency=${slot.constituencySlug}`}
                  onClick={(event) => {
                    if (!onSeatClick) return;
                    event.preventDefault();
                    onSeatClick(slot);
                  }}
                  className="contents"
                >
                  {content}
                </Link>
              );
            })
          )}
        </div>

        <div className="pointer-events-none absolute bottom-1.5 left-1/2 h-6 w-28 -translate-x-1/2 rounded-t-full border border-slate-300/45 bg-slate-900/10 sm:bottom-2 sm:h-7 sm:w-36" />
      </div>

      {hoveredSeat && (
        <div
          className="pointer-events-none fixed z-50 animate-fade-in"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
        >
          <div className="max-w-[230px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
            <div className="text-xs font-bold text-slate-900">{hoveredSeat.constituency}</div>
            <div className="mt-0.5 text-[10px] text-slate-500">{hoveredSeat.provinceName}</div>

            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[10px] font-semibold text-slate-700">{hoveredSeat.leaderName}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: withAlpha(
                      resolvePartyColor(hoveredSeat.partyShortName, hoveredSeat.partyColor),
                      0.14
                    ),
                    color: resolvePartyColor(hoveredSeat.partyShortName, hoveredSeat.partyColor),
                  }}
                >
                  {hoveredSeat.partyShortName}
                </span>
              </div>
              {hoveredSeat.runnerUpName && (
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[10px] text-slate-600">{hoveredSeat.runnerUpName}</span>
                  <span className="text-[10px] text-slate-500">-{hoveredSeat.margin.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-1 text-[10px] text-slate-500">
                {hoveredSeat.totalVotes.toLocaleString()} votes
                {hoveredSeat.status === "won" && " · Declared"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
