"use client";

import React, { useMemo } from "react";
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://election.bhusallaxman.com.np";

  const structuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "Nepal Election 2082",
          url: siteUrl,
          inLanguage: "en",
          description:
            "Nepal election live update with federal parliament election 2082 results, party-wise counts and constituency details.",
          potentialAction: {
            "@type": "SearchAction",
            target: `${siteUrl}/results?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "Organization",
          name: "Election 2082",
          url: siteUrl,
          logo: `${siteUrl}/icon.png`,
        },
        {
          "@type": "WebPage",
          name: "Nepal Election Live Update 2082",
          url: siteUrl,
          about: [
            "Nepal Election",
            "Nepal Election Live Update",
            "Nepal Federal Election 2082",
            "Nepal Parliament Election",
            "RSP",
            "Nepali Congress",
          ],
        },
      ],
    }),
    [siteUrl]
  );

  return (
    <PageTemplate>
      <div className="space-y-9">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

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
            <Link href="/results" className="text-xs font-bold text-red-600 transition-colors hover:text-red-700">
              View all results →
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

        <section className="animate-fade-in">
          <div className="glass-card p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">SEO Landing Content</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Nepal Election Live Update And Results 2082</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Election.bhusallaxman.com.np provides Nepal election live update coverage for Nepal federal election 2082
              and Nepal parliament election races. Track constituency-level vote counting, live result movement, and
              updates for major parties including RSP, Nepali Congress, CPN-UML, Maoist, NCP, and independents.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              If you are searching for Nepal election, election live update, election 2082, Nepal federal election 2082,
              or Nepal parliament election updates, this dashboard is built to provide fast and clear public result
              tracking in one place.
            </p>
          </div>
        </section>
      </div>
    </PageTemplate>
  );
}
