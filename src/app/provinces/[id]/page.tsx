"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import PageTemplate from "@/components/templates/PageTemplate";
import StatNumber from "@/components/atoms/StatNumber";
import Avatar from "@/components/atoms/Avatar";
import PartyBadge from "@/components/atoms/PartyBadge";
import VoteBar from "@/components/atoms/VoteBar";
import { provinces } from "@/data/provinces";
import type { DistrictData } from "@/data/provinces";
import Link from "next/link";

interface LiveCandidate {
  id: string;
  name: string;
  partyShortName: string;
  partyColor: string;
  votes: number;
  status: string;
  margin?: number;
  photo: string;
}

interface ConstituencyResult {
  constituency: string;
  candidates: LiveCandidate[];
  totalVotes: number;
  countingStatus: string;
}

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

export default function ProvinceDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const province = provinces.find((p) => p.id === id);

  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(null);
  const [activeConstituency, setActiveConstituency] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ConstituencyResult>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Auto-fetch data for top races
  const [provinceSeats, setProvinceSeats] = useState<SeatResult[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(true);

  useEffect(() => {
    if (!province) return;
    const fetchSeats = async () => {
      try {
        const res = await fetch("/api/all-results", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          const filtered = (json.data as SeatResult[]).filter(
            (s) => s.provinceId === province.id
          );
          setProvinceSeats(filtered);
        }
      } catch {
        // silent
      } finally {
        setSeatsLoading(false);
      }
    };
    fetchSeats();
    const interval = setInterval(fetchSeats, 60_000);
    return () => clearInterval(interval);
  }, [province]);

  // Derive top counting and neck-and-neck races
  const topCounting = useMemo(() => {
    return provinceSeats
      .filter((s) => s.status === "leading" && s.totalVotes > 0)
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, 6);
  }, [provinceSeats]);

  const neckAndNeck = useMemo(() => {
    return provinceSeats
      .filter((s) => s.status === "leading" && s.margin < 2000 && s.totalVotes > 0)
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 6);
  }, [provinceSeats]);

  // Compute live party results from seat data
  const livePartyResults = useMemo(() => {
    const map = new Map<string, { partyShortName: string; partyColor: string; wins: number; leads: number }>();
    for (const seat of provinceSeats) {
      if (!seat.partyShortName || seat.partyShortName === "—") continue;
      const existing = map.get(seat.partyShortName);
      if (existing) {
        if (seat.status === "won") existing.wins++;
        else if (seat.status === "leading") existing.leads++;
      } else {
        map.set(seat.partyShortName, {
          partyShortName: seat.partyShortName,
          partyColor: seat.partyColor,
          wins: seat.status === "won" ? 1 : 0,
          leads: seat.status === "leading" ? 1 : 0,
        });
      }
    }
    return Array.from(map.values())
      .filter((r) => r.wins > 0 || r.leads > 0)
      .sort((a, b) => (b.wins + b.leads) - (a.wins + a.leads));
  }, [provinceSeats]);

  const wonSeats = useMemo(() => {
    return provinceSeats.filter((s) => s.status === "won");
  }, [provinceSeats]);

  const fetchConstituency = useCallback(async (districtId: number, constNumber: number) => {
    const key = `${districtId}-${constNumber}`;
    if (results[key]) {
      setActiveConstituency(activeConstituency === key ? null : key);
      return;
    }
    setLoadingKey(key);
    setActiveConstituency(key);
    try {
      const res = await fetch(`/api/constituency?district=${districtId}&const=${constNumber}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      if (json.success) {
        setResults((prev) => ({ ...prev, [key]: json.data }));
      }
    } catch {
      // silently fail
    } finally {
      setLoadingKey(null);
    }
  }, [results, activeConstituency]);

  if (!province) {
    return (
      <PageTemplate>
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-lg">Province not found</p>
        </div>
      </PageTemplate>
    );
  }

  const toggleDistrict = (slug: string) => {
    setExpandedDistrict(expandedDistrict === slug ? null : slug);
    setActiveConstituency(null);
  };

  const renderConstituencyResult = (key: string) => {
    const result = results[key];
    if (!result) return null;
    const hasWinner = result.candidates.some((c) => c.status === "won");
    return (
      <div className="mt-3 rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm animate-fade-in">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-sm font-semibold text-gray-700">{result.constituency}</span>
          {hasWinner ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Declared
            </span>
          ) : result.totalVotes > 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Counting
            </span>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pending</span>
          )}
        </div>
        <div className="divide-y divide-gray-50">
          {result.candidates.map((c, i) => {
            const pct = result.totalVotes > 0 ? (c.votes / result.totalVotes) * 100 : 0;
            const isWinner = c.status === "won";
            return (
              <div key={c.id} className={`flex items-center gap-3 px-5 py-3 ${i > 0 && !isWinner ? "opacity-70" : ""}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isWinner ? "bg-emerald-100 text-emerald-700" :
                  i === 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"
                }`}>
                  {isWinner ? "✓" : i + 1}
                </span>
                <Avatar name={c.name} color={c.partyColor} size={32} src={c.photo || undefined} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                    <PartyBadge name={c.partyShortName} color={c.partyColor} />
                    {isWinner && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">WON</span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <VoteBar percentage={pct} color={c.partyColor} height={4} />
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className={`text-sm font-bold ${isWinner ? "text-emerald-700" : i === 0 ? "text-gray-900" : "text-gray-500"}`}>
                    {c.votes.toLocaleString()}
                  </span>
                  {i === 0 && c.margin && c.margin > 0 && (
                    <div className="text-[10px] text-emerald-600 font-medium">+{c.margin.toLocaleString()}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {result.totalVotes > 0 && (
          <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-400">{result.totalVotes.toLocaleString()} total votes</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageTemplate>
      {/* Province Header */}
      <div className="animate-fade-in">
        <div className="card relative overflow-hidden">
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${province.color}99, ${province.color})` }} />
          <div className="p-6 sm:p-8">
            <div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ backgroundColor: province.color }}
            />
            <div className="relative">
              <Link
                href="/provinces"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-flex items-center gap-1.5 group"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="group-hover:-translate-x-0.5 transition-transform"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
                All Provinces
              </Link>

              <div className="flex items-center gap-4 mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg"
                  style={{ backgroundColor: province.color, boxShadow: `0 8px 24px -4px ${province.color}40` }}
                >
                  {province.id}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    {province.name} Province
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {province.nameNp} · {province.districts.length} districts · {province.totalSeats} seats
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-center">
                  <StatNumber value={province.totalSeats} label="Total Seats" />
                </div>
                <Link href={`/results?status=won`} className="rounded-xl bg-emerald-50/80 border border-emerald-100 px-4 py-3 text-center hover:bg-emerald-50 transition-colors">
                  <StatNumber value={wonSeats.length} label="Declared" color="text-emerald-600" />
                </Link>
                <div className="rounded-xl bg-amber-50/80 border border-amber-100 px-4 py-3 text-center">
                  <StatNumber value={topCounting.length} label="Counting" color="text-amber-600" />
                </div>
                <div className="rounded-xl bg-blue-50/80 border border-blue-100 px-4 py-3 text-center">
                  <StatNumber value={province.districts.length} label="Districts" color="text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Counting & Neck and Neck - shown by default */}
      {!seatsLoading && (topCounting.length > 0 || neckAndNeck.length > 0) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Top Counting */}
          {topCounting.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h2 className="text-sm font-bold text-gray-800">Top Counting Races</h2>
                <span className="text-[10px] text-gray-400 ml-auto">{topCounting.length} active</span>
              </div>
              <div className="space-y-3">
                {topCounting.map((seat) => (
                  <Link
                    key={`${seat.districtId}-${seat.constNumber}`}
                    href={`/analytics?view=constituency&id=${seat.constituencySlug}`}
                    className="block p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-800">{seat.constituency}</span>
                      <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Live
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {seat.candidates.slice(0, 2).map((c, i) => (
                        <div key={c.id} className={`flex items-center gap-2 ${i > 0 ? "opacity-60" : ""}`}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.partyColor }} />
                          <span className="text-xs text-gray-700 truncate flex-1">{c.name}</span>
                          <Link
                            href={`/analytics?view=party&name=${encodeURIComponent(c.partyShortName)}`}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:opacity-80"
                            style={{ backgroundColor: `${c.partyColor}15`, color: c.partyColor }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.partyShortName}
                          </Link>
                          <span className="text-xs font-bold text-gray-800 tabular-nums">{c.votes.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    {seat.margin > 0 && (
                      <div className="mt-1.5 text-[10px] text-emerald-600 font-bold text-right">
                        +{seat.margin.toLocaleString()} margin
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Neck and Neck */}
          {neckAndNeck.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-red-500 rounded-full" />
                <h2 className="text-sm font-bold text-gray-800">🔥 Neck & Neck</h2>
                <span className="text-[10px] text-gray-400 ml-auto">Margin &lt; 2,000</span>
              </div>
              <div className="space-y-3">
                {neckAndNeck.map((seat) => (
                  <Link
                    key={`${seat.districtId}-${seat.constNumber}`}
                    href={`/analytics?view=constituency&id=${seat.constituencySlug}`}
                    className="block p-3 rounded-xl border border-red-100 hover:border-red-200 hover:shadow-sm transition-all bg-red-50/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-800">{seat.constituency}</span>
                      <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        Gap: {seat.margin.toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {seat.candidates.slice(0, 2).map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.partyColor }} />
                          <span className="text-xs text-gray-700 truncate flex-1">{c.name}</span>
                          <Link
                            href={`/analytics?view=party&name=${encodeURIComponent(c.partyShortName)}`}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:opacity-80"
                            style={{ backgroundColor: `${c.partyColor}15`, color: c.partyColor }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.partyShortName}
                          </Link>
                          <span className={`text-xs font-bold tabular-nums ${i === 0 ? "text-gray-900" : "text-gray-500"}`}>
                            {c.votes.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading skeleton for top races */}
      {seatsLoading && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="card p-5">
              <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="p-3 rounded-xl border border-gray-100 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-28 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Declared Results */}
      {wonSeats.length > 0 && (
        <div className="mt-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
            <h2 className="text-sm font-bold text-gray-800">Declared Results ({wonSeats.length})</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wonSeats.map((seat) => (
              <Link
                key={`${seat.districtId}-${seat.constNumber}`}
                href={`/analytics?view=constituency&id=${seat.constituencySlug}`}
                className="card p-3 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-800">{seat.constituency}</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Won
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seat.partyColor }} />
                  <span className="text-xs text-gray-700 truncate flex-1">{seat.leaderName}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${seat.partyColor}15`, color: seat.partyColor }}>
                    {seat.partyShortName}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">{seat.leaderVotes.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Party Results — Left column */}
        <div className="lg:col-span-1">
          <div className="card p-5 lg:sticky lg:top-20">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ backgroundColor: province.color }} />
              <h2 className="text-sm font-bold text-gray-800">Party Results</h2>
            </div>
            <div className="space-y-2.5">
              {livePartyResults
                .map((r, i) => {
                  const total = r.leads + r.wins;
                  const pct = province.totalSeats > 0 ? (total / province.totalSeats) * 100 : 0;
                  const partySlug = r.partyShortName.toLowerCase().replace(/[\s()]/g, "-");
                  return (
                    <Link
                      key={i}
                      href={`/analytics?view=party&name=${encodeURIComponent(r.partyShortName)}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: r.partyColor }}
                      >
                        {r.partyShortName.slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">{r.partyShortName}</span>
                          <span className="text-xs font-bold" style={{ color: total > 0 ? r.partyColor : "#94a3b8" }}>
                            {total}
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-gray-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${r.partyColor}cc, ${r.partyColor})`,
                            }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Districts with clickable seats — Right column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h2 className="text-sm font-bold text-gray-800">Districts & Constituencies</h2>
            <span className="ml-auto text-xs text-gray-400">Click a seat to view live results</span>
          </div>

          {province.districts.map((d: DistrictData) => {
            const isOpen = expandedDistrict === d.slug;
            const seats = Array.from({ length: d.constituencies }, (_, i) => i + 1);

            return (
              <div key={d.slug} className="card overflow-hidden">
                <button
                  onClick={() => toggleDistrict(d.slug)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-gray-500">{d.districtId}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800">{d.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {d.constituencies} {d.constituencies === 1 ? "constituency" : "constituencies"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {seats.map((n) => {
                      const key = `${d.districtId}-${n}`;
                      const hasResult = results[key];
                      const hasWinner = hasResult?.candidates.some((c) => c.status === "won");
                      return (
                        <span
                          key={n}
                          className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                            hasWinner ? "bg-emerald-100 text-emerald-700" :
                            hasResult ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {n}
                        </span>
                      );
                    })}
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 animate-fade-in">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {seats.map((n) => {
                        const key = `${d.districtId}-${n}`;
                        const isActive = activeConstituency === key;
                        const isLoading = loadingKey === key;
                        const hasResult = results[key];
                        const hasWinner = hasResult?.candidates.some((c) => c.status === "won");
                        return (
                          <button
                            key={n}
                            onClick={() => fetchConstituency(d.districtId, n)}
                            disabled={isLoading}
                            className={`
                              relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border
                              ${isActive
                                ? hasWinner
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200"
                                  : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                                : hasWinner
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : hasResult
                                    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                              }
                              ${isLoading ? "animate-pulse" : ""}
                            `}
                          >
                            {d.name} - {n}
                          </button>
                        );
                      })}
                    </div>

                    {activeConstituency && activeConstituency.startsWith(`${d.districtId}-`) && (
                      loadingKey === activeConstituency ? (
                        <div className="mt-3 rounded-2xl bg-white border border-gray-100 p-6">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                            <span className="text-sm text-gray-400">Loading results...</span>
                          </div>
                        </div>
                      ) : (
                        renderConstituencyResult(activeConstituency)
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageTemplate>
  );
}
