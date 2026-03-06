"use client";

import React from "react";
import Link from "next/link";
import PageTemplate from "@/components/templates/PageTemplate";
import ElectionSummary from "@/components/organisms/ElectionSummary";
import PartyTable from "@/components/organisms/PartyTable";
import CandidateCard from "@/components/organisms/CandidateCard";
import ProportionalResults from "@/components/organisms/ProportionalResults";
import NepalMap from "@/components/organisms/NepalMap";
import SeatMap from "@/components/organisms/SeatMap";
import { useElectionData } from "@/context/ElectionDataContext";

export default function HomePage() {
  const { parties, popularCandidates } = useElectionData();

  return (
    <PageTemplate>
      <div className="space-y-9">
        <section className="animate-fade-in">
          <ElectionSummary />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="glass-card overflow-hidden p-6">
            <NepalMap />
          </div>
          <div className="xl:sticky xl:top-20 xl:self-start">
            <PartyTable parties={parties} compact />
          </div>
        </section>

        <section className="animate-slide-up">
          <SeatMap />
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Watchlist</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Popular Constituencies</h2>
            </div>
            <Link href="/candidates" className="text-xs font-bold text-red-600 transition-colors hover:text-red-700">
              View all candidates →
            </Link>
          </div>

          {popularCandidates.length > 0 ? (
            <div className="stagger-children grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {popularCandidates.slice(0, 6).map((result) => (
                <CandidateCard key={result.constituencySlug} result={result} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center text-sm font-semibold text-slate-500">Waiting for candidate feed…</div>
          )}
        </section>

        <section>
          <ProportionalResults />
        </section>
      </div>
    </PageTemplate>
  );
}
