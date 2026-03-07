"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

interface PRSeat {
  pr: true;
  partyShortName: string;
  partyColor: string;
  partySlug: string;
  index: number; // seat index within party
}

type SeatSlot = SeatData | PlaceholderSeat;

interface PRPartyData {
  shortName: string;
  color: string;
  seats: number;
  votes: number;
  votePercent: number;
}

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

interface PRSeatPoint {
  seat: PRSeat;
  x: number;
  y: number;
}

const SEATING_TEMPLATE = [39, 35, 31, 27, 22, 11];
const CHAMBER_WIDTH = 1000;
const CHAMBER_HEIGHT = 620;
const CHAMBER_CENTER_X = 500;
const CHAMBER_CENTER_Y = 546;
const CHAMBER_OUTER_RADIUS = 462;
const CHAMBER_INNER_RADIUS = 208;
const PR_RING_GAP = 22;
const PR_RING_RADIUS = CHAMBER_OUTER_RADIUS + PR_RING_GAP + 14;
const TOTAL_PR_SEATS = 110;
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

function arcPath(radius: number): string {
  return `M ${CHAMBER_CENTER_X - radius} ${CHAMBER_CENTER_Y} A ${radius} ${radius} 0 0 1 ${CHAMBER_CENTER_X + radius} ${CHAMBER_CENTER_Y}`;
}

export default function SeatMap({
  onSeatClick,
  filterProvince,
  filterParty,
  filterStatus,
  compact = false,
}: SeatMapProps) {
  const router = useRouter();
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [prParties, setPRParties] = useState<PRPartyData[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<SeatData | null>(null);
  const [hoveredPR, setHoveredPR] = useState<PRSeat | null>(null);
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

    const fetchPR = async () => {
      try {
        const res = await fetch("/api/pr-results", { cache: "no-store" });
        const json = await res.json();
        if (json.parties) {
          setPRParties(
            json.parties
              .filter((p: { seats: number }) => p.seats > 0)
              .map((p: { shortName: string; color: string; seats: number; votes: number; votePercent: number }) => ({
                shortName: p.shortName,
                color: p.color,
                seats: p.seats,
                votes: p.votes,
                votePercent: p.votePercent,
              }))
          );
        }
      } catch {
        // silent
      }
    };

    fetchSeats();
    fetchPR();

    // Poll every 2 minutes for fresh data
    const pollInterval = setInterval(() => {
      fetchSeats();
      fetchPR();
    }, 120_000);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/sse");
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "sync_complete" && payload.constituenciesChanged > 0) {
            fetchSeats();
            fetchPR();
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // no-op
    }

    return () => {
      clearInterval(pollInterval);
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

  const rowCounts = useMemo(() => getRowCounts(displaySlots.length), [displaySlots.length]);

  // Generate PR seat slots from party allocations
  const prSeatSlots = useMemo((): PRSeat[] => {
    const slots: PRSeat[] = [];
    for (const party of prParties) {
      for (let i = 0; i < party.seats; i++) {
        slots.push({
          pr: true,
          partyShortName: party.shortName,
          partyColor: party.color,
          partySlug: party.shortName.toLowerCase().replace(/[\s()]/g, "-"),
          index: i,
        });
      }
    }
    return slots;
  }, [prParties]);

  const fptpWon = displaySlots.filter((slot) => isSeatData(slot) && slot.status === "won").length;
  const fptpLeading = displaySlots.filter((slot) => isSeatData(slot) && slot.status === "leading").length;
  const fptpPending = displaySlots.filter((slot) => ("placeholder" in slot ? true : slot.status === "pending")).length;
  const prAllocated = prSeatSlots.length;
  const wonCount = fptpWon + prAllocated;
  const leadingCount = fptpLeading;
  const pendingCount = fptpPending + (TOTAL_PR_SEATS - prAllocated);

  const partyLegend = useMemo(() => {
    const map = new Map<string, { party: string; color: string; total: number; fptp: number; pr: number }>();

    // Count FPTP seats
    for (const slot of displaySlots) {
      if (!isSeatData(slot)) continue;
      if (!slot.partyShortName || slot.status === "pending") continue;
      const current = map.get(slot.partyShortName);
      if (current) {
        current.total += 1;
        current.fptp += 1;
      } else {
        map.set(slot.partyShortName, {
          party: slot.partyShortName,
          color: resolvePartyColor(slot.partyShortName, slot.partyColor),
          total: 1,
          fptp: 1,
          pr: 0,
        });
      }
    }

    // Add PR seats
    for (const party of prParties) {
      if (party.seats <= 0) continue;
      const current = map.get(party.shortName);
      if (current) {
        current.total += party.seats;
        current.pr += party.seats;
      } else {
        map.set(party.shortName, {
          party: party.shortName,
          color: resolvePartyColor(party.shortName, party.color),
          total: party.seats,
          fptp: 0,
          pr: party.seats,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [displaySlots, prParties]);

  const seatPoints = useMemo(() => {
    const points: SeatPoint[] = [];
    if (rowCounts.length === 0) return points;

    const maxRadius = CHAMBER_OUTER_RADIUS;
    const minRadius = rowCounts.length === 1 ? CHAMBER_OUTER_RADIUS : CHAMBER_INNER_RADIUS;
    const radiusStep = rowCounts.length > 1 ? (maxRadius - minRadius) / (rowCounts.length - 1) : 0;
    const angleStart = Math.PI * 0.98;
    const angleEnd = Math.PI * 0.02;

    let pointer = 0;
    rowCounts.forEach((count, rowIndex) => {
      const radius = maxRadius - rowIndex * radiusStep;
      for (let i = 0; i < count; i += 1) {
        const slot = displaySlots[pointer];
        if (!slot) break;
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = angleStart + (angleEnd - angleStart) * t;
        points.push({
          slot,
          x: CHAMBER_CENTER_X + radius * Math.cos(angle),
          y: CHAMBER_CENTER_Y - radius * Math.sin(angle),
        });
        pointer += 1;
      }
    });

    return points;
  }, [displaySlots, rowCounts]);

  // PR seats laid out on an outer arc ring
  const prSeatPoints = useMemo((): PRSeatPoint[] => {
    const total: number = TOTAL_PR_SEATS;
    if (total <= 0) return [];

    const angleStart = Math.PI * 0.98;
    const angleEnd = Math.PI * 0.02;
    const points: PRSeatPoint[] = [];

    // Lay out all 110 PR positions; fill allocated ones with party color, rest grey
    let slotIndex = 0;
    for (let i = 0; i < total; i++) {
      const t = total === 1 ? 0.5 : i / (total - 1);
      const angle = angleStart + (angleEnd - angleStart) * t;
      const x = CHAMBER_CENTER_X + PR_RING_RADIUS * Math.cos(angle);
      const y = CHAMBER_CENTER_Y - PR_RING_RADIUS * Math.sin(angle);

      if (slotIndex < prSeatSlots.length) {
        points.push({ seat: prSeatSlots[slotIndex], x, y });
        slotIndex++;
      } else {
        // Unallocated PR seat placeholder
        points.push({
          seat: {
            pr: true,
            partyShortName: "",
            partyColor: "#d1d5db",
            partySlug: "",
            index: i,
          },
          x, y,
        });
      }
    }

    return points;
  }, [prSeatSlots]);

  const guideRadii = useMemo(() => {
    if (rowCounts.length === 0) return [];
    const maxRadius = CHAMBER_OUTER_RADIUS;
    const minRadius = rowCounts.length === 1 ? CHAMBER_OUTER_RADIUS : CHAMBER_INNER_RADIUS;
    const radiusStep = rowCounts.length > 1 ? (maxRadius - minRadius) / (rowCounts.length - 1) : 0;
    return rowCounts
      .map((_, index) => maxRadius - index * radiusStep)
      .filter((_, index) => index % 2 === 0 || index === rowCounts.length - 1);
  }, [rowCounts]);

  const seatSize = compact ? 16 : seatPoints.length > 120 ? 18 : 20;
  const prDotSize = 5.5;

  const onSeatSelect = (slot: SeatSlot) => {
    if (!isSeatData(slot)) return;
    if (onSeatClick) {
      onSeatClick(slot);
      return;
    }
    router.push(`/results?constituency=${slot.constituencySlug}`);
  };

  const onPRSeatClick = (seat: PRSeat) => {
    if (seat.partyShortName) {
      router.push(`/analytics?view=party&name=${encodeURIComponent(seat.partyShortName)}`);
    }
  };

  // Expanded viewBox to fit PR outer ring
  const svgViewBox = `-10 ${CHAMBER_CENTER_Y - PR_RING_RADIUS - 20} ${CHAMBER_WIDTH + 20} ${PR_RING_RADIUS + 100}`;

  return (
    <div className={compact ? "" : "glass-card p-4 sm:p-5"}>
      {!compact && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Parliament View</p>
              <h2 className="mt-1 text-base font-black text-slate-900">Parliament Chamber</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> Won/Allocated ({wonCount})
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1">
                <span className="h-3 w-3 rounded-full bg-amber-400" /> Leading ({leadingCount})
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1">
                <span className="h-3 w-3 rounded-full bg-slate-300" /> Pending ({pendingCount})
              </span>
            </div>
          </div>

          {partyLegend.length > 0 && (
            <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
              {partyLegend.map((party) => (
                <span
                  key={party.party}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/75 bg-white/85 px-3 py-1 text-[11px] font-bold text-slate-700"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: party.color }} />
                  {party.party} ({party.total})
                  {party.fptp > 0 && party.pr > 0 && (
                    <span className="text-[9px] font-medium text-slate-400">{party.fptp}F+{party.pr}PR</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <div className="relative mx-auto w-full max-w-[920px] overflow-hidden rounded-[1.4rem] border border-white/80 bg-gradient-to-b from-slate-50 via-white to-slate-100/80">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_93%,rgba(15,23,42,0.08),transparent_58%)]" />
        <div className="relative aspect-[1.56/1] sm:aspect-[1.86/1] lg:aspect-[2/1]">
          {seatPoints.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-500">
                No seats matched your search and filters.
              </div>
            </div>
          ) : (
            <svg
              viewBox={svgViewBox}
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label="Parliament seat arrangement"
            >
              {/* PR outer ring guide arc */}
              <path
                d={arcPath(PR_RING_RADIUS)}
                fill="none"
                stroke={withAlpha("#94a3b8", 0.25)}
                strokeWidth={1}
                strokeLinecap="round"
                strokeDasharray="3 4"
                className="pointer-events-none"
              />

              {/* PR label */}
              <text
                x={CHAMBER_CENTER_X}
                y={CHAMBER_CENTER_Y - PR_RING_RADIUS - 8}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#94a3b8"
                className="pointer-events-none"
              >
                PR ({prAllocated}/{TOTAL_PR_SEATS})
              </text>

              {/* FPTP label */}
              <text
                x={CHAMBER_CENTER_X}
                y={CHAMBER_CENTER_Y - CHAMBER_OUTER_RADIUS - 6}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#94a3b8"
                className="pointer-events-none"
              >
                FPTP ({fptpWon + fptpLeading}/{displaySlots.length})
              </text>

              {/* FPTP guide arcs */}
              <g className="pointer-events-none" aria-hidden="true">
                {guideRadii.map((radius) => (
                  <path
                    key={radius}
                    d={arcPath(radius)}
                    fill="none"
                    stroke={withAlpha("#94a3b8", 0.4)}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  />
                ))}
              </g>

              {seatPoints.map(({ slot, x, y }) => {
                const key = `${slot.districtId}-${slot.constNumber}`;
                const isWon = isSeatData(slot) && slot.status === "won";
                const isLeading = isSeatData(slot) && slot.status === "leading";
                const partyColor = isSeatData(slot)
                  ? resolvePartyColor(slot.partyShortName, slot.partyColor)
                  : "#d1d5db";
                const fillColor = isSeatData(slot)
                  ? isWon
                    ? partyColor
                    : isLeading
                      ? withAlpha(partyColor, 0.35)
                      : "#d9e0ea"
                  : "#d1d5db";
                const strokeColor = isSeatData(slot) && (isWon || isLeading) ? partyColor : "#94a3b8";
                const label = isSeatData(slot)
                  ? `${slot.constituency} — ${slot.partyShortName}${isWon ? " (Won)" : isLeading ? " (Leading)" : ""}`
                  : `${slot.constituency} (Pending)`;

                const bodyWidth = seatSize;
                const bodyHeight = seatSize * 0.52;
                const bodyY = -seatSize * 0.08;
                const backWidth = seatSize * 0.74;
                const backHeight = seatSize * 0.3;
                const backX = -backWidth / 2;
                const backY = -seatSize * 0.48;
                const bodyX = -bodyWidth / 2;

                return (
                  <g
                    key={key}
                    transform={`translate(${x} ${y})`}
                    style={{
                      filter: isWon ? `drop-shadow(0 0 3px ${withAlpha(partyColor, 0.58)})` : undefined,
                    }}
                    className={isSeatData(slot) ? "cursor-pointer outline-none" : ""}
                    tabIndex={isSeatData(slot) ? 0 : -1}
                    aria-label={label}
                    onClick={() => onSeatSelect(slot)}
                    onKeyDown={(event) => {
                      if (!isSeatData(slot)) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSeatSelect(slot);
                      }
                    }}
                    onMouseEnter={(event) => {
                      if (!isSeatData(slot)) return;
                      setHoveredSeat(slot);
                      setTooltipPos({ x: event.clientX, y: event.clientY });
                    }}
                    onMouseMove={(event) => {
                      if (!isSeatData(slot)) return;
                      setTooltipPos({ x: event.clientX, y: event.clientY });
                    }}
                    onMouseLeave={() => setHoveredSeat(null)}
                  >
                    <rect
                      x={backX}
                      y={backY}
                      width={backWidth}
                      height={backHeight}
                      rx={backHeight / 2}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={1.2}
                    />
                    <rect
                      x={bodyX}
                      y={bodyY}
                      width={bodyWidth}
                      height={bodyHeight}
                      rx={bodyHeight / 2}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={1.2}
                    />
                    <rect
                      x={-bodyWidth * 0.18}
                      y={bodyY + bodyHeight * 0.18}
                      width={bodyWidth * 0.36}
                      height={bodyHeight * 0.2}
                      rx={bodyHeight * 0.08}
                      fill={withAlpha("#ffffff", isWon ? 0.32 : 0.18)}
                    />

                    {isWon && (
                      <g transform={`translate(${seatSize * 0.44} ${-seatSize * 0.44})`}>
                        <circle
                          r={seatSize * 0.23}
                          fill={partyColor}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        <text
                          x={0}
                          y={seatSize * 0.08}
                          textAnchor="middle"
                          fontSize={seatSize * 0.26}
                          fontWeight={900}
                          fill="#ffffff"
                        >
                          ✓
                        </text>
                      </g>
                    )}
                    {!isWon && isLeading && (
                      <circle
                        cx={seatSize * 0.44}
                        cy={-seatSize * 0.44}
                        r={seatSize * 0.14}
                        fill={partyColor}
                        stroke="#ffffff"
                        strokeWidth={1.2}
                      />
                    )}
                    <title>{label}</title>
                  </g>
                );
              })}

              <rect
                x={CHAMBER_CENTER_X - 56}
                y={CHAMBER_CENTER_Y + 14}
                width={112}
                height={20}
                rx={10}
                fill={withAlpha("#0f172a", 0.18)}
                stroke={withAlpha("#64748b", 0.45)}
                strokeWidth={1}
              />

              {/* PR seats - outer ring dots */}
              {prSeatPoints.map(({ seat, x, y }, idx) => {
                const allocated = seat.partyShortName !== "";
                const color = allocated
                  ? resolvePartyColor(seat.partyShortName, seat.partyColor)
                  : "#d1d5db";
                const label = allocated
                  ? `PR — ${seat.partyShortName}`
                  : "PR (Unallocated)";

                return (
                  <circle
                    key={`pr-${idx}`}
                    cx={x}
                    cy={y}
                    r={prDotSize}
                    fill={allocated ? color : "#e2e8f0"}
                    stroke={allocated ? color : "#94a3b8"}
                    strokeWidth={0.8}
                    className={allocated ? "cursor-pointer" : ""}
                    style={allocated ? { filter: `drop-shadow(0 0 2px ${withAlpha(color, 0.4)})` } : undefined}
                    onClick={() => allocated && onPRSeatClick(seat)}
                    onMouseEnter={(event) => {
                      if (!allocated) return;
                      setHoveredPR(seat);
                      setTooltipPos({ x: event.clientX, y: event.clientY });
                    }}
                    onMouseMove={(event) => {
                      if (!allocated) return;
                      setTooltipPos({ x: event.clientX, y: event.clientY });
                    }}
                    onMouseLeave={() => setHoveredPR(null)}
                  >
                    <title>{label}</title>
                  </circle>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {hoveredSeat && (
        <div
          className="pointer-events-none fixed z-50 animate-fade-in"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
        >
          <div className="max-w-[230px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
            <div className="text-xs font-bold text-slate-900">{hoveredSeat.constituency}</div>
            <div className="mt-0.5 text-[10px] text-slate-500">{hoveredSeat.provinceName} · FPTP</div>

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

      {hoveredPR && (
        <div
          className="pointer-events-none fixed z-50 animate-fade-in"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
        >
          <div className="max-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: resolvePartyColor(hoveredPR.partyShortName, hoveredPR.partyColor) }} />
              <span className="text-xs font-bold text-slate-900">{hoveredPR.partyShortName}</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">Proportional Representation seat</div>
          </div>
        </div>
      )}
    </div>
  );
}
