"use client";

import React from "react";
import VoteBar from "../atoms/VoteBar";
import type { Party } from "@/data/parties";

interface PartyRowProps {
  party: Party;
  maxLeads: number;
}

export default function PartyRow({ party, maxLeads }: PartyRowProps) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const total = Math.max(party.totalSeats, party.wins + party.leads);
  const prSeats = Math.max(party.samanupatik, total - party.wins - party.leads, 0);
  const percentage = maxLeads > 0 ? (total / maxLeads) * 100 : 0;

  return (
    <div
      className={`mb-2.5 flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all ${
        total > 0
          ? "border-white/70 bg-white/65 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
          : "border-slate-100 bg-white/45 opacity-80"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: party.color }}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/75 bg-white shadow-sm">
        {!imageFailed && party.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={party.logo}
            alt={`${party.shortName} logo`}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-[10px] font-black text-slate-700">{party.shortName.slice(0, 3)}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-800">{party.name}</span>
            <span className="block truncate text-[11px] text-slate-500">{party.nameNp}</span>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {total} total
            </span>
            {prSeats > 0 && (
              <div className="mt-1 text-[10px] font-semibold text-slate-400">PR {prSeats}</div>
            )}
          </div>
        </div>
        <div className="mt-2">
          <VoteBar percentage={percentage} color={party.color} height={4} />
        </div>
      </div>

      <div className="flex shrink-0 gap-4 text-right">
        <div>
          <div className="text-sm font-black text-slate-900">{party.wins}</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Won</div>
        </div>
        <div>
          <div className={`text-sm font-black ${total > 0 ? "text-red-500" : "text-slate-800"}`}>{party.leads}</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Lead</div>
        </div>
      </div>
    </div>
  );
}
