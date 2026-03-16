"use client";

import React, { useEffect, useState } from "react";
import { proportionalResults2079, proportionalResults2074 } from "@/data/provinces";
import { Tabs } from "antd";
import { CLIENT_FETCH_CACHE, ENABLE_CLIENT_POLLING } from "@/lib/results-mode";

interface PRParty {
  symbolId: number;
  partyName: string;
  shortName: string;
  nameNp: string;
  color: string;
  votes: number;
  votePercent: number;
  seats: number;
  fptpWins?: number;
  aboveThreshold?: boolean;
  eligible?: boolean;
}

interface PRData {
  totalVotes: number;
  totalSeats: number;
  thresholdPercent?: number;
  thresholdVotes?: number;
  method?: string;
  parties: PRParty[];
}

interface OldBarItem {
  party: string;
  votes: number;
  color?: string;
}

export default function ProportionalResults() {
  const [prData, setPrData] = useState<PRData | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchPR() {
      try {
        const res = await fetch("/api/pr-results", { cache: CLIENT_FETCH_CACHE });
        if (!res.ok) return;
        const data: PRData = await res.json();
        if (mounted && data.parties?.length > 0) setPrData(data);
      } catch { /* silent */ }
    }
    fetchPR();
    const interval = ENABLE_CLIENT_POLLING ? setInterval(fetchPR, 60_000) : null;
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const renderPRChart = (data: PRData) => {
    if (data.parties.length === 0) {
      return <p className="text-sm text-gray-400 py-4 text-center">No proportional data available yet</p>;
    }

    const maxVotes = data.parties[0].votes;
    const topParties = data.parties.filter((p) => p.votePercent >= 0.1);

    return (
      <div>
        <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
          <span>Total Votes: <strong className="text-gray-700">{data.totalVotes.toLocaleString()}</strong></span>
          <span>PR Seats: <strong className="text-gray-700">{data.totalSeats}</strong></span>
        </div>

        {/* Header row */}
        <div className="flex items-center gap-4 mb-2 text-xs font-medium text-gray-500 px-1">
          <div className="w-36 shrink-0">Party</div>
          <div className="flex-1">Votes</div>
          <div className="w-14 text-right">Vote %</div>
          <div className="w-12 text-right">Seats</div>
        </div>

        <div className="space-y-2.5">
          {topParties.map((item) => {
            const barPct = (item.votes / maxVotes) * 100;
            const isEligible = item.eligible ?? ((item.aboveThreshold ?? false) && (item.fptpWins ?? 0) >= 1);
            const belowThreshold = item.aboveThreshold === false;
            const noFptp = (item.fptpWins ?? 0) < 1;

            const badgeText = isEligible
              ? "Eligible"
              : belowThreshold && noFptp
                ? "Below 3% + No FPTP"
                : belowThreshold
                  ? "Below 3%"
                  : "No FPTP";

            const badgeClass = isEligible
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700";

            return (
              <div key={item.symbolId} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="min-w-0">
                    <span className="block text-sm text-gray-600 truncate" title={item.nameNp}>{item.shortName}</span>
                    <span className={`mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                </div>
                <div className="flex-1 h-6 rounded-md bg-gray-50 overflow-hidden">
                  <div
                    className="h-full rounded-md flex items-center px-3"
                    style={{ width: `${Math.max(barPct, 4)}%`, backgroundColor: `${item.color}18`, borderLeft: `2px solid ${item.color}` }}
                  >
                    <span className="text-xs font-medium" style={{ color: item.color }}>
                      {item.votes.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-14 text-right text-xs font-semibold text-gray-700">{item.votePercent}%</div>
                <div className="w-12 text-right text-xs font-bold" style={{ color: item.seats > 0 ? item.color : "#9ca3af" }}>
                  {item.seats}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOldBarChart = (data: OldBarItem[]) => {
    if (data.length === 0) {
      return <p className="text-sm text-gray-400 py-4 text-center">No data</p>;
    }
    const maxVotes = Math.max(...data.map((d) => d.votes));
    const fallbackColors = ["#dc2626", "#2563eb", "#ea580c", "#059669", "#d97706", "#7c3aed", "#0891b2", "#b45309", "#4f46e5", "#db2777"];

    return (
      <div className="space-y-3">
        {data.map((item, index) => {
          const pct = (item.votes / maxVotes) * 100;
          const color = item.color || fallbackColors[index % fallbackColors.length];
          return (
            <div key={item.party} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-40 shrink-0">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm text-gray-600 truncate">{item.party}</span>
              </div>
              <div className="flex-1 h-6 rounded-md bg-gray-50 overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center px-3"
                  style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: `${color}18`, borderLeft: `2px solid ${color}` }}
                >
                  <span className="text-xs font-medium" style={{ color }}>
                    {item.votes.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOldResults = (data: typeof proportionalResults2079) => {
    return renderOldBarChart(
      data.map((item, index) => ({
        party: item.party,
        votes: item.votes,
        color: ["#dc2626", "#2563eb", "#ea580c", "#059669", "#d97706", "#7c3aed", "#0891b2", "#b45309", "#4f46e5", "#db2777"][index % 10],
      }))
    );
  };

  return (
    <div className="card p-6">
      <h2 className="text-base font-bold text-gray-900 mb-5">Federal Proportional Results</h2>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
        <p className="font-bold">Notice</p>
        <p className="mt-1 leading-relaxed">
          This dashboard uses the Election Commission seat-division rule for House of Representatives PR allocation:
          parties are included in the formula only if they secure at least 3% PR votes and at least 1 FPTP seat.
          Parties failing either condition are excluded from PR seat division.
        </p>
        <p className="mt-2 leading-relaxed">
          National-party status affects grants and symbol continuity, but parliamentary whip questions are separate legal issues.
          As publicly explained by legal experts, a party that wins at least 2 seats can still form a parliamentary party and issue
          binding whips to its lawmakers under the Political Party Act (Sections 24 and 28), even if it is not recognized as a national party.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700">
        <p className="font-bold text-slate-900">How are these seats calculated?</p>
        <p className="mt-1 leading-relaxed">
          Seats are awarded one-by-one using Sainte-Lague odd-number divisors. For federal PR, the top 110 quotients determine
          seat allocation; for provincial PR, the same logic applies to 220 seats.
        </p>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>
            <span className="font-semibold text-slate-900">1. Eligibility Gate:</span> A party must pass both conditions:
            at least 3% PR vote share and at least 1 FPTP seat.
          </p>
          <p>
            <span className="font-semibold text-slate-900">2. Quotient Sequence:</span> Divide each eligible party&apos;s votes by
            <code>1, 3, 5, 7, 9, 11, ...</code>. Pick the highest quotient, award one seat, then continue until all seats are allocated.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-semibold text-slate-900">Example: Awarding 2 Seats</p>
            <p className="mt-1"><span className="font-semibold">Round 1:</span> Party A (10k) = 10,000 / 1 = 10,000; Party B (8k) = 8,000 / 1 = 8,000. Party A wins seat #1.</p>
            <p className="mt-1"><span className="font-semibold">Round 2:</span> Party A now uses divisor 3 =&gt; 10,000 / 3 = 3,333; Party B still uses divisor 1 =&gt; 8,000 / 1 = 8,000. Party B wins seat #2.</p>
          </div>
        </div>
      </div>

      <Tabs
        defaultActiveKey="2082"
        items={[
          {
            key: "2082",
            label: <span className="text-sm font-semibold">Election 2082</span>,
            children: prData ? renderPRChart(prData) : (
              <p className="text-sm text-gray-400 py-4 text-center">Loading PR results...</p>
            ),
          },
          {
            key: "2079",
            label: <span className="text-sm">Election 2079</span>,
            children: renderOldResults(proportionalResults2079),
          },
          {
            key: "2074",
            label: <span className="text-sm">Election 2074</span>,
            children: renderOldResults(proportionalResults2074),
          },
        ]}
      />
    </div>
  );
}
