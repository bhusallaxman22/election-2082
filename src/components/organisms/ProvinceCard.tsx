"use client";

import React from "react";
import type { ProvinceData } from "@/data/provinces";
import type { ProvincePartyLiveResult } from "@/context/ElectionDataContext";
import Link from "next/link";

interface ProvinceCardProps {
  province: ProvinceData;
  liveResults?: ProvincePartyLiveResult[];
}

export default function ProvinceCard({ province, liveResults }: ProvinceCardProps) {
  const results = liveResults ?? [];
  const totalLeads = results.reduce((s, r) => s + r.leads + r.wins, 0);
  const pct = province.totalSeats > 0 ? ((totalLeads / province.totalSeats) * 100).toFixed(0) : "0";

  return (
    <Link href={`/provinces/${province.id}`} className="block group">
      <div className="glass-card h-full transition-all duration-200 group-hover:border-slate-300/50">
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${province.color}88, ${province.color})` }} />

        <div className="flex items-center gap-4 p-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md"
            style={{ backgroundColor: province.color, boxShadow: `0 4px 12px -2px ${province.color}40` }}
          >
            {province.id}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900">{province.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {province.districts.length} districts · {province.totalSeats} seats
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-slate-900">{totalLeads}</div>
            <div className="text-[10px] font-semibold text-slate-500">{pct}%</div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
            {results
              .filter((r) => r.leads > 0 || r.wins > 0)
              .map((r, i) => (
                <div
                  key={i}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${((r.leads + r.wins) / province.totalSeats) * 100}%`,
                    backgroundColor: r.partyColor,
                  }}
                />
              ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {results
              .filter((r) => r.leads > 0 || r.wins > 0)
              .map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.partyColor }} />
                  <span className="text-xs font-semibold text-slate-600">{r.partyShortName}: {r.leads + r.wins}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="border-t border-slate-100/70 bg-slate-50/40 px-5 py-3.5">
          <span className="text-xs font-bold text-red-600 group-hover:underline">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}
