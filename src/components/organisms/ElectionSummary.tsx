"use client";

import React from "react";
import Link from "next/link";
import { useElectionData } from "@/context/ElectionDataContext";
import { provinces } from "@/data/provinces";

export default function ElectionSummary() {
  const { parties, loading, lastUpdated, provinceResults } = useElectionData();
  const totalSeats = 165;
  const totalWins = parties.reduce((sum, party) => sum + party.wins, 0);
  const totalLeads = parties.reduce((sum, party) => sum + party.leads, 0);
  const remaining = Math.max(totalSeats - totalWins - totalLeads, 0);
  const progress = ((totalWins + totalLeads) / totalSeats) * 100;
  const topParties = parties.filter((party) => party.wins + party.leads > 0).slice(0, 5);

  return (
    <div className="glass-card overflow-hidden p-0">
      <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-sky-500" />
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">National Feed</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Federal Election 2082</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Real-time parliamentary race updates with province coverage and constituency momentum.
            </p>
            {lastUpdated && (
              <p className="mt-3 text-xs font-medium text-slate-500">
                {loading ? "Refreshing…" : "Last synced"} at {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/results" className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3 text-center transition-colors hover:bg-white">
              <div className="text-3xl font-black text-slate-900 tabular-nums">{totalSeats}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total</div>
            </Link>
            <Link href="/results?status=won" className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-center transition-colors hover:bg-emerald-50">
              <div className="text-3xl font-black text-emerald-700 tabular-nums">{totalWins}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Won</div>
            </Link>
            <Link href="/results?status=leading" className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-center transition-colors hover:bg-amber-50">
              <div className="text-3xl font-black text-amber-700 tabular-nums">{totalLeads}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Leading</div>
            </Link>
            <Link href="/results?status=pending" className="rounded-2xl border border-slate-200/70 bg-slate-50/75 px-4 py-3 text-center transition-colors hover:bg-slate-100/70">
              <div className="text-3xl font-black text-slate-600 tabular-nums">{remaining}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Pending</div>
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-white/70 bg-white/72 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Counting progress</span>
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
                  <Link key={province.id} href={`/provinces/${province.id}`} className="rounded-2xl border border-slate-100/80 bg-white/90 p-3 text-center transition-colors hover:bg-white">
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
              {topParties.map((party) => (
                <Link
                  key={party.id}
                  href={`/results?party=${party.shortName.toLowerCase()}`}
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
                      <div className="truncate text-[11px] text-slate-400">{party.nameNp}</div>
                    </div>
                  </div>
                  <span className="text-xl font-black">{party.wins + party.leads}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
