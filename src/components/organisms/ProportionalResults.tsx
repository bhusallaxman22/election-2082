"use client";

import React, { useEffect, useState } from "react";
import { proportionalResults2079, proportionalResults2074 } from "@/data/provinces";
import { Tabs } from "antd";

interface PRParty {
  symbolId: number;
  partyName: string;
  shortName: string;
  nameNp: string;
  color: string;
  votes: number;
  votePercent: number;
  seats: number;
}

interface PRData {
  totalVotes: number;
  totalSeats: number;
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
        const res = await fetch("/api/pr-results", { cache: "no-store" });
        if (!res.ok) return;
        const data: PRData = await res.json();
        if (mounted && data.parties?.length > 0) setPrData(data);
      } catch { /* silent */ }
    }
    fetchPR();
    const interval = setInterval(fetchPR, 60_000);
    return () => { mounted = false; clearInterval(interval); };
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
            return (
              <div key={item.symbolId} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600 truncate" title={item.nameNp}>{item.shortName}</span>
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
