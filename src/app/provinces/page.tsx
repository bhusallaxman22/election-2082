"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/templates/PageTemplate";
import ProvinceCard from "@/components/organisms/ProvinceCard";
import GlassCard from "@/components/atoms/GlassCard";
import StatNumber from "@/components/atoms/StatNumber";
import { provinces } from "@/data/provinces";
import { useElectionData } from "@/context/ElectionDataContext";

const InteractiveMap = dynamic(
  () => import("@/components/organisms/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    ),
  }
);

export default function ProvincesPage() {
  const router = useRouter();
  const { provinceResults } = useElectionData();
  const totalSeats = provinces.reduce((s, p) => s + p.totalSeats, 0);
  const totalDistricts = provinces.reduce((s, p) => s + p.districts.length, 0);
  const totalCounting = provinces.reduce(
    (s, p) => s + (provinceResults[p.id] ?? []).reduce((ss, r) => ss + r.leads + r.wins, 0),
    0
  );

  return (
    <PageTemplate>
      {/* Hero */}
      <div className="animate-fade-in">
        <GlassCard className="relative overflow-hidden" padding="p-0">
          <div className="h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400" />
          <div className="p-6 sm:p-8">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-purple-500/8 to-pink-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-1.5 h-7 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full" />
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Provinces</h1>
              </div>
              <p className="text-sm text-slate-500 ml-4 mb-6">
                Province-wise election results for all 7 provinces of Nepal
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-50/60 rounded-2xl p-4 text-center border border-purple-100/60">
                  <StatNumber value={7} label="Provinces" color="text-purple-600" />
                </div>
                <div className="bg-blue-50/60 rounded-2xl p-4 text-center border border-blue-100/60">
                  <StatNumber value={totalDistricts} label="Districts" color="text-blue-600" />
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-center border border-white/60">
                  <StatNumber value={totalSeats} label="Total Seats" />
                </div>
                <div className="bg-emerald-50/60 rounded-2xl p-4 text-center border border-emerald-100/60">
                  <StatNumber value={totalCounting} label="Results In" color="text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Nepal Map with Province Drilling */}
      <div className="mt-6 animate-fade-in">
        <GlassCard className="overflow-hidden" padding="p-0">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-sm font-bold text-slate-900">Nepal Province Map</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any province area to open analytics drill-down
            </p>
          </div>
          <InteractiveMap
            height={460}
            showProvinceBorders
            onProvinceClick={(provinceId) => {
              router.push(`/analytics?view=province&id=${provinceId}`);
            }}
          />
        </GlassCard>
      </div>

      {/* Province Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
        {provinces.map((province) => (
          <ProvinceCard key={province.id} province={province} liveResults={provinceResults[province.id]} />
        ))}
      </div>

      {/* Comparison Table */}
      <div className="mt-8">
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-full" />
            <h2 className="text-sm font-bold text-slate-800">Province Comparison</h2>
          </div>
          <div className="space-y-4">
            {provinces.map((p) => {
              const liveResults = provinceResults[p.id] ?? [];
              const filled = liveResults.reduce(
                (s, r) => s + r.leads + r.wins,
                0
              );
              const pct = p.totalSeats > 0 ? ((filled / p.totalSeats) * 100).toFixed(0) : '0';
              return (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/40 transition-colors">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">
                        {p.name}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {filled}/{p.totalSeats} seats · {pct}%
                      </span>
                    </div>
                    <div className="flex rounded-full overflow-hidden h-3.5 bg-slate-100">
                      {liveResults
                        .filter((r) => r.leads > 0 || r.wins > 0)
                        .map((r, i) => (
                          <div
                            key={i}
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${
                                ((r.leads + r.wins) / p.totalSeats) * 100
                              }%`,
                              backgroundColor: r.partyColor,
                            }}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
