"use client";

import React from "react";
import { proportionalResults2079, proportionalResults2074 } from "@/data/provinces";
import { Tabs } from "antd";

export default function ProportionalResults() {
  const renderResults = (data: typeof proportionalResults2079) => {
    const maxVotes = Math.max(...data.map((d) => d.votes));
    const colors = ["#dc2626", "#2563eb", "#ea580c", "#059669", "#d97706", "#7c3aed", "#0891b2", "#b45309", "#4f46e5", "#db2777"];

    return (
      <div className="space-y-3">
        {data.map((item, index) => {
          const pct = (item.votes / maxVotes) * 100;
          const color = colors[index % colors.length];
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

  return (
    <div className="card p-6">
      <h2 className="text-base font-bold text-gray-900 mb-5">Federal Proportional Results</h2>
      <Tabs
        defaultActiveKey="2079"
        items={[
          {
            key: "2079",
            label: <span className="text-sm">Election 2079</span>,
            children: renderResults(proportionalResults2079),
          },
          {
            key: "2074",
            label: <span className="text-sm">Election 2074</span>,
            children: renderResults(proportionalResults2074),
          },
        ]}
      />
    </div>
  );
}
