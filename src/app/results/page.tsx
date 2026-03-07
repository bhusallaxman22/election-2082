"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PageTemplate from "@/components/templates/PageTemplate";
import CandidateCard from "@/components/organisms/CandidateCard";
import ProportionalResults from "@/components/organisms/ProportionalResults";
import { useElectionData } from "@/context/ElectionDataContext";
import { provinces } from "@/data/provinces";
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

function ResultsContent() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const partyFilter = searchParams.get("party");
  const constituencyFilter = searchParams.get("constituency");
  const searchFilter = searchParams.get("search");

  const { parties, popularCandidates, provinceResults } = useElectionData();
  const [allSeats, setAllSeats] = useState<SeatResult[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);

  const totalSeats = 165;
  const totalWins = parties.reduce((s, p) => s + p.wins, 0);
  const totalLeads = parties.reduce((s, p) => s + p.leads, 0);
  const progress = ((totalWins + totalLeads) / totalSeats) * 100;

  const hasFilter = statusFilter || partyFilter || constituencyFilter || searchFilter;

  // Fetch all seat data when filters are applied
  useEffect(() => {
    if (!hasFilter) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeatsLoading(true);
    fetch("/api/all-results", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAllSeats(json.data);
      })
      .catch(() => {})
      .finally(() => setSeatsLoading(false));
  }, [hasFilter]);

  // Filter seats based on query params
  const filteredSeats = useMemo(() => {
    let data = allSeats;
    if (statusFilter) {
      if (statusFilter === "won") data = data.filter((s) => s.status === "won");
      else if (statusFilter === "leading") data = data.filter((s) => s.status === "leading");
      else if (statusFilter === "pending") data = data.filter((s) => s.status === "pending");
    }
    if (partyFilter) {
      data = data.filter((s) => s.partyShortName.toLowerCase() === partyFilter.toLowerCase());
    }
    if (constituencyFilter) {
      data = data.filter((s) => s.constituencySlug === constituencyFilter);
    }
    if (searchFilter) {
      const normalized = searchFilter.toLowerCase().trim();
      data = data.filter((s) => {
        const seatMatch =
          s.constituency.toLowerCase().includes(normalized) ||
          s.constituencySlug.toLowerCase().includes(normalized) ||
          s.districtName.toLowerCase().includes(normalized) ||
          s.provinceName.toLowerCase().includes(normalized) ||
          s.leaderName.toLowerCase().includes(normalized) ||
          s.runnerUpName.toLowerCase().includes(normalized) ||
          s.partyShortName.toLowerCase().includes(normalized);

        if (seatMatch) return true;
        return s.candidates.some(
          (candidate) =>
            candidate.name.toLowerCase().includes(normalized) ||
            candidate.partyShortName.toLowerCase().includes(normalized)
        );
      });
    }
    return data;
  }, [allSeats, statusFilter, partyFilter, constituencyFilter, searchFilter]);

  const filterTitle = statusFilter
    ? statusFilter === "won"
      ? "Declared Results"
      : statusFilter === "leading"
        ? "Leading Races"
        : "Pending Constituencies"
    : partyFilter
      ? `${partyFilter.toUpperCase()} Results`
      : constituencyFilter
        ? `Constituency Result`
        : searchFilter
          ? `Search: ${searchFilter}`
          : null;

  const activeConstituencies = popularCandidates.filter(
    (c) => c.totalVotes > 0
  );

  return (
    <PageTemplate>
      <div className="animate-fade-in">
        {/* Hero stats */}
        <div className="card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
          <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  {filterTitle || "Live Results"}
                </h1>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {hasFilter ? (
                  <Link href="/results" className="text-red-600 hover:text-red-700 font-medium">
                    ← Clear filters · Show all results
                  </Link>
                ) : (
                  "Nationwide counting status and leading parties"
                )}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/results"
                className={`rounded-2xl border px-5 py-3 text-center min-w-[75px] transition-colors ${
                  !hasFilter ? "border-gray-300 bg-gray-100" : "border-gray-100 bg-gray-50/80 hover:bg-gray-100"
                }`}
              >
                <div className="text-xl font-extrabold text-gray-900 tabular-nums">{totalSeats}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Total</div>
              </Link>
              <Link
                href="/results?status=won"
                className={`rounded-2xl border px-5 py-3 text-center min-w-[75px] transition-colors ${
                  statusFilter === "won" ? "border-emerald-300 bg-emerald-100 ring-2 ring-emerald-200" : "border-emerald-100 bg-emerald-50/80 hover:bg-emerald-100"
                }`}
              >
                <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{totalWins}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Won</div>
              </Link>
              <Link
                href="/results?status=leading"
                className={`rounded-2xl border px-5 py-3 text-center min-w-[75px] transition-colors ${
                  statusFilter === "leading" ? "border-amber-300 bg-amber-100 ring-2 ring-amber-200" : "border-amber-100 bg-amber-50/80 hover:bg-amber-100"
                }`}
              >
                <div className="text-xl font-extrabold text-amber-700 tabular-nums">{totalLeads}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Leading</div>
              </Link>
              <Link
                href="/results?status=pending"
                className={`rounded-2xl border px-5 py-3 text-center min-w-[75px] transition-colors ${
                  statusFilter === "pending" ? "border-gray-300 bg-gray-100 ring-2 ring-gray-300" : "border-gray-100 bg-gray-50/80 hover:bg-gray-100"
                }`}
              >
                <div className="text-xl font-extrabold text-gray-300 tabular-nums">{totalSeats - totalWins - totalLeads}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Left</div>
              </Link>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-5 py-3 text-center min-w-[75px]">
                <div className="text-xl font-extrabold text-blue-600 tabular-nums">{progress.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Done</div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Filtered results view */}
        {hasFilter && (
          <div className="mt-6">
            {seatsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
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
            ) : filteredSeats.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">
                    {filterTitle} ({filteredSeats.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
                  {filteredSeats
                    .sort((a, b) => b.leaderVotes - a.leaderVotes)
                    .map((seat) => {
                      const isWon = seat.status === "won";
                      return (
                        <div key={`${seat.districtId}-${seat.constNumber}`} className="card group hover:shadow-lg transition-all">
                          <div className="h-1 rounded-t-2xl" style={{ backgroundColor: seat.partyColor }} />
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">{seat.constituency}</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  <Link href={`/provinces/${seat.provinceId}`} className="hover:text-gray-600">
                                    {seat.provinceName}
                                  </Link>
                                </p>
                              </div>
                              {isWon ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Declared
                                </span>
                              ) : seat.totalVotes > 0 ? (
                                <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Live
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">Pending</span>
                              )}
                            </div>
                            <div className="space-y-2">
                              {seat.candidates.slice(0, 4).map((c, i) => (
                                <div key={c.id} className={`flex items-center gap-2 ${i > 0 ? "opacity-60" : ""}`}>
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.partyColor }} />
                                  <span className="text-xs text-gray-700 truncate flex-1">{c.name}</span>
                                  <Link
                                    href={`/parties/${c.partyShortName.toLowerCase()}`}
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: `${c.partyColor}15`, color: c.partyColor }}
                                  >
                                    {c.partyShortName}
                                  </Link>
                                  <span className="text-xs font-bold text-gray-800 tabular-nums">
                                    {c.votes.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {seat.totalVotes > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                                <span>{seat.totalVotes.toLocaleString()} votes</span>
                                {seat.margin > 0 && (
                                  <span className="font-bold text-emerald-600">+{seat.margin.toLocaleString()}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-gray-500">No results match this filter</p>
                <Link href="/results" className="text-red-600 hover:text-red-700 text-sm font-semibold mt-4 inline-block">
                  ← View all results
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Default view (no filters) */}
        {!hasFilter && (
          <>
            {/* Leading parties */}
            <div className="card p-6 mt-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-red-500 rounded-full" />
                <h2 className="text-sm font-bold text-gray-900">Leading Parties</h2>
              </div>
              <div className="space-y-4">
                {parties
                  .filter((p) => p.wins + p.leads > 0)
                  .sort((a, b) => (b.wins + b.leads) - (a.wins + a.leads))
                  .map((party) => {
                    const total = party.wins + party.leads;
                    const pct = (total / totalSeats) * 100;
                    const partySlug = party.shortName.toLowerCase().replace(/[\s()]/g, "-");
                    return (
                      <Link
                        key={party.id}
                        href={`/parties/${partySlug}`}
                        className="flex items-center gap-4 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <img
                          src={party.logo}
                          alt={party.shortName}
                          className="w-9 h-9 rounded-xl object-contain bg-gray-50 border border-gray-100 shrink-0"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            el.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <span
                          className="hidden w-9 h-9 rounded-xl items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: party.color }}
                        >
                          {party.shortName.slice(0, 3)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-gray-800">{party.name}</span>
                            <span className="text-sm font-extrabold text-gray-900 tabular-nums">{total}</span>
                          </div>
                          <div className="h-2.5 rounded-full overflow-hidden bg-gray-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: party.color }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                            <span>Won: {party.wins} · Leading: {party.leads}</span>
                            <span className="tabular-nums">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>

            {/* Province table */}
            <div className="card mt-6 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-500 rounded-full" />
                  <h2 className="text-sm font-bold text-gray-900">Province Summary</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3.5 px-5 text-sm text-gray-500 font-medium">Province</th>
                      <th className="text-center py-3.5 px-5 text-sm text-gray-500 font-medium">Seats</th>
                      {["RSP", "CPN-UML", "NC", "NCP", "Others"].map((p) => (
                        <th key={p} className="text-center py-3.5 px-5 text-sm text-gray-500 font-medium">
                          <Link href={`/parties/${p.toLowerCase().replace(/[\s()]/g, "-")}`} className="hover:text-gray-900 transition-colors">
                            {p}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {provinces.map((prov) => (
                      <tr key={prov.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-5">
                          <Link href={`/provinces/${prov.id}`} className="flex items-center gap-3 hover:opacity-80">
                            <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: prov.color }} />
                            <span className="text-sm text-gray-700 font-medium">{prov.name}</span>
                          </Link>
                        </td>
                        <td className="text-center py-3.5 px-5 text-sm font-medium text-gray-800">{prov.totalSeats}</td>
                        {["RSP", "CPN-UML", "NC", "NCP", "Others"].map((partyName) => {
                          const liveResults = provinceResults[prov.id] ?? [];
                          const result = liveResults.find((r) => r.partyShortName === partyName);
                          const val = result ? result.leads + result.wins : 0;
                          return (
                            <td key={partyName} className="text-center py-3.5 px-5 text-sm">
                              {val > 0 ? (
                                <Link
                                  href={`/parties/${partyName.toLowerCase().replace(/[\s()]/g, "-")}`}
                                  className="font-medium text-gray-800 hover:text-red-600 transition-colors"
                                >
                                  {val}
                                </Link>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active counting */}
            {activeConstituencies.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Active Counting</h2>
                  <span className="text-sm text-gray-400">{activeConstituencies.length} active</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger-children">
                  {activeConstituencies.map((result) => (
                    <CandidateCard key={result.constituencySlug} result={result} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              <ProportionalResults />
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <PageTemplate>
        <div className="card p-12 text-center animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mx-auto mb-4" />
          <div className="h-4 bg-gray-100 rounded w-60 mx-auto" />
        </div>
      </PageTemplate>
    }>
      <ResultsContent />
    </Suspense>
  );
}
