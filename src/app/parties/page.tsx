"use client";

import React from "react";
import PageTemplate from "@/components/templates/PageTemplate";
import PartyRow from "@/components/molecules/PartyRow";
import { useElectionData } from "@/context/ElectionDataContext";
import Link from "next/link";

export default function PartiesPage() {
  const { parties } = useElectionData();
  const maxLeads = Math.max(...parties.map((p) => p.wins + p.leads), 1);
  const totalWins = parties.reduce((s, p) => s + p.wins, 0);
  const totalLeads = parties.reduce((s, p) => s + p.leads, 0);

  return (
    <PageTemplate>
      <div className="animate-fade-in space-y-6">
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

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-black text-slate-900">Seat Distribution</h2>
            <span className="text-xs font-semibold text-slate-500">165 direct seats</span>
          </div>
          <div className="flex h-12 overflow-hidden rounded-2xl bg-slate-100">
            {parties
              .filter((p) => p.wins + p.leads > 0)
              .sort((a, b) => (b.wins + b.leads) - (a.wins + a.leads))
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/parties/${p.shortName.toLowerCase().replace(/[\s()]/g, "-")}`}
                  className="flex h-full items-center justify-center text-xs font-bold text-white transition-opacity hover:opacity-85"
                  style={{
                    width: `${((p.wins + p.leads) / 165) * 100}%`,
                    backgroundColor: p.color,
                    minWidth: (p.wins + p.leads) > 0 ? "20px" : "0",
                  }}
                  title={`${p.name} (${p.shortName}): ${p.wins + p.leads}`}
                >
                  {p.wins + p.leads > 3 ? p.shortName : ""}
                </Link>
              ))}
            <div
              className="flex h-full items-center justify-center bg-slate-200 text-xs text-slate-500"
              style={{ width: `${((165 - totalWins - totalLeads) / 165) * 100}%` }}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5">
            {parties
              .filter((p) => p.wins + p.leads > 0)
              .sort((a, b) => (b.wins + b.leads) - (a.wins + a.leads))
              .map((p) => (
                <Link key={p.id} href={`/parties/${p.shortName.toLowerCase().replace(/[\s()]/g, "-")}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: p.color }} />
                  <span className="text-sm text-gray-600">{p.name} ({p.shortName}): {p.wins + p.leads}</span>
                </Link>
              ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-100/70 px-6 py-5">
            <h2 className="text-base font-black text-slate-900">All Parties</h2>
            <p className="mt-0.5 text-xs text-slate-500">Sorted by won + leading seats.</p>
          </div>
          <div className="grid grid-cols-[1fr_auto] border-b border-slate-100/70 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            <span>Party</span>
            <div className="flex gap-5">
              <span className="w-10 text-right">Won</span>
              <span className="w-10 text-right">Lead</span>
            </div>
          </div>
          <div className="px-3 py-2">
            {parties
              .sort((a, b) => (b.wins + b.leads) - (a.wins + a.leads))
              .map((party) => (
                <PartyRow key={party.id} party={party} maxLeads={maxLeads} />
              ))}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
