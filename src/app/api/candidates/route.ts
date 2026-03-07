import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

// High-profile constituencies to show on the homepage
const POPULAR_CONSTITUENCIES = [
  { districtId: 4, constNum: 5 },
  { districtId: 35, constNum: 2 },
  { districtId: 26, constNum: 1 },
  { districtId: 26, constNum: 3 },
  { districtId: 27, constNum: 2 },
  { districtId: 28, constNum: 3 },
  { districtId: 40, constNum: 1 },
  { districtId: 36, constNum: 1 },
  { districtId: 9, constNum: 1 },
  { districtId: 26, constNum: 4 },
  { districtId: 26, constNum: 5 },
  { districtId: 39, constNum: 2 },
];

interface MappedConstituency {
  constituency: string;
  constituencySlug: string;
  districtId: number;
  constNumber: number;
  province: string;
  provinceId: number;
  candidates: {
    id: string;
    name: string;
    partyShortName: string;
    partyColor: string;
    votes: number;
    status: "won" | "leading" | "trailing" | "pending";
    margin?: number;
    photo: string;
  }[];
  totalVotes: number;
  countingStatus: string;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get("province");

  try {
    // 1. Try Redis cache (pre-warmed by sync)
    let data: MappedConstituency[] | null = await cacheGet<MappedConstituency[]>("popular_candidates");

    if (!data) {
      // 2. Fallback to MariaDB
      await ensureSchema();
      const placeholders = POPULAR_CONSTITUENCIES.map(() => "(?, ?)").join(", ");
      const params = POPULAR_CONSTITUENCIES.flatMap((c) => [c.districtId, c.constNum]);

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
        `SELECT * FROM constituency_results WHERE (district_id, const_number) IN (${placeholders})`,
        params
      );

      data = rows.map((r) => {
        let candidates: MappedConstituency["candidates"] = [];
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
            photo: (c.photo as string) || `/api/candidate-image/${c.id}`,
          }));
        } catch { /* */ }

        const hasWinner = r.status === "won";
        const hasVotes = r.total_votes > 0;

        return {
          constituency: r.constituency_name,
          constituencySlug: r.constituency_slug,
          districtId: r.district_id,
          constNumber: r.const_number,
          province: r.province_name,
          provinceId: r.province_id,
          candidates,
          totalVotes: r.total_votes,
          countingStatus: hasWinner
            ? "Result declared"
            : hasVotes
              ? "Counting in progress"
              : "Counting not started",
        };
      });
    }

    if (province) {
      const pNum = Number(province);
      data = data.filter(
        (c) => c.provinceId === pNum || c.province.toLowerCase().includes(province.toLowerCase())
      );
    }

    return NextResponse.json({
      success: true,
      data,
      meta: { total: data.length, timestamp: new Date().toISOString(), source: "redis" },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch", data: [] },
      { status: 500 }
    );
  }
}
