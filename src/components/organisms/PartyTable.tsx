"use client";

import React from "react";
import PartyRow from "../molecules/PartyRow";
import type { Party } from "@/data/parties";
import Link from "next/link";
import { getPartyTotalSeats } from "@/lib/party-seats";

interface PartyTableProps {
  parties: Party[];
  compact?: boolean;
}

export default function PartyTable({ parties, compact = false }: PartyTableProps) {
  const maxLeads = Math.max(...parties.map((p) => getPartyTotalSeats(p)), 1);
  const displayed = compact ? parties.slice(0, 8) : parties;

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100/70 px-6 py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Live Board</p>
          <h2 className="mt-1 text-base font-black text-slate-900">Party Results</h2>
        </div>
        {compact && (
          <Link href="/parties" className="text-xs font-bold text-red-600 transition-colors hover:text-red-700">
            Full standings →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] border-b border-slate-100/70 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
        <span>Party</span>
        <div className="flex gap-5">
          <span className="w-10 text-right">Won</span>
          <span className="w-10 text-right">Lead</span>
        </div>
      </div>

      <div className="px-3 py-2">
        {displayed.map((party) => (
          <PartyRow key={party.id} party={party} maxLeads={maxLeads} />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100/70 px-6 py-4 text-xs font-semibold text-slate-500">
        <span>{parties.length} parties tracked</span>
        <span>165 direct seats</span>
      </div>
    </div>
  );
}
