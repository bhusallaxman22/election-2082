import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Try Redis cache (pre-warmed by sync)
    const cached = await cacheGet<unknown[]>("parties");
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        meta: { total: cached.length, timestamp: new Date().toISOString(), source: "redis" },
      });
    }

    // 2. Fallback to MariaDB
    await ensureSchema();
    const rows = await query<{
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

    const parties = rows.map((p) => ({
      id: p.party_id,
      name: p.party_nickname ?? p.party_slug,
      nameNp: p.party_name,
      wins: p.winner_count,
      leads: p.leading_count,
      totalSeats: p.total_seat,
      color: p.party_color,
      logo: p.party_image,
    }));

    return NextResponse.json({
      success: true,
      data: parties,
      meta: { total: parties.length, timestamp: new Date().toISOString(), source: "db" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: [], meta: { timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
}
