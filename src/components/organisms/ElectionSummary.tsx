"use client";

import React from "react";
import Link from "next/link";
import { useElectionData } from "@/context/ElectionDataContext";
import { provinces } from "@/data/provinces";
import { getPartyPRSeats, getPartyTotalSeats } from "@/lib/party-seats";

const DIRECT_SEATS = 165;
const PR_SEATS = 110;
const TOTAL_PARLIAMENT_SEATS = DIRECT_SEATS + PR_SEATS;

export default function ElectionSummary() {
  const { parties, loading, lastUpdated, provinceResults } = useElectionData();
  const totalSeats = DIRECT_SEATS;
  const totalWins = parties.reduce((sum, party) => sum + party.wins, 0);
  const declared = totalWins;
  const progress = (declared / totalSeats) * 100;
  const topParties = [...parties]
    .filter((party) => getPartyTotalSeats(party) > 0)
    .sort((a, b) => getPartyTotalSeats(b) - getPartyTotalSeats(a))
    .slice(0, 5);

  return (
    <div className="glass-card overflow-hidden p-0">
      <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-sky-500" />
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Election Snapshot</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Federal Election 2082</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Final federal parliament results with party distribution, province breakdowns, and constituency summaries.
            </p>
            {lastUpdated && (
              <p className="mt-3 text-xs font-medium text-slate-500">
                {loading ? "Refreshing snapshot…" : "Snapshot updated"} at {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/results" className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3 text-center transition-colors hover:bg-white">
              <div className="text-3xl font-black text-slate-900 tabular-nums">{totalSeats}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Direct Seats</div>
            </Link>
            <Link href="/results?status=won" className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-center transition-colors hover:bg-emerald-50">
              <div className="text-3xl font-black text-emerald-700 tabular-nums">{declared}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Declared</div>
            </Link>
            <Link href="/parties" className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-center transition-colors hover:bg-amber-50">
              <div className="text-3xl font-black text-amber-700 tabular-nums">{PR_SEATS}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">PR Seats</div>
            </Link>
            <Link href="/analytics" className="rounded-2xl border border-slate-200/70 bg-slate-50/75 px-4 py-3 text-center transition-colors hover:bg-slate-100/70">
              <div className="text-3xl font-black text-slate-600 tabular-nums">{TOTAL_PARLIAMENT_SEATS}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Parliament</div>
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-white/70 bg-white/72 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Direct seats declared</span>
              <span className="text-sm font-black text-slate-800">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-sky-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              {provinces.map((province) => {
                const liveResults = provinceResults[province.id] ?? [];
                const filled = liveResults.reduce((sum, result) => sum + result.leads + result.wins, 0);
                const percentage = province.totalSeats > 0 ? (filled / province.totalSeats) * 100 : 0;

                return (
                  <Link key={province.id} href={`/analytics?view=province&id=${province.id}`} className="rounded-2xl border border-slate-100/80 bg-white/90 p-3 text-center transition-colors hover:bg-white">
                    <div className="text-[11px] font-bold text-slate-700">{province.name}</div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: province.color }} />
                    </div>
                    <div className="mt-2 text-[10px] font-semibold text-slate-500">
                      {filled}/{province.totalSeats}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-950 p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Top Parties</p>
            <div className="mt-4 space-y-3">
              {topParties.map((party) => {
                const partyTotal = getPartyTotalSeats(party);
                const prSeats = getPartyPRSeats(party);
                return (
                <Link
                  key={party.id}
                  href={`/analytics?view=party&name=${encodeURIComponent(party.shortName)}`}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-8 w-8 overflow-hidden rounded-full border border-white/20 bg-white/15">
                      {party.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={party.logo} alt={party.shortName} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{party.shortName}</div>
                      <div className="truncate text-[11px] text-slate-400">
                        {party.nameNp}
                        {prSeats > 0 && ` · PR ${prSeats}`}
                      </div>
                    </div>
                  </div>
                  <span className="text-xl font-black">{partyTotal}</span>
                </Link>
                );
              })}
            </div>
            <div className="mt-4 text-[11px] font-medium text-slate-400">
              Total parliamentary seats: {TOTAL_PARLIAMENT_SEATS} ({DIRECT_SEATS} direct + {PR_SEATS} PR)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
