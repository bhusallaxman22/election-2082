import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/migrate";
import { query } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import {
  fetchLiveSeatResult,
  isSeatBreakdownStale,
  type SeatResult,
} from "@/lib/seat-results";
import { ENABLE_RUNTIME_EC_FALLBACK } from "@/lib/results-mode";

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

interface ConstituencyRow {
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
}

export const dynamic = "force-dynamic";

function mapDbRowToSeat(row: ConstituencyRow): SeatResult {
  let candidates: SeatResult["candidates"] = [];

  try {
    const raw =
      typeof row.candidates_json === "string"
        ? JSON.parse(row.candidates_json)
        : row.candidates_json;
    candidates = (raw || []).map((candidate: Record<string, unknown>) => ({
      id: String(candidate.id || ""),
      name: String(candidate.name || ""),
      partyShortName: String(candidate.partyShortName || ""),
      partyColor: String(candidate.partyColor || "#94a3b8"),
      votes: Number(candidate.votes || 0),
      status:
        ((candidate.status as
          | "won"
          | "leading"
          | "trailing"
          | "pending") || "pending"),
      margin:
        typeof candidate.margin === "number"
          ? candidate.margin
          : Number(candidate.margin || 0) || undefined,
      photo:
        String(candidate.photo || "") || `/api/candidate-image/${String(candidate.id || "")}`,
    }));
  } catch {
    candidates = [];
  }

  return {
    districtId: row.district_id,
    constNumber: row.const_number,
    districtName: row.district_name,
    constituency: row.constituency_name,
    constituencySlug: row.constituency_slug,
    provinceId: row.province_id,
    provinceName: row.province_name,
    partyShortName: row.leader_party,
    partyColor: row.leader_party_color,
    leaderName: row.leader_name,
    leaderVotes: Number(row.leader_votes || 0),
    runnerUpName: row.runner_up_name,
    runnerUpVotes: Number(row.runner_up_votes || 0),
    margin: Number(row.margin || 0),
    totalVotes: Number(row.total_votes || 0),
    status: row.status,
    candidates,
  };
}

function mapSeatToHomepageCard(seat: SeatResult): MappedConstituency {
  const hasWinner = seat.status === "won" || seat.candidates.some((candidate) => candidate.status === "won");
  const hasVotes = seat.totalVotes > 0;

  return {
    constituency: seat.constituency,
    constituencySlug: seat.constituencySlug,
    districtId: seat.districtId,
    constNumber: seat.constNumber,
    province: seat.provinceName,
    provinceId: seat.provinceId,
    candidates: [...seat.candidates]
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 5),
    totalVotes: seat.totalVotes,
    countingStatus: hasWinner
      ? "Result declared"
      : hasVotes
        ? "Counting in progress"
        : "Counting not started",
  };
}

function isHomepageCandidateDataStale(items: MappedConstituency[]): boolean {
  if (!items.length) return true;

  return items.some((item) => {
    const nonZeroCandidates = item.candidates.filter(
      (candidate) => Number(candidate.votes || 0) > 0
    ).length;
    return (
      item.totalVotes === 0 ||
      (item.countingStatus === "Result declared" && nonZeroCandidates === 0) ||
      (item.totalVotes > 0 && nonZeroCandidates === 0)
    );
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get("province");

  try {
    let data = await cacheGet<MappedConstituency[]>("popular_candidates");
    if (!data || isHomepageCandidateDataStale(data)) {
      await ensureSchema();

      const placeholders = POPULAR_CONSTITUENCIES.map(() => "(?, ?)").join(", ");
      const rows = await query<ConstituencyRow>(
        `SELECT * FROM constituency_results WHERE (district_id, const_number) IN (${placeholders})`,
        POPULAR_CONSTITUENCIES.flatMap((seat) => [seat.districtId, seat.constNum])
      );

      const rowMap = new Map(
        rows.map((row) => [`${row.district_id}_${row.const_number}`, mapDbRowToSeat(row)])
      );

      const resolvedSeats: SeatResult[] = [];
      const batchSize = 1;

      for (let offset = 0; offset < POPULAR_CONSTITUENCIES.length; offset += batchSize) {
        const batch = POPULAR_CONSTITUENCIES.slice(offset, offset + batchSize);
        const results = await Promise.allSettled(
          batch.map(async ({ districtId, constNum }) => {
            const key = `${districtId}_${constNum}`;
            const dbSeat = rowMap.get(key);
            if (!ENABLE_RUNTIME_EC_FALLBACK) {
              return dbSeat || null;
            }

            const shouldUseDbSeat =
              dbSeat &&
              dbSeat.totalVotes > 0 &&
              (dbSeat.status === "won" || dbSeat.status === "leading" || dbSeat.status === "counting") &&
              !isSeatBreakdownStale(dbSeat);

            if (shouldUseDbSeat) {
              return dbSeat;
            }

            const liveSeat = await fetchLiveSeatResult({
              districtId,
              constNumber: constNum,
              districtName: dbSeat?.districtName,
              constituency: dbSeat?.constituency,
              constituencySlug: dbSeat?.constituencySlug,
              provinceId: dbSeat?.provinceId,
              provinceName: dbSeat?.provinceName,
            });

            return liveSeat || dbSeat || null;
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            resolvedSeats.push(result.value);
          }
        }

        if (ENABLE_RUNTIME_EC_FALLBACK && offset + batchSize < POPULAR_CONSTITUENCIES.length) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      data = resolvedSeats.map(mapSeatToHomepageCard);
      await cacheSet("popular_candidates", data, 120);
    }

    if (province) {
      const provinceFilter = province.toLowerCase();
      const provinceId = Number(province);
      data = data.filter(
        (item) =>
          item.provinceId === provinceId ||
          item.province.toLowerCase().includes(provinceFilter)
      );
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total: data.length,
        timestamp: new Date().toISOString(),
        source: ENABLE_RUNTIME_EC_FALLBACK ? "live-aware" : "db-first",
      },
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch", data: [] },
      { status: 500 }
    );
  }
}
