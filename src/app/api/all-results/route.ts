import { NextResponse } from "next/server";
import { cacheGet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export interface SeatResult {
  districtId: number;
  constNumber: number;
  districtName: string;
  constituency: string;
  constituencySlug: string;
  provinceId: number;
  provinceName: string;
  partyShortName: string;
  partyColor: string;
  leaderName: string;
  leaderVotes: number;
  runnerUpName: string;
  runnerUpVotes: number;
  margin: number;
  totalVotes: number;
  status: "won" | "leading" | "counting" | "pending";
  candidates: {
    id: string;
    name: string;
    partyShortName: string;
    partyColor: string;
    votes: number;
    status: "won" | "leading" | "trailing" | "pending";
    margin?: number;
  }[];
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Try Redis cache (pre-warmed by sync)
    const cached = await cacheGet<SeatResult[]>("all_results");
    if (cached) {
      return NextResponse.json({ success: true, data: cached, meta: { total: cached.length, timestamp: new Date().toISOString(), source: "redis" } });
    }

    // 2. Fallback to MariaDB
    await ensureSchema();
    const rows = await query<{
      district_id: number;
      const_number: number;
      district_name: string;
      constituency_name: string;
      constituency_slug: string;
      province_id: number;
      province_name: string;
      leader_party: string;
      leader_party_color: string;
      leader_name: string;
      leader_votes: number;
      runner_up_name: string;
      runner_up_votes: number;
      margin: number;
      total_votes: number;
      status: "won" | "leading" | "counting" | "pending";
      candidates_json: string;
    }>("SELECT * FROM constituency_results ORDER BY province_id, district_id, const_number");

    const results: SeatResult[] = rows.map((r) => {
      let candidates: SeatResult["candidates"] = [];
      try {
        const raw = typeof r.candidates_json === "string" ? JSON.parse(r.candidates_json) : r.candidates_json;
        candidates = (raw || []).slice(0, 5).map((c: Record<string, unknown>) => ({
          id: String(c.id),
          name: c.name as string,
          partyShortName: c.partyShortName as string,
          partyColor: c.partyColor as string,
          votes: c.votes as number,
          status: c.status as string,
          margin: c.margin as number | undefined,
        }));
      } catch { /* */ }

      return {
        districtId: r.district_id,
        constNumber: r.const_number,
        districtName: r.district_name,
        constituency: r.constituency_name,
        constituencySlug: r.constituency_slug,
        provinceId: r.province_id,
        provinceName: r.province_name,
        partyShortName: r.leader_party,
        partyColor: r.leader_party_color,
        leaderName: r.leader_name,
        leaderVotes: r.leader_votes,
        runnerUpName: r.runner_up_name,
        runnerUpVotes: r.runner_up_votes,
        margin: r.margin,
        totalVotes: r.total_votes,
        status: r.status,
        candidates,
      };
    });

    return NextResponse.json({
      success: true,
      data: results,
      meta: { total: results.length, timestamp: new Date().toISOString(), source: "db" },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch", data: [] },
      { status: 500 }
    );
  }
}
