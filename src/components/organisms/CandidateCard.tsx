"use client";

import React from "react";
import CandidateRow from "../molecules/CandidateRow";
import type { LiveConstituencyResult } from "@/context/ElectionDataContext";
import Link from "next/link";

interface CandidateCardProps {
  result: LiveConstituencyResult;
}

export default function CandidateCard({ result }: CandidateCardProps) {
  const leader = result.candidates[0];
  const isActive = result.totalVotes > 0;
  const hasWinner = result.candidates.some((c) => c.status === "won");

  return (
    <div className="glass-card group overflow-hidden">
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${leader?.partyColor || "#e5e7eb"}88, ${leader?.partyColor || "#e5e7eb"})` }} />

      <div className="flex items-center justify-between border-b border-slate-100/70 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{result.constituency}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{result.province}</p>
        </div>
        {hasWinner ? (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Declared
          </span>
        ) : isActive ? (
          <span className="flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-600">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Recorded
          </span>
        ) : (
          <span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">Pending</span>
        )}
      </div>

      <div className="divide-y divide-slate-100/70">
        {result.candidates.map((candidate, index) => (
          <CandidateRow
            key={candidate.id}
            candidate={candidate}
            totalVotes={result.totalVotes}
            rank={index}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100/70 bg-slate-50/40 px-5 py-3.5">
        <span className="text-xs font-medium text-slate-500">
          {result.totalVotes.toLocaleString()} votes
        </span>
        <Link
          href={`/analytics?view=constituency&id=${result.constituencySlug}`}
          className="text-xs font-bold text-red-600 transition-colors group-hover:underline hover:text-red-700"
        >
          Details →
        </Link>
      </div>
    </div>
  );
}
