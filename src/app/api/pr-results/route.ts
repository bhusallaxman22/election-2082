import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { fetchECPRPartyResults, getPartyMeta } from "@/lib/ec-api";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const TOTAL_PR_SEATS = 110;
const CACHE_KEY = "pr_party_results_v2";
const CACHE_TTL = 120; // 2 minutes

function sainteLagueDivisor(currentSeats: number): number {
  if (currentSeats <= 0) return 1;
  return currentSeats * 2 + 1; // 3,5,7...
}

export async function GET() {
  try {
    // 1. Try Redis cache
    const cached = await cacheGet<unknown>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30", "X-Source": "redis" },
      });
    }

    // 2. Fetch from EC API
    const raw = await fetchECPRPartyResults();
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

    const result = {
      totalVotes,
      totalSeats: TOTAL_PR_SEATS,
      thresholdPercent: 3,
      thresholdVotes: Math.round(thresholdVotes),
      method: "sainte-lague-odd-divisors",
      eligibilityRule: "minimum-3-percent-pr-and-1-fptp-seat",
      parties,
    };
    await cacheSet(CACHE_KEY, result, CACHE_TTL);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30", "X-Source": "ec-api" },
    });
  } catch (err) {
    console.error("[pr-results] Error:", (err as Error).message);
    return NextResponse.json(
      { totalVotes: 0, totalSeats: TOTAL_PR_SEATS, parties: [] },
      { status: 500 }
    );
  }
}
