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
        headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30", "X-Source": "redis" },
      });
    }

    // 2. Fallback to MariaDB
    await ensureSchema();
    const rows = await query<{ meta_value: string }>(
      "SELECT meta_value FROM election_meta WHERE meta_key = 'election_raw'"
    );
    if (rows.length > 0 && rows[0].meta_value) {
      const data = JSON.parse(rows[0].meta_value);
      await cacheSet("election_raw", data, 300);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30", "X-Source": "db" },
      });
    }

    // No data yet — sync hasn't run
    return NextResponse.json(
      { status: 200, message: "Data not yet available", data: { party_results: [] } },
    );
  } catch {
    return NextResponse.json(
      { status: 500, message: "Failed to fetch election data", data: { party_results: [] } },
      { status: 500 }
    );
  }
}
