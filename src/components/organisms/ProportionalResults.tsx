"use client";

import React from "react";
import { proportionalResults2079, proportionalResults2074 } from "@/data/provinces";
import { useElectionData } from "@/context/ElectionDataContext";
import { Tabs } from "antd";

interface BarItem {
  party: string;
  votes: number;
  color: string;
}

export default function ProportionalResults() {
  const { parties } = useElectionData();

  // Build 2082 PR data from live party samanupatik votes
  const liveData: BarItem[] = parties
    .filter((p) => p.samanupatik > 0)
    .sort((a, b) => b.samanupatik - a.samanupatik)
    .map((p) => ({ party: p.name, votes: p.samanupatik, color: p.color }));

  const renderBarChart = (data: BarItem[]) => {
    if (data.length === 0) {
      return <p className="text-sm text-gray-400 py-4 text-center">No proportional data available yet</p>;
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
    return renderBarChart(
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
            children: renderBarChart(liveData),
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
