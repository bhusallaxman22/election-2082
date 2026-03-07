import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { fetchECPRPartyResults, getPartyMeta } from "@/lib/ec-api";

export const dynamic = "force-dynamic";

const TOTAL_PR_SEATS = 110;
const CACHE_KEY = "pr_party_results";
const CACHE_TTL = 120; // 2 minutes

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

    const parties = raw
      .filter((p) => p.TotalVoteReceived > 0)
      .sort((a, b) => b.TotalVoteReceived - a.TotalVoteReceived)
      .map((p) => {
        const meta = getPartyMeta(p.SymbolID, p.PoliticalPartyName);
        const votePercent = totalVotes > 0 ? (p.TotalVoteReceived / totalVotes) * 100 : 0;
        // PR seats allocated proportionally (simplified D'Hondt-like)
        const seats = totalVotes > 0 ? Math.round((p.TotalVoteReceived / totalVotes) * TOTAL_PR_SEATS) : 0;
        return {
          symbolId: p.SymbolID,
          partyName: meta.name,
          shortName: meta.shortName,
          nameNp: p.PoliticalPartyName,
          color: meta.color,
          votes: p.TotalVoteReceived,
          votePercent: Math.round(votePercent * 100) / 100,
          seats,
        };
      });

    const result = { totalVotes, totalSeats: TOTAL_PR_SEATS, parties };
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
