"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Party } from "@/data/parties";
import { parties as fallbackParties } from "@/data/parties";
import { popularCandidates as fallbackCandidates } from "@/data/candidates";
import { provinces } from "@/data/provinces";
import { candidateImageMap } from "@/data/imageMap";
import { getPartyTotalSeats } from "@/lib/party-seats";

const ELECTION_API_URL = "/api/election";
const CANDIDATES_API_URL = "/api/candidates";
const RESULTS_API_URL = "/api/results";
const POLL_INTERVAL = 120_000;

interface APIPartyResult {
  party_id: number | string;
  party_name: string;
  party_nickname: string;
  party_slug: string;
  party_image: string | null;
  party_color: string | null;
  leading_count: number | string;
  winner_count: number | string;
  total_seat: number | string;
  samanupatik: number | string;
}

interface ElectionResponse {
  data?: {
    party_results?: APIPartyResult[];
  };
}

interface ResultsResponse {
  data?: {
    provinceWise?: {
      province: string;
      results?: {
        partyShortName?: string;
        partyColor?: string;
        party?: string;
        color?: string;
        wins?: number;
        leads?: number;
      }[];
    }[];
  };
}

interface APIConstituencyCandidate {
  id: string;
  name: string;
  partyShortName: string;
  partyColor: string;
  votes: number;
  status: "won" | "leading" | "trailing" | "pending";
  margin?: number;
  photo?: string;
}

interface APIPopularConstituency {
  constituency: string;
  constituencySlug: string;
  districtId: number;
  constNumber: number;
  province: string;
  provinceId: number;
  candidates: APIConstituencyCandidate[];
  totalVotes: number;
  countingStatus: string;
}

interface CandidatesResponse {
  data?: APIPopularConstituency[];
}

export interface LiveCandidate {
  id: string;
  name: string;
  partyShortName: string;
  partyColor: string;
  votes: number;
  status: "won" | "leading" | "trailing" | "pending";
  margin?: number;
  photo: string;
}

export interface LiveConstituencyResult {
  constituency: string;
  constituencySlug: string;
  districtId: number;
  constNumber: number;
  province: string;
  provinceId: number;
  candidates: LiveCandidate[];
  totalVotes: number;
  countingStatus: string;
}

export interface ProvincePartyLiveResult {
  partyShortName: string;
  partyColor: string;
  wins: number;
  leads: number;
}

interface ElectionData {
  parties: Party[];
  popularCandidates: LiveConstituencyResult[];
  provinceResults: Record<number, ProvincePartyLiveResult[]>;
  loading: boolean;
  candidatesLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const PARTY_META: Record<string, { name: string; shortName: string; color: string }> = {
  rsp: { name: "Rastriya Swatantra Party", shortName: "RSP", color: "#1a73e8" },
  nc: { name: "Nepali Congress", shortName: "NC", color: "#16a34a" },
  "cpn-uml": { name: "CPN-UML", shortName: "CPN-UML", color: "#dc2626" },
  ncp: { name: "Nepali Communist Party", shortName: "NCP", color: "#e84118" },
  rpp: { name: "Rastriya Prajatantra Party", shortName: "RPP", color: "#f59e0b" },
  ssp: { name: "Shram Sanskriti Party", shortName: "SSP", color: "#8b5cf6" },
  jsp: { name: "Janata Samajwadi Party-Nepal", shortName: "JSP", color: "#10b981" },
  nup: { name: "Nagarik Unmukti Party", shortName: "NUP", color: "#0ea5e9" },
  jp: { name: "Janamat Party", shortName: "JP", color: "#a16207" },
  plp: { name: "Pragatishil Loktantrik Party", shortName: "PLP", color: "#6b7280" },
  ind: { name: "Independent", shortName: "IND", color: "#64748b" },
};

const PARTY_SLUG_ALIASES: Record<string, string> = {
  "rastriya-swatantra-party-rsp": "rsp",
  rsp: "rsp",
  "nepali-congress": "nc",
  nc: "nc",
  "cpn-uml": "cpn-uml",
  uml: "cpn-uml",
  "nepali-communist-party": "ncp",
  ncp: "ncp",
  "rastriya-prajatantra-party": "rpp",
  rpp: "rpp",
  "shram-sanskriti-party": "ssp",
  ssp: "ssp",
  "janata-samajwadi-party-nepal": "jsp",
  jsp: "jsp",
  "nagarik-unmukti-party-nepal": "nup",
  nup: "nup",
  "janamat-party": "jp",
  jp: "jp",
  pargatishilloktantrikparty: "plp",
  pragatishilloktantrikparty: "plp",
  independent: "ind",
  ind: "ind",
};

const ElectionDataContext = createContext<ElectionData>({
  parties: [],
  popularCandidates: [],
  provinceResults: {},
  loading: true,
  candidatesLoading: true,
  error: null,
  lastUpdated: null,
});

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizePartySlug(slug: string): string {
  const normalized = slug.toLowerCase().trim();
  return PARTY_SLUG_ALIASES[normalized] ?? normalized;
}

function fallbackColor(id: number): string {
  const palette = ["#ea4335", "#2563eb", "#f97316", "#10b981", "#f59e0b", "#8b5cf6", "#0ea5e9", "#64748b"];
  return palette[Math.abs(id) % palette.length];
}

function formatPartyNameFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function sanitizeImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return "";
}

function sortByMomentum(list: Party[]): Party[] {
  return [...list].sort((a, b) => getPartyTotalSeats(b) - getPartyTotalSeats(a));
}

function mapParty(api: APIPartyResult): Party {
  const slug = normalizePartySlug(api.party_slug);
  const meta = PARTY_META[slug];
  const id = toNumber(api.party_id);
  const shortName = meta?.shortName ?? (api.party_nickname || api.party_name || api.party_slug).slice(0, 18);

  return {
    id,
    name: meta?.name ?? formatPartyNameFromSlug(api.party_slug),
    shortName,
    slug: api.party_slug,
    nameNp: api.party_name,
    color: meta?.color ?? api.party_color ?? fallbackColor(id),
    logo: sanitizeImageUrl(api.party_image) || `/assets/images/parties/${slug}.svg`,
    wins: toNumber(api.winner_count),
    leads: toNumber(api.leading_count),
    totalSeats: toNumber(api.total_seat),
    samanupatik: toNumber(api.samanupatik),
  };
}

const fallbackPhotoByName: Record<string, string> = fallbackCandidates
  .flatMap((constituency) => constituency.candidates)
  .reduce((acc, candidate) => {
    acc[candidate.name] = candidate.photo;
    return acc;
  }, {} as Record<string, string>);

function getCandidatePhoto(name: string, photo?: string, id?: string): string {
  if (photo && (photo.startsWith("http") || photo.startsWith("/api/"))) return photo;
  const fallback = fallbackPhotoByName[name];
  if (fallback && fallback.startsWith("http")) return fallback;
  const mapped = candidateImageMap[name]?.remote;
  if (mapped) return mapped;
  if (id) return `/api/candidate-image/${id}`;
  return fallback ?? photo ?? "";
}

function normalizeCandidate(raw: APIConstituencyCandidate): LiveCandidate {
  return {
    id: String(raw.id),
    name: raw.name,
    partyShortName: raw.partyShortName,
    partyColor: raw.partyColor,
    votes: toNumber(raw.votes),
    status: raw.status,
    margin: raw.margin,
    photo: getCandidatePhoto(raw.name, raw.photo, raw.id),
  };
}

function fallbackProvinceResults(): Record<number, ProvincePartyLiveResult[]> {
  const seeded = provinces.reduce((acc, province) => {
    acc[province.id] = province.partyResults.map((result) => ({
      partyShortName: result.partyShortName,
      partyColor: result.partyColor,
      wins: result.wins,
      leads: result.leads,
    }));
    return acc;
  }, {} as Record<number, ProvincePartyLiveResult[]>);

  const hasSeedData = Object.values(seeded).some((results) => results.length > 0);
  if (hasSeedData) return seeded;

  const computed: Record<number, Map<string, ProvincePartyLiveResult>> = {};
  for (const province of provinces) {
    computed[province.id] = new Map();
  }

  for (const constituency of fallbackCandidates) {
    const provinceId = provinces.find((province) => province.name === constituency.province)?.id;
    if (!provinceId) continue;
    const leader = constituency.candidates[0];
    if (!leader || (leader.status === "pending" && constituency.totalVotes <= 0)) continue;

    const provinceMap = computed[provinceId];
    const existing = provinceMap.get(leader.partyShortName);
    if (existing) {
      if (leader.status === "leading") existing.leads += 1;
    } else {
      provinceMap.set(leader.partyShortName, {
        partyShortName: leader.partyShortName,
        partyColor: leader.partyColor,
        wins: 0,
        leads: leader.status === "leading" ? 1 : 0,
      });
    }
  }

  return Object.entries(computed).reduce((acc, [provinceId, map]) => {
    acc[Number(provinceId)] = Array.from(map.values()).sort((a, b) => b.wins + b.leads - (a.wins + a.leads));
    return acc;
  }, {} as Record<number, ProvincePartyLiveResult[]>);
}

function fallbackLiveCandidates(): LiveConstituencyResult[] {
  return fallbackCandidates.map((constituency) => ({
    constituency: constituency.constituency,
    constituencySlug: constituency.constituencySlug,
    districtId: 0,
    constNumber: 0,
    province: constituency.province,
    provinceId: provinces.find((p) => p.name === constituency.province)?.id ?? 0,
    candidates: constituency.candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      partyShortName: candidate.partyShortName,
      partyColor: candidate.partyColor,
      votes: candidate.votes,
      status: candidate.status,
      margin: candidate.margin,
      photo: getCandidatePhoto(candidate.name, candidate.photo, candidate.id),
    })),
    totalVotes: constituency.totalVotes,
    countingStatus: constituency.countingStatus,
  }));
}

export function useElectionData() {
  return useContext(ElectionDataContext);
}

export function ElectionDataProvider({ children }: { children: React.ReactNode }) {
  const [parties, setParties] = useState<Party[]>(sortByMomentum(fallbackParties));
  const [popularCandidates, setPopularCandidates] = useState<LiveConstituencyResult[]>(fallbackLiveCandidates());
  const [provinceResults, setProvinceResults] = useState<Record<number, ProvincePartyLiveResult[]>>(fallbackProvinceResults());
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    const [electionRes, candidatesRes, resultsRes] = await Promise.allSettled([
      fetch(ELECTION_API_URL, { cache: "no-store" }),
      fetch(CANDIDATES_API_URL, { cache: "no-store" }),
      fetch(RESULTS_API_URL, { cache: "no-store" }),
    ]);

    let hadError = false;

    try {
      if (electionRes.status === "fulfilled" && electionRes.value.ok) {
        const json: ElectionResponse = await electionRes.value.json();
        const partyResults = json.data?.party_results;
        if (Array.isArray(partyResults) && partyResults.length > 0) {
          setParties(sortByMomentum(partyResults.map(mapParty)));
        }
      } else {
        hadError = true;
      }
    } catch {
      hadError = true;
    }

    try {
      if (candidatesRes.status === "fulfilled" && candidatesRes.value.ok) {
        const json: CandidatesResponse = await candidatesRes.value.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setPopularCandidates(
            json.data.map((item) => ({
              constituency: item.constituency,
              constituencySlug: item.constituencySlug,
              districtId: item.districtId,
              constNumber: item.constNumber,
              province: item.province,
              provinceId: item.provinceId,
              candidates: (item.candidates ?? []).map(normalizeCandidate),
              totalVotes: toNumber(item.totalVotes),
              countingStatus: item.countingStatus,
            }))
          );
        }
      } else {
        hadError = true;
      }
    } catch {
      hadError = true;
    } finally {
      setCandidatesLoading(false);
    }

    try {
      if (resultsRes.status === "fulfilled" && resultsRes.value.ok) {
        const json: ResultsResponse = await resultsRes.value.json();
        const provinceWise = json.data?.provinceWise;
        if (Array.isArray(provinceWise)) {
          const mapped: Record<number, ProvincePartyLiveResult[]> = {};
          for (const provinceData of provinceWise) {
            const province = provinces.find((item) => item.name === provinceData.province);
            if (!province) continue;
            mapped[province.id] = (provinceData.results ?? [])
              .map((result) => ({
                partyShortName: result.partyShortName ?? result.party ?? "",
                partyColor: result.partyColor ?? result.color ?? "#64748b",
                wins: toNumber(result.wins),
                leads: toNumber(result.leads),
              }))
              .filter((result) => result.partyShortName && (result.wins > 0 || result.leads > 0));
          }
          if (Object.keys(mapped).length > 0) {
            setProvinceResults(mapped);
          }
        }
      } else {
        hadError = true;
      }
    } catch {
      hadError = true;
    }

    setLastUpdated(new Date());
    setLoading(false);
    setError(hadError ? "Some live feeds are temporarily unavailable. Showing fallback data where needed." : null);
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  const value = useMemo(
    () => ({
      parties,
      popularCandidates,
      provinceResults,
      loading,
      candidatesLoading,
      error,
      lastUpdated,
    }),
    [parties, popularCandidates, provinceResults, loading, candidatesLoading, error, lastUpdated]
  );

  return <ElectionDataContext.Provider value={value}>{children}</ElectionDataContext.Provider>;
}
