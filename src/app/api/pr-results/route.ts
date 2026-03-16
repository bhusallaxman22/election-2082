import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { fetchECPRPartyResults, getPartyMeta } from "@/lib/ec-api";
import { execute, query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

const TOTAL_PR_SEATS = 110;
const CACHE_KEY = "pr_party_results_v3";
const CACHE_TTL = 60 * 60 * 24; // 24 hours
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // once per day

function sainteLagueDivisor(currentSeats: number): number {
  if (currentSeats <= 0) return 1;
  return currentSeats * 2 + 1; // 3,5,7...
}

interface ECPRPartyResult {
  SymbolID: number;
  PoliticalPartyName: string;
  TotalVoteReceived: number;
}

interface StoredPRSnapshot {
  fetchedAt?: string;
  attemptedAt?: string;
  result?: unknown;
}

function shortNameFromPartySlug(slug: string): string | null {
  const s = (slug || "").toLowerCase();
  if (!s) return null;
  if (s.includes("rastriya-swatantra-party") || s === "rsp") return "RSP";
  if (s.includes("nepali-congress") || s === "nc") return "NC";
  if (s.includes("cpn-uml") || s === "uml") return "CPN-UML";
  if (s.includes("nepali-communist-party") || s === "ncp") return "NCP";
  if (s.includes("shram-sanskriti-party") || s === "ssp") return "SSP";
  if (s.includes("rastriya-prajatantra-party") || s === "rpp") return "RPP";
  if (s.includes("janata-samajwadi-party") || s === "jsp") return "JSP";
  if (s.includes("nagarik-unmukti-party") || s === "nup") return "NUP";
  if (s.includes("janamat-party") || s === "jp") return "JP";
  return null;
}

async function buildPRResult(raw: ECPRPartyResult[]) {
  const totalVotes = raw.reduce((sum, p) => sum + p.TotalVoteReceived, 0);

  // Gather FPTP wins per party (for National Party Status reference)
  const fptpWinRows = await query<{ leader_party: string; status: string }>(
    "SELECT leader_party, status FROM constituency_results WHERE status = 'won'"
  );
  const fptpWins = new Map<string, number>();
  for (const row of fptpWinRows) {
    const key = (row.leader_party || "").trim().toUpperCase();
    if (!key) continue;
    fptpWins.set(key, (fptpWins.get(key) || 0) + 1);
  }

  // Fallback for finalized election snapshots where constituency status rows may not be marked as 'won'.
  if (fptpWins.size === 0) {
    const partyRows = await query<{ party_slug: string; winner_count: number }>(
      "SELECT party_slug, winner_count FROM party_results"
    );
    for (const row of partyRows) {
      const short = shortNameFromPartySlug(row.party_slug);
      if (!short) continue;
      const wins = Number(row.winner_count) || 0;
      fptpWins.set(short, wins);
    }
  }

  const thresholdVotes = totalVotes * 0.03;

  const partiesBase = raw
    .filter((p) => p.TotalVoteReceived > 0)
    .map((p) => {
      const meta = getPartyMeta(p.SymbolID, p.PoliticalPartyName);
      const votePercent = totalVotes > 0 ? (p.TotalVoteReceived / totalVotes) * 100 : 0;
      const wins = fptpWins.get(meta.shortName.trim().toUpperCase()) || 0;
      return {
        symbolId: p.SymbolID,
        partyName: meta.name,
        shortName: meta.shortName,
        nameNp: p.PoliticalPartyName,
        color: meta.color,
        votes: p.TotalVoteReceived,
        votePercent: Math.round(votePercent * 100) / 100,
        fptpWins: wins,
        aboveThreshold: p.TotalVoteReceived >= thresholdVotes,
        seats: 0,
      };
    });

  // Seat-division eligibility per supplied rule: 3% PR threshold AND at least one FPTP win.
  const eligible = partiesBase.filter((p) => p.aboveThreshold && p.fptpWins >= 1);

  for (let i = 0; i < TOTAL_PR_SEATS; i += 1) {
    if (eligible.length === 0) break;

    let winnerIndex = 0;
    let bestQuotient = -1;

    for (let j = 0; j < eligible.length; j += 1) {
      const party = eligible[j];
      const quotient = party.votes / sainteLagueDivisor(party.seats);
      if (
        quotient > bestQuotient ||
        (quotient === bestQuotient && party.votes > eligible[winnerIndex].votes) ||
        (quotient === bestQuotient && party.votes === eligible[winnerIndex].votes && party.symbolId < eligible[winnerIndex].symbolId)
      ) {
        bestQuotient = quotient;
        winnerIndex = j;
      }
    }

    eligible[winnerIndex].seats += 1;
  }

  const parties = partiesBase
    .sort((a, b) => b.seats - a.seats || b.votes - a.votes)
    .map((p) => ({
      symbolId: p.symbolId,
      partyName: p.partyName,
      shortName: p.shortName,
      nameNp: p.nameNp,
      color: p.color,
      votes: p.votes,
      votePercent: p.votePercent,
      seats: p.seats,
      fptpWins: p.fptpWins,
      aboveThreshold: p.aboveThreshold,
      eligible: p.aboveThreshold && p.fptpWins >= 1,
    }));

  return {
    totalVotes,
    totalSeats: TOTAL_PR_SEATS,
    thresholdPercent: 3,
    thresholdVotes: Math.round(thresholdVotes),
    method: "sainte-lague-odd-divisors",
    eligibilityRule: "minimum-3-percent-pr-and-1-fptp-seat",
    parties,
  };
}

export async function GET() {
  try {
    await ensureSchema();

    // 1. Try Redis cache
    const cached = await cacheGet<unknown>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30", "X-Source": "redis" },
      });
    }

    // 2. DB snapshot first, and call EC at most once per day for PR votes.
    const snapshotRows = await query<{ meta_value: string }>(
      "SELECT meta_value FROM election_meta WHERE meta_key = 'pr_party_results' LIMIT 1"
    );

    let snapshot: StoredPRSnapshot = {};
    if (snapshotRows.length > 0 && snapshotRows[0]?.meta_value) {
      try {
        snapshot = JSON.parse(snapshotRows[0].meta_value) as StoredPRSnapshot;
      } catch {
        snapshot = {};
      }
    }

    const now = Date.now();
    const fetchedAt = snapshot.fetchedAt ? new Date(snapshot.fetchedAt).getTime() : 0;
    const attemptedAt = snapshot.attemptedAt ? new Date(snapshot.attemptedAt).getTime() : 0;
    const hasFresh = fetchedAt > 0 && now - fetchedAt < REFRESH_INTERVAL_MS;

    if (hasFresh && snapshot.result) {
      const currentResult = snapshot.result as {
        parties?: Array<{ symbolId?: number; nameNp?: string; votes?: number; seats?: number; aboveThreshold?: boolean }>;
      };
      const totalAllocated = (currentResult.parties ?? []).reduce((s, p) => s + (Number(p.seats) || 0), 0);
      const hasEligibleVotes = (currentResult.parties ?? []).some((p) => Number(p.votes) > 0 && p.aboveThreshold === true);

      if (totalAllocated === 0 && hasEligibleVotes) {
        const rawFromSnapshot: ECPRPartyResult[] = (currentResult.parties ?? [])
          .filter((p) => Number(p.symbolId) > 0)
          .map((p) => ({
            SymbolID: Number(p.symbolId),
            PoliticalPartyName: String(p.nameNp || ""),
            TotalVoteReceived: Number(p.votes) || 0,
          }));

        if (rawFromSnapshot.length > 0) {
          const repaired = await buildPRResult(rawFromSnapshot);
          const repairedSnapshot: StoredPRSnapshot = {
            ...snapshot,
            result: repaired,
          };
          await execute(
            `INSERT INTO election_meta (meta_key, meta_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
            ["pr_party_results", JSON.stringify(repairedSnapshot)]
          );
          await cacheSet(CACHE_KEY, repaired, CACHE_TTL);
          return NextResponse.json(repaired, {
            headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600", "X-Source": "db-pr-snapshot-repaired" },
          });
        }
      }

      await cacheSet(CACHE_KEY, snapshot.result, CACHE_TTL);
      return NextResponse.json(snapshot.result, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600", "X-Source": "db-pr-snapshot" },
      });
    }

    const canAttemptEC = attemptedAt === 0 || now - attemptedAt >= REFRESH_INTERVAL_MS;

    if (canAttemptEC) {
      try {
        const raw = await fetchECPRPartyResults();
        const result = await buildPRResult(raw as ECPRPartyResult[]);

        const nextSnapshot: StoredPRSnapshot = {
          attemptedAt: new Date(now).toISOString(),
          fetchedAt: new Date(now).toISOString(),
          result,
        };

        await execute(
          `INSERT INTO election_meta (meta_key, meta_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
          ["pr_party_results", JSON.stringify(nextSnapshot)]
        );

        await cacheSet(CACHE_KEY, result, CACHE_TTL);
        return NextResponse.json(result, {
          headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600", "X-Source": "ec-api-daily" },
        });
      } catch (err) {
        const fallbackSnapshot: StoredPRSnapshot = {
          ...snapshot,
          attemptedAt: new Date(now).toISOString(),
        };
        await execute(
          `INSERT INTO election_meta (meta_key, meta_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
          ["pr_party_results", JSON.stringify(fallbackSnapshot)]
        );
        console.warn("[pr-results] Daily EC fetch failed, serving snapshot if available:", (err as Error).message);
      }
    }

    if (snapshot.result) {
      await cacheSet(CACHE_KEY, snapshot.result, CACHE_TTL);
      return NextResponse.json(snapshot.result, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400", "X-Source": "db-pr-stale" },
      });
    }

    return NextResponse.json(
      { totalVotes: 0, totalSeats: TOTAL_PR_SEATS, parties: [], message: "PR data snapshot unavailable" },
      { status: 503 }
    );
  } catch (err) {
    console.error("[pr-results] Error:", (err as Error).message);
    return NextResponse.json(
      { totalVotes: 0, totalSeats: TOTAL_PR_SEATS, parties: [] },
      { status: 500 }
    );
  }
}
