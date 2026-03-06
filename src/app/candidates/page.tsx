"use client";

import React, { useMemo, useState } from "react";
import PageTemplate from "@/components/templates/PageTemplate";
import CandidateCard from "@/components/organisms/CandidateCard";
import SearchBar from "@/components/molecules/SearchBar";
import FilterDropdowns from "@/components/molecules/FilterDropdowns";
import { useElectionData } from "@/context/ElectionDataContext";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function CandidatesPage() {
  const { popularCandidates, candidatesLoading } = useElectionData();
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");

  const filtered = useMemo(() => {
    let results = [...popularCandidates];

    if (province) {
      const provinceId = Number(province);
      results = results.filter((item) => item.provinceId === provinceId);
    }

    if (district) {
      const districtNorm = normalize(district);
      results = results.filter((item) => {
        const constituencyDistrict = item.constituencySlug.replace(/-\d+$/, "");
        return normalize(constituencyDistrict) === districtNorm;
      });
    }

    if (search) {
      const query = search.toLowerCase();
      results = results.filter(
        (item) =>
          item.candidates.some((candidate) => candidate.name.toLowerCase().includes(query)) ||
          item.constituency.toLowerCase().includes(query)
      );
    }

    return results;
  }, [popularCandidates, province, district, search]);

  const totalCandidates = filtered.reduce((sum, result) => sum + result.candidates.length, 0);
  const activeCount = filtered.filter((item) => item.totalVotes > 0).length;

  return (
    <PageTemplate>
      <section className="animate-fade-in">
        <div className="glass-card overflow-hidden p-0">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Candidate Tracker</p>
                <h1 className="mt-2 text-2xl font-black text-slate-900">Constituency Candidates</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Search and filter competitive constituencies with real-time leaderboards and vote progression.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-center">
                  <div className="text-2xl font-black text-slate-900 tabular-nums">{filtered.length}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Seats</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-center">
                  <div className="text-2xl font-black text-slate-900 tabular-nums">{totalCandidates}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Candidates</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-center">
                  <div className="text-2xl font-black text-emerald-700 tabular-nums">{activeCount}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-center">
                  <div className="text-2xl font-black text-slate-500 tabular-nums">{Math.max(filtered.length - activeCount, 0)}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Pending</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 lg:flex-row">
              <div className="flex-1">
                <SearchBar placeholder="Search by candidate or constituency..." onSearch={setSearch} />
              </div>
              <FilterDropdowns
                selectedProvince={province}
                selectedDistrict={district}
                onProvinceChange={(value) => {
                  setProvince(value || "");
                  setDistrict("");
                }}
                onDistrictChange={(value) => setDistrict(value || "")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        {candidatesLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <div key={key} className="glass-card p-5 animate-pulse">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                <div className="mt-5 space-y-3">
                  {[1, 2, 3].map((line) => (
                    <div key={line} className="h-10 rounded-xl bg-slate-100" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="stagger-children grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((result) => (
              <CandidateCard key={result.constituencySlug} result={result} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-10 text-center">
            <p className="text-sm font-semibold text-slate-600">No constituency matched your filter.</p>
          </div>
        )}
      </section>
    </PageTemplate>
  );
}
