import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Try Redis (pre-warmed by sync)
    const cached = await cacheGet<unknown>("election_raw");
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800", "X-Source": "redis" },
      });
    }

    // 2. Fallback to MariaDB
    await ensureSchema();
    const rows = await query<{ meta_value: string }>(
      "SELECT meta_value FROM election_meta WHERE meta_key = 'election_raw'"
    );
    if (rows.length > 0 && rows[0].meta_value) {
      const data = JSON.parse(rows[0].meta_value);
      const partyResults = Array.isArray(data?.data?.party_results) ? data.data.party_results : [];
      const hasVotes = partyResults.some((p: Record<string, unknown>) => Number(p.winner_count ?? 0) > 0 || Number(p.leading_count ?? 0) > 0);

      if (partyResults.length > 0 && hasVotes) {
        await cacheSet("election_raw", data, 300);
        return NextResponse.json(data, {
          headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800", "X-Source": "db" },
        });
      }
    }

    // 3. Final fallback: compose election_raw-like shape from party_results table.
    const partyRows = await query<{
      party_id: number;
      party_name: string;
      party_nickname: string;
      party_slug: string;
      party_image: string;
      party_color: string;
      leading_count: number;
      winner_count: number;
      total_seat: number;
    }>("SELECT * FROM party_results ORDER BY (winner_count + leading_count) DESC, winner_count DESC");

    const fallback = {
      status: 200,
      message: "OK",
      data: {
        party_results: partyRows.map((p) => ({
          party_id: p.party_id,
          party_name: p.party_name,
          party_nickname: p.party_nickname,
          party_slug: p.party_slug,
          party_image: p.party_image,
          party_color: p.party_color,
          leading_count: p.leading_count,
          winner_count: p.winner_count,
          total_seat: p.total_seat,
          samanupatik: 0,
        })),
      },
    };

    await cacheSet("election_raw", fallback, 300);
    return NextResponse.json(fallback, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800", "X-Source": "db-party-results" },
    });
  } catch {
    return NextResponse.json(
      { status: 500, message: "Failed to fetch election data", data: { party_results: [] } },
      { status: 500 }
    );
  }
}
