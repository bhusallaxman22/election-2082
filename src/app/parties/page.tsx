"use client";

import React from "react";
import PageTemplate from "@/components/templates/PageTemplate";
import { useElectionData } from "@/context/ElectionDataContext";
import Link from "next/link";
import { getPartyPRSeats, getPartyTotalSeats } from "@/lib/party-seats";

const DIRECT_SEATS = 165;
const PR_SEATS = 110;
const TOTAL_PARLIAMENT_SEATS = DIRECT_SEATS + PR_SEATS;

export default function PartiesPage() {
  const { parties } = useElectionData();
  const totalWins = parties.reduce((s, p) => s + p.wins, 0);
  const totalLeads = parties.reduce((s, p) => s + p.leads, 0);
  const sorted = [...parties].sort(
    (a, b) => getPartyTotalSeats(b) - getPartyTotalSeats(a)
  );
  const topParties = sorted.filter((p) => getPartyTotalSeats(p) > 0);
  const otherParties = sorted.filter((p) => getPartyTotalSeats(p) === 0);
  const filledSeats = topParties.reduce((sum, party) => sum + getPartyTotalSeats(party), 0);

  return (
    <PageTemplate>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="glass-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Party Monitor</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900">Political Parties</h1>
              <p className="mt-2 text-sm text-slate-600">Live standings for the federal parliament race.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3 text-center">
                <div className="text-2xl font-black text-slate-900">{parties.length}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Parties</div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/85 px-4 py-3 text-center">
                <div className="text-2xl font-black text-emerald-700">{totalWins}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Won</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/85 px-4 py-3 text-center">
                <div className="text-2xl font-black text-amber-700">{totalLeads}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Leading</div>
              </div>
            </div>
          </div>
        </div>

        {/* Seat Distribution Bar */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-black text-slate-900">Seat Distribution</h2>
            <span className="text-xs font-semibold text-slate-500">
              {TOTAL_PARLIAMENT_SEATS} total seats · {DIRECT_SEATS} direct + {PR_SEATS} PR
            </span>
          </div>
          <div className="flex h-12 overflow-hidden rounded-2xl bg-slate-100">
            {topParties.map((p) => {
              const partyTotal = getPartyTotalSeats(p);
              return (
              <Link
                key={p.id}
                href={`/analytics?view=party&name=${encodeURIComponent(p.shortName)}`}
                className="flex h-full items-center justify-center text-xs font-bold text-white transition-opacity hover:opacity-85"
                style={{
                  width: `${(partyTotal / TOTAL_PARLIAMENT_SEATS) * 100}%`,
                  backgroundColor: p.color,
                  minWidth: partyTotal > 0 ? "20px" : "0",
                }}
                title={`${p.name} (${p.shortName}): ${partyTotal} seats`}
              >
                {partyTotal > 3 ? p.shortName : ""}
              </Link>
              );
            })}
            <div
              className="flex h-full items-center justify-center bg-slate-200 text-xs text-slate-500"
              style={{ width: `${((TOTAL_PARLIAMENT_SEATS - filledSeats) / TOTAL_PARLIAMENT_SEATS) * 100}%` }}
            />
          </div>
        </div>

        {/* Top Party Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topParties.map((party) => {
            const total = getPartyTotalSeats(party);
            const prSeats = getPartyPRSeats(party);
            const pct = ((total / TOTAL_PARLIAMENT_SEATS) * 100).toFixed(1);
            return (
              <Link
                key={party.id}
                href={`/analytics?view=party&name=${encodeURIComponent(party.shortName)}`}
                className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Colored top accent */}
                <div className="h-1.5" style={{ backgroundColor: party.color }} />

                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Party Logo */}
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-md"
                      style={{ backgroundColor: party.color, boxShadow: `0 6px 20px -4px ${party.color}50` }}
                    >
                      {party.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={party.logo}
                          alt={party.shortName}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        <span className="text-sm font-black text-white">{party.shortName.slice(0, 3)}</span>
                      )}
                    </div>

                    {/* Party Name */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-extrabold text-slate-900">{party.shortName}</h3>
                      <p className="truncate text-xs text-slate-500">{party.name}</p>
                      <p className="truncate text-[11px] text-slate-400">{party.nameNp}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-emerald-50/80 px-3 py-2 text-center">
                      <div className="text-lg font-black text-emerald-700">{party.wins}</div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Won</div>
                    </div>
                    <div className="rounded-xl bg-amber-50/80 px-3 py-2 text-center">
                      <div className="text-lg font-black text-amber-700">{party.leads}</div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Leading</div>
                    </div>
                    <div className="rounded-xl px-3 py-2 text-center" style={{ backgroundColor: party.color + "12" }}>
                      <div className="text-lg font-black" style={{ color: party.color }}>{total}</div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Total</div>
                    </div>
                  </div>
                  {prSeats > 0 && (
                    <p className="mt-3 text-[11px] font-semibold text-slate-500">PR seats: {prSeats}</p>
                  )}

                  {/* Seat share bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Seat share</span>
                      <span className="font-bold" style={{ color: party.color }}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full flex rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{ width: `${(party.wins / TOTAL_PARLIAMENT_SEATS) * 100}%`, backgroundColor: party.color }} />
                        <div className="h-full transition-all duration-500" style={{ width: `${(party.leads / TOTAL_PARLIAMENT_SEATS) * 100}%`, backgroundColor: party.color, opacity: 0.4 }} />
                        {prSeats > 0 && <div className="h-full transition-all duration-500" style={{ width: `${(prSeats / TOTAL_PARLIAMENT_SEATS) * 100}%`, backgroundColor: party.color, opacity: 0.3 }} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover arrow */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Other Parties (0 seats) */}
        {otherParties.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100/70 px-6 py-4">
              <h2 className="text-sm font-bold text-slate-700">Other Parties</h2>
              <p className="mt-0.5 text-xs text-slate-400">{otherParties.length} parties with no seats yet</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-100/50">
              {otherParties.map((party) => (
                <div key={party.id} className="flex items-center gap-3 bg-white/70 px-5 py-3.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                    style={{ backgroundColor: party.color + "18" }}
                  >
                    {party.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={party.logo} alt={party.shortName} className="h-6 w-6 object-contain" />
                    ) : (
                      <span className="text-[10px] font-bold" style={{ color: party.color }}>{party.shortName.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-700">{party.shortName}</span>
                    <span className="block truncate text-[11px] text-slate-400">{party.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
