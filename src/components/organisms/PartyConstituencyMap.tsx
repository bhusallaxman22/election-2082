"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { provinces } from "@/data/provinces";
import type { Party } from "@/data/parties";
import Link from "next/link";
import { CLIENT_FETCH_CACHE } from "@/lib/results-mode";

const InteractiveMap = dynamic(
  () => import("@/components/organisms/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    ),
  }
);

interface SeatResult {
  districtId: number;
  districtName: string;
  constNumber: number;
  provinceId: number;
  provinceName: string;
  constituency: string;
  partyShortName: string;
  partyColor: string;
  leaderVotes: number;
  status: "won" | "leading" | "counting" | "pending";
}

interface DistrictSummary {
  districtId: number;
  districtName: string;
  provinceId: number;
  provinceName: string;
  totalConstituencies: number;
  countedConstituencies: number;
  dominantParty: string;
  dominantColor: string;
  controlShare: number;
  breakdown: {
    party: string;
    color: string;
    seats: number;
    votes: number;
  }[];
}

const NEUTRAL_MAP_COLOR = "#e2e8f0";

function formatDistrictBreakdown(summary: DistrictSummary): string {
  if (!summary.breakdown.length) return "No counted constituencies yet";

  return summary.breakdown
    .slice(0, 3)
    .map((entry) => `${entry.party} ${entry.seats}/${summary.totalConstituencies}`)
    .join(" · ");
}

export default function PartyConstituencyMap({ parties }: { parties: Party[] }) {
  const [seats, setSeats] = useState<SeatResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/all-results", { cache: CLIENT_FETCH_CACHE });
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setSeats(json.data);
        }
      } catch {
        if (!cancelled) setSeats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const districtCatalog = useMemo(() => {
    const map = new Map<number, {
      districtId: number;
      districtName: string;
      provinceId: number;
      provinceName: string;
      totalConstituencies: number;
    }>();

    for (const province of provinces) {
      for (const district of province.districts) {
        map.set(district.districtId, {
          districtId: district.districtId,
          districtName: district.name,
          provinceId: province.id,
          provinceName: province.name,
          totalConstituencies: district.constituencies,
        });
      }
    }

    return map;
  }, []);

  const partyMeta = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const party of parties) {
      map.set(party.shortName, {
        name: party.name,
        color: party.color,
      });
    }
    return map;
  }, [parties]);

  const {
    districtColorMap,
    districtTooltipMap,
    dominantDistricts,
    legendItems,
    coloredConstituencies,
    coloredDistricts,
  } = useMemo(() => {
    const summaryMap = new Map<number, DistrictSummary>();
    const legendMap = new Map<string, { party: string; color: string; seats: number }>();

    for (const district of districtCatalog.values()) {
      summaryMap.set(district.districtId, {
        districtId: district.districtId,
        districtName: district.districtName,
        provinceId: district.provinceId,
        provinceName: district.provinceName,
        totalConstituencies: district.totalConstituencies,
        countedConstituencies: 0,
        dominantParty: "",
        dominantColor: NEUTRAL_MAP_COLOR,
        controlShare: 0,
        breakdown: [],
      });
    }

    for (const seat of seats) {
      if (!seat.partyShortName || (seat.status !== "won" && seat.status !== "leading" && seat.status !== "counting")) continue;

      const district = summaryMap.get(seat.districtId);
      if (!district) continue;

      district.countedConstituencies += 1;

      const existing = district.breakdown.find((entry) => entry.party === seat.partyShortName);
      const resolvedColor = partyMeta.get(seat.partyShortName)?.color || seat.partyColor || "#64748b";
      if (existing) {
        existing.seats += 1;
        existing.votes += Number(seat.leaderVotes || 0);
      } else {
        district.breakdown.push({
          party: seat.partyShortName,
          color: resolvedColor,
          seats: 1,
          votes: Number(seat.leaderVotes || 0),
        });
      }

      const legend = legendMap.get(seat.partyShortName) || {
        party: seat.partyShortName,
        color: resolvedColor,
        seats: 0,
      };
      legend.seats += 1;
      legendMap.set(seat.partyShortName, legend);
    }

    const nextDistrictColorMap: Record<number, string> = {};
    const nextTooltipMap: Record<number, { title: string; subtitle: string; meta: string }> = {};
    const rankedDistricts: DistrictSummary[] = [];

    for (const district of summaryMap.values()) {
      district.breakdown.sort((a, b) => b.seats - a.seats || b.votes - a.votes);
      const dominant = district.breakdown[0];
      district.dominantParty = dominant?.party || "";
      district.dominantColor = dominant?.color || NEUTRAL_MAP_COLOR;
      district.controlShare = dominant ? dominant.seats / Math.max(district.totalConstituencies, 1) : 0;

      nextDistrictColorMap[district.districtId] = district.dominantColor;
      nextTooltipMap[district.districtId] = {
        title: district.districtName,
        subtitle: `${district.provinceName} · ${district.countedConstituencies}/${district.totalConstituencies} constituencies counted`,
        meta: dominant
          ? `${dominant.party} controls ${dominant.seats}/${district.totalConstituencies} · ${formatDistrictBreakdown(district)}`
          : "No counted constituencies yet",
      };

      if (dominant) rankedDistricts.push(district);
    }

    return {
      districtColorMap: nextDistrictColorMap,
      districtTooltipMap: nextTooltipMap,
      dominantDistricts: rankedDistricts
        .sort((a, b) => b.controlShare - a.controlShare || b.countedConstituencies - a.countedConstituencies)
        .slice(0, 8),
      legendItems: Array.from(legendMap.values()).sort((a, b) => b.seats - a.seats),
      coloredConstituencies: Array.from(legendMap.values()).reduce((sum, item) => sum + item.seats, 0),
      coloredDistricts: rankedDistricts.length,
    };
  }, [districtCatalog, partyMeta, seats]);

  const hasResolvedData = !loading && seats.length > 0;
  const selectedDistrict = useMemo(
    () => dominantDistricts.find((district) => district.districtId === selectedDistrictId) || null,
    [dominantDistricts, selectedDistrictId]
  );

  return (
    <div className="glass-card p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Spatial Control</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Nepal Party Control Map</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Districts are colored by the party controlling the most constituencies inside that district. Select a district to inspect its party breakdown here.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center">
            <div className="text-2xl font-black text-slate-900">{hasResolvedData ? coloredConstituencies : "—"}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Seats Colored</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center">
            <div className="text-2xl font-black text-slate-900">{hasResolvedData ? coloredDistricts : "—"}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Districts</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-center">
            <div className="text-2xl font-black text-slate-900">{hasResolvedData ? legendItems.length : "—"}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Parties</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {hasResolvedData ? (
          legendItems.map((item) => (
            <div
              key={item.party}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.party}</span>
              <span className="text-slate-400">{item.seats}</span>
            </div>
          ))
        ) : (
          <p className="text-xs font-semibold text-slate-400">Loading party control legend…</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/70 p-2">
          <InteractiveMap
            showProvinceBorders
            height={470}
            fitMaxZoom={8}
            fitPadding={[18, 18]}
            districtColorMap={districtColorMap}
            districtTooltipMap={districtTooltipMap}
            selectedDistrictId={selectedDistrictId}
            onDistrictClick={(districtId) => {
              setSelectedDistrictId((current) => (current === districtId ? null : districtId));
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">District Control</h3>
            <div className="mt-4 space-y-3">
              {hasResolvedData ? (
                dominantDistricts.map((district) => {
                  const dominant = district.breakdown[0];
                  const share = Math.round(district.controlShare * 100);
                  const isSelected = district.districtId === selectedDistrictId;
                  return (
                    <button
                      key={district.districtId}
                      type="button"
                      onClick={() => setSelectedDistrictId((current) => (current === district.districtId ? null : district.districtId))}
                      className={`w-full rounded-[22px] border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-slate-400 bg-white shadow-sm"
                          : "border-slate-200/80 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{district.districtName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{district.provinceName}</p>
                        </div>
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                          style={{ backgroundColor: dominant?.color || "#94a3b8" }}
                        >
                          {dominant?.party || "N/A"}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${share}%`, backgroundColor: dominant?.color || "#94a3b8" }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{dominant?.seats || 0} of {district.totalConstituencies} constituencies</span>
                        <span>{share}% control</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-400">
                  Building district control summaries…
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5">
            {selectedDistrict ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Selected District</h3>
                    <p className="mt-2 text-lg font-black text-slate-900">{selectedDistrict.districtName}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedDistrict.provinceName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDistrictId(null)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {selectedDistrict.breakdown.map((entry) => (
                    <div key={entry.party} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-sm font-semibold text-slate-800">{entry.party}</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{entry.seats}</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{entry.votes.toLocaleString()} leading/winning votes across district seats</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Link
                    href={`/results?search=${encodeURIComponent(selectedDistrict.districtName)}`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-red-600 transition-colors hover:text-red-700"
                  >
                    Open district results
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">How To Read</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>Each district uses the color of the party with the most constituency wins there.</li>
                  <li>Tooltips show counted constituencies and the district party breakdown.</li>
                  <li>Click any district to inspect its party-control breakdown here.</li>
                </ul>
                {loading && (
                  <p className="mt-4 text-xs font-semibold text-slate-400">Loading seat control summary…</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
