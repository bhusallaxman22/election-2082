"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/templates/PageTemplate";
import ElectionSummary from "@/components/organisms/ElectionSummary";
import PartyTable from "@/components/organisms/PartyTable";
import CandidateCard from "@/components/organisms/CandidateCard";
import ProportionalResults from "@/components/organisms/ProportionalResults";
import NepalMap from "@/components/organisms/NepalMap";
import SeatMap from "@/components/organisms/SeatMap";
import { useElectionData } from "@/context/ElectionDataContext";
import { provinces } from "@/data/provinces";

type SearchTarget = "results" | "candidates" | "parties" | "provinces";

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function partyRouteSlug(shortName: string): string {
  return shortName.toLowerCase().replace(/[\s()]/g, "-");
}

export default function HomePage() {
  const router = useRouter();
  const { parties, popularCandidates } = useElectionData();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<SearchTarget>("results");
  const [status, setStatus] = useState<"all" | "won" | "leading" | "pending">("all");
  const [party, setParty] = useState<string>("all");

  const partyOptions = useMemo(() => {
    const options = new Set<string>();
    parties.forEach((item) => {
      if (item.shortName) options.add(item.shortName);
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [parties]);

  const searchHints = useMemo(() => {
    const hints = new Set<string>();

    popularCandidates.forEach((item) => {
      hints.add(item.constituency);
    });
    parties.forEach((item) => {
      hints.add(item.name);
      hints.add(item.shortName);
    });
    provinces.forEach((item) => {
      hints.add(item.name);
    });

    return Array.from(hints).slice(0, 80);
  }, [parties, popularCandidates]);

  const navigateFromTopSearch = () => {
    const trimmedQuery = query.trim();
    const normalizedQuery = normalizeText(trimmedQuery);

    if (target === "results") {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (party !== "all") params.set("party", party);

      if (trimmedQuery) {
        const exactSeat = popularCandidates.find((seat) => {
          const constituencyNorm = normalizeText(seat.constituency);
          const slugNorm = normalizeText(seat.constituencySlug);
          return constituencyNorm === normalizedQuery || slugNorm === normalizedQuery;
        });

        if (exactSeat) {
          params.set("constituency", exactSeat.constituencySlug);
        } else {
          params.set("search", trimmedQuery);
        }
      }

      const queryString = params.toString();
      router.push(queryString ? `/results?${queryString}` : "/results");
      return;
    }

    if (target === "candidates") {
      const params = new URLSearchParams();
      if (trimmedQuery) params.set("search", trimmedQuery);
      const queryString = params.toString();
      router.push(queryString ? `/candidates?${queryString}` : "/candidates");
      return;
    }

    if (target === "parties") {
      if (!trimmedQuery) {
        router.push("/parties");
        return;
      }

      const matchingParty = parties.find((item) => {
        const byShort = normalizeText(item.shortName) === normalizedQuery;
        const byName = normalizeText(item.name) === normalizedQuery;
        const bySlug = normalizeText(partyRouteSlug(item.shortName)) === normalizedQuery;
        return byShort || byName || bySlug;
      });

      if (matchingParty) {
        router.push(`/parties/${partyRouteSlug(matchingParty.shortName)}`);
      } else {
        router.push("/parties");
      }
      return;
    }

    if (target === "provinces") {
      if (!trimmedQuery) {
        router.push("/provinces");
        return;
      }

      const matchingProvince = provinces.find((item) => normalizeText(item.name) === normalizedQuery);
      if (matchingProvince) {
        router.push(`/provinces/${matchingProvince.id}`);
      } else {
        router.push("/provinces");
      }
    }
  };

  return (
    <PageTemplate>
      <div className="space-y-9">
        <section className="animate-fade-in">
          <div className="glass-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Quick Search</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Find And Jump Fast</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Search and apply filters from here, then jump to the most relevant page.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Destination
                  <select
                    value={target}
                    onChange={(event) => setTarget(event.target.value as SearchTarget)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none ring-red-500/20 transition focus:ring-2"
                  >
                    <option value="results">Results</option>
                    <option value="candidates">Candidates</option>
                    <option value="parties">Parties</option>
                    <option value="provinces">Provinces</option>
                  </select>
                </label>

                {target === "results" ? (
                  <>
                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Status
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value as "all" | "won" | "leading" | "pending")}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none ring-red-500/20 transition focus:ring-2"
                      >
                        <option value="all">All</option>
                        <option value="won">Won</option>
                        <option value="leading">Leading</option>
                        <option value="pending">Pending</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Party
                      <select
                        value={party}
                        onChange={(event) => setParty(event.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none ring-red-500/20 transition focus:ring-2"
                      >
                        <option value="all">All</option>
                        {partyOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") navigateFromTopSearch();
                }}
                list="home-search-hints"
                placeholder="Search constituency, candidate, party, or province..."
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none ring-red-500/20 transition focus:ring-2"
              />
              <datalist id="home-search-hints">
                {searchHints.map((hint) => (
                  <option key={hint} value={hint} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={navigateFromTopSearch}
                className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Search
              </button>
            </div>
          </div>
        </section>

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
