import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

// GET /api/constituency?district=26&const=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const districtId = Number(searchParams.get("district"));
  const constNum = Number(searchParams.get("const"));

  if (!districtId || !constNum) {
    return NextResponse.json(
      { success: false, error: "district and const params required" },
      { status: 400 }
    );
  }

  const cacheKey = `constituency_${districtId}_${constNum}`;

  try {
    // 1. Try Redis (pre-warmed by sync)
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, meta: { timestamp: new Date().toISOString(), source: "redis" } });
    }

    // 2. Fallback to MariaDB
    await ensureSchema();
    const rows = await query<{
      district_id: number;
      const_number: number;
      constituency_name: string;
      constituency_slug: string;
      province_id: number;
      province_name: string;
      total_votes: number;
      status: string;
      candidates_json: string;
    }>(
      "SELECT * FROM constituency_results WHERE district_id = ? AND const_number = ?",
      [districtId, constNum]
    );

    if (rows.length > 0) {
      const r = rows[0];
      let candidates: Record<string, unknown>[] = [];
      try {
        const raw = typeof r.candidates_json === "string" ? JSON.parse(r.candidates_json) : r.candidates_json;
        candidates = raw || [];
      } catch { /* */ }

      const hasWinner = r.status === "won";
      const hasVotes = r.total_votes > 0;

      const data = {
        constituency: r.constituency_name,
        constituencySlug: r.constituency_slug,
        districtId: r.district_id,
        constNumber: r.const_number,
        province: r.province_name,
        provinceId: r.province_id,
        candidates,
        totalVotes: r.total_votes,
        countingStatus: hasWinner ? "Result declared" : hasVotes ? "Counting in progress" : "Counting not started",
        totalCandidates: candidates.length,
      };

      return NextResponse.json({ success: true, data, meta: { timestamp: new Date().toISOString(), source: "db" } });
    }

    return NextResponse.json({ success: true, data: null, meta: { timestamp: new Date().toISOString(), source: "empty" } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch constituency data" },
      { status: 500 }
    );
  }
}
