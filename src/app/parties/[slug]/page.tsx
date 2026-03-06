"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import PageTemplate from "@/components/templates/PageTemplate";
import { useElectionData } from "@/context/ElectionDataContext";
import Link from "next/link";

interface SeatResult {
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
  candidates: {
    id: string;
    name: string;
    partyShortName: string;
    partyColor: string;
    votes: number;
    status: "won" | "leading" | "trailing" | "pending";
    margin?: number;
  }[];
}

type TabType = "all" | "won" | "leading" | "close";

export default function PartyDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { parties } = useElectionData();
  const [allSeats, setAllSeats] = useState<SeatResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("all");

  // Find party by slug (e.g. "rsp", "cpn-uml", "nc", "rastriya-swatantra-party-rsp")
  const party = useMemo(() => {
    return parties.find(
      (p) =>
        p.shortName.toLowerCase().replace(/[\s()]/g, "-") === slug ||
        p.shortName.toLowerCase() === slug ||
        p.name.toLowerCase().replace(/\s+/g, "-") === slug
    );
  }, [parties, slug]);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const res = await fetch("/api/all-results", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setAllSeats(json.data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchSeats();
  }, []);

  // Filter seats where this party is leading or won
  const partySeats = useMemo(() => {
    if (!party) return [];
    return allSeats.filter(
      (s) => s.partyShortName === party.shortName
    );
  }, [allSeats, party]);

  const wonSeats = partySeats.filter((s) => s.status === "won");
  const leadingSeats = partySeats.filter((s) => s.status === "leading");
  const closeRaces = partySeats.filter(
    (s) => s.status === "leading" && s.margin < 2000 && s.totalVotes > 0
  );

  // Also find seats where party is in contest (runner-up)
  const contestingSeats = useMemo(() => {
    if (!party) return [];
    return allSeats.filter((s) => {
      if (s.partyShortName === party.shortName) return false;
      return s.candidates.some((c) => c.partyShortName === party.shortName);
    });
  }, [allSeats, party]);

  const displaySeats = useMemo(() => {
    switch (tab) {
      case "won":
        return wonSeats;
      case "leading":
        return leadingSeats;
      case "close":
        return closeRaces;
      default:
        return [...wonSeats, ...leadingSeats];
    }
  }, [tab, wonSeats, leadingSeats, closeRaces]);

  // Province-wise breakdown
  const provinceBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; id: number; won: number; leading: number }>();
    for (const seat of partySeats) {
      const existing = map.get(seat.provinceName) || {
        name: seat.provinceName,
        id: seat.provinceId,
        won: 0,
        leading: 0,
      };
      if (seat.status === "won") existing.won++;
      if (seat.status === "leading") existing.leading++;
      map.set(seat.provinceName, existing);
    }
    return Array.from(map.values()).sort((a, b) => (b.won + b.leading) - (a.won + a.leading));
  }, [partySeats]);

  if (!party) {
    // If parties haven't loaded yet, show loading briefly
    if (parties.length === 0) {
      return (
        <PageTemplate>
          <div className="card p-12 text-center animate-fade-in">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Party Data...</h2>
            <p className="text-gray-500">Fetching latest election results</p>
          </div>
        </PageTemplate>
      );
    }
    return (
      <PageTemplate>
        <div className="card p-12 text-center animate-fade-in">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Party Not Found</h2>
          <p className="text-gray-500 mb-6">No party found for &quot;{slug}&quot;</p>
          <Link
            href="/parties"
            className="text-red-600 hover:text-red-700 font-semibold text-sm"
          >
            ← Browse All Parties
          </Link>
        </div>
      </PageTemplate>
    );
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All Seats", count: wonSeats.length + leadingSeats.length },
    { key: "won", label: "Won", count: wonSeats.length },
    { key: "leading", label: "Leading", count: leadingSeats.length },
    { key: "close", label: "Close Races", count: closeRaces.length },
  ];

  return (
    <PageTemplate>
      <div className="animate-fade-in">
        {/* Party Header */}
        <div className="card overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: party.color }} />
          <div className="p-6 sm:p-8">
            <Link
              href="/parties"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-flex items-center gap-1.5 group"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="group-hover:-translate-x-0.5 transition-transform">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              All Parties
            </Link>

            <div className="flex items-center gap-5 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg overflow-hidden"
                style={{ backgroundColor: party.color, boxShadow: `0 8px 24px -4px ${party.color}40` }}
              >
                {party.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={party.logo}
                    alt={party.shortName}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  party.shortName.slice(0, 3)
                )}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {party.name}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {party.nameNp} · {party.shortName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href={`/parties/${slug}?tab=won`}
                onClick={(e) => { e.preventDefault(); setTab("won"); }}
                className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-center hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <div className="text-3xl font-extrabold text-emerald-700 tabular-nums">{party.wins}</div>
                <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">Won</div>
              </Link>
              <Link
                href={`/parties/${slug}?tab=leading`}
                onClick={(e) => { e.preventDefault(); setTab("leading"); }}
                className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-center hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <div className="text-3xl font-extrabold text-amber-700 tabular-nums">{party.leads}</div>
                <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">Leading</div>
              </Link>
              <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-center">
                <div className="text-3xl font-extrabold text-gray-900 tabular-nums">{party.wins + party.leads}</div>
                <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">Total</div>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-center">
                <div className="text-3xl font-extrabold text-red-600 tabular-nums">{closeRaces.length}</div>
                <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">Close Races</div>
              </div>
            </div>

            {/* Seat bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>Seat share</span>
                <span className="font-bold text-gray-700 tabular-nums">
                  {((( party.wins + party.leads) / 165) * 100).toFixed(1)}% of 165
                </span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full flex rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${(party.wins / 165) * 100}%`, backgroundColor: party.color }}
                  />
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${(party.leads / 165) * 100}%`, backgroundColor: `${party.color}66` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Province breakdown + Seat map */}
          <div className="lg:col-span-1 space-y-6">
            {/* Province breakdown */}
            <div className="card p-5 lg:sticky lg:top-20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: party.color }} />
                <h2 className="text-sm font-bold text-gray-800">Province Breakdown</h2>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {provinceBreakdown.map((prov) => (
                    <Link
                      key={prov.id}
                      href={`/provinces/${prov.id}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">{prov.name}</span>
                          <span className="text-xs font-bold" style={{ color: party.color }}>
                            {prov.won + prov.leading}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-gray-400">
                          Won: {prov.won} · Leading: {prov.leading}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {provinceBreakdown.length === 0 && (
                    <p className="text-xs text-gray-400 py-4 text-center">No seats yet</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Tabs & Constituency cards */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all border whitespace-nowrap
                    ${tab === t.key
                      ? "text-white border-transparent shadow-md"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }
                  `}
                  style={tab === t.key ? { backgroundColor: party.color } : undefined}
                >
                  {t.label}
                  <span className={`ml-1.5 text-xs ${tab === t.key ? "text-white/80" : "text-gray-400"}`}>
                    ({t.count})
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card animate-pulse p-5">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-20 mb-4" />
                    <div className="space-y-2">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="h-8 bg-gray-100 rounded" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : displaySeats.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
                {displaySeats
                  .sort((a, b) => {
                    if (a.status === "won" && b.status !== "won") return -1;
                    if (b.status === "won" && a.status !== "won") return 1;
                    return b.leaderVotes - a.leaderVotes;
                  })
                  .map((seat) => {
                    const isWon = seat.status === "won";
                    const isClose = seat.status === "leading" && seat.margin < 2000;
                    return (
                      <Link
                        key={`${seat.districtId}-${seat.constNumber}`}
                        href={`/results?constituency=${seat.constituencySlug}`}
                        className={`card group hover:shadow-lg transition-all duration-200 ${isClose ? "ring-2 ring-red-200" : ""}`}
                      >
                        <div
                          className="h-1 rounded-t-2xl"
                          style={{ backgroundColor: party.color }}
                        />
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">{seat.constituency}</h3>
                              <p className="text-[10px] text-gray-400 mt-0.5">{seat.provinceName}</p>
                            </div>
                            {isWon ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Won
                              </span>
                            ) : isClose ? (
                              <span className="flex items-center gap-1 text-[10px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                🔥 Close
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Leading
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {seat.candidates.slice(0, 3).map((c, i) => (
                              <div key={c.id} className={`flex items-center gap-2 ${i > 0 ? "opacity-60" : ""}`}>
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: c.partyColor }}
                                />
                                <span className="text-xs text-gray-700 truncate flex-1">{c.name}</span>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${c.partyColor}15`, color: c.partyColor }}>
                                  {c.partyShortName}
                                </span>
                                <span className="text-xs font-bold text-gray-800 tabular-nums">
                                  {c.votes.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                          {seat.margin > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">
                                {seat.totalVotes.toLocaleString()} total votes
                              </span>
                              <span className={`text-[10px] font-bold ${isClose ? "text-red-600" : "text-emerald-600"}`}>
                                +{seat.margin.toLocaleString()} margin
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-gray-500">No seats in this category yet</p>
              </div>
            )}

            {/* Contesting seats (where this party is runner-up) */}
            {contestingSeats.length > 0 && tab === "all" && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-gray-300 rounded-full" />
                  <h2 className="text-sm font-bold text-gray-700">Also Contesting ({contestingSeats.length})</h2>
                  <span className="text-[10px] text-gray-400">Seats where {party.shortName} is trailing</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contestingSeats.slice(0, 6).map((seat) => {
                    const partyCandidate = seat.candidates.find(
                      (c) => c.partyShortName === party!.shortName
                    );
                    return (
                      <Link
                        key={`${seat.districtId}-${seat.constNumber}`}
                        href={`/results?constituency=${seat.constituencySlug}`}
                        className="card p-3 hover:shadow-md transition-all opacity-70 hover:opacity-100"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-gray-700">{seat.constituency}</span>
                            <span className="text-[10px] text-gray-400 ml-2">{seat.provinceName}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {partyCandidate?.votes.toLocaleString() ?? 0} votes
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
