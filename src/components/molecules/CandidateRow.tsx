"use client";

import React from "react";
import Avatar from "../atoms/Avatar";
import PartyBadge from "../atoms/PartyBadge";
import VoteBar from "../atoms/VoteBar";
import type { LiveCandidate } from "@/context/ElectionDataContext";

interface CandidateRowProps {
  candidate: LiveCandidate;
  totalVotes: number;
  rank: number;
}

export default function CandidateRow({
  candidate,
  totalVotes,
  rank,
}: CandidateRowProps) {
  const percentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
  const photoSrc = candidate.photo || undefined;
  const isWinner = candidate.status === "won";

  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/70 ${rank > 0 && !isWinner ? "opacity-75" : ""}`}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        isWinner
          ? "bg-emerald-100 text-emerald-700"
          : rank === 0
            ? "bg-amber-50 text-amber-600"
            : "bg-slate-100 text-slate-400"
      }`}>
        {isWinner ? "✓" : rank + 1}
      </span>
      <Avatar name={candidate.name} color={candidate.partyColor} size={34} src={photoSrc} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-800">{candidate.name}</span>
          <PartyBadge name={candidate.partyShortName} color={candidate.partyColor} />
          {isWinner && (
            <span className="rounded border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              WON
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <VoteBar percentage={percentage} color={candidate.partyColor} height={4} />
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <span className={`text-sm font-bold tabular-nums ${isWinner ? "text-emerald-700" : rank === 0 ? "text-slate-900" : "text-slate-500"}`}>
          {candidate.votes.toLocaleString()}
        </span>
        {rank === 0 && candidate.margin && candidate.margin > 0 && (
          <div className="text-[10px] font-semibold tabular-nums text-emerald-600">+{candidate.margin.toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}
