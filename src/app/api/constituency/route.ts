import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";
import { repairSeatModelFromPartyWins, type SeatLike } from "@/lib/seat-repair";
import { fetchECConstituencyResults, getPartyMeta } from "@/lib/ec-api";
import { fetchLiveSeatResult } from "@/lib/seat-results";
import { ENABLE_RUNTIME_EC_FALLBACK } from "@/lib/results-mode";

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
      const maybe = cached as {
        totalVotes?: number;
        countingStatus?: string;
        candidates?: { votes?: number }[];
      };
      const cachedVoteSum = Array.isArray(maybe.candidates)
        ? maybe.candidates.reduce((sum, candidate) => sum + Number(candidate?.votes || 0), 0)
        : 0;
      const stale =
        (maybe.totalVotes ?? 0) === 0 ||
        (((maybe.countingStatus ?? "") === "Result declared" ||
          (maybe.countingStatus ?? "") === "Counting in progress") &&
          cachedVoteSum === 0);
      if (!stale) {
        return NextResponse.json({ success: true, data: cached, meta: { timestamp: new Date().toISOString(), source: "redis" } });
      }
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

      let status = r.status;
      let totalVotes = r.total_votes;
      const isZeroed = totalVotes === 0 || candidates.every((candidate) => Number(candidate?.votes || 0) === 0);

      // If table is stale, hydrate from the live EC constituency feed first.
      if (isZeroed && ENABLE_RUNTIME_EC_FALLBACK) {
        const liveSeat = await fetchLiveSeatResult({
          districtId,
          constNumber: constNum,
          districtName: r.district_name,
          constituency: r.constituency_name,
          constituencySlug: r.constituency_slug,
          provinceId: r.province_id,
          provinceName: r.province_name,
        });

        if (liveSeat) {
          candidates = liveSeat.candidates as unknown as Record<string, unknown>[];
          status = liveSeat.status;
          totalVotes = liveSeat.totalVotes;
        }
      }

      if (ENABLE_RUNTIME_EC_FALLBACK && isZeroed && totalVotes === 0) {
        try {
          const live = await fetchECConstituencyResults(districtId, constNum);
          const sorted = [...live].sort((a, b) => b.TotalVoteReceived - a.TotalVoteReceived);
          totalVotes = sorted.reduce((sum, candidate) => sum + Number(candidate.TotalVoteReceived || 0), 0);
          status = sorted.some((candidate) => candidate.Remarks === "Elected")
            ? "won"
            : totalVotes > 0
              ? "leading"
              : "pending";
          candidates = sorted.map((candidate, idx) => {
            const party = getPartyMeta(Number(candidate.SymbolID || 0), candidate.PoliticalPartyName);
            return {
              id: String(candidate.CandidateID),
              name: candidate.CandidateName,
              partyShortName: party.shortName,
              partyColor: party.color,
              votes: Number(candidate.TotalVoteReceived || 0),
              status:
                candidate.Remarks === "Elected"
                  ? "won"
                  : idx === 0 && totalVotes > 0
                    ? "leading"
                    : totalVotes > 0
                      ? "trailing"
                      : "pending",
              margin:
                idx === 0 && sorted.length > 1
                  ? Number(candidate.TotalVoteReceived || 0) -
                    Number(sorted[1].TotalVoteReceived || 0)
                  : undefined,
              photo: `/api/candidate-image/${candidate.CandidateID}`,
            };
          }) as unknown as Record<string, unknown>[];
        } catch {
          // If live hydration fails, fall back to party-total repair.
        }
      }

      // Final fallback: repair from party totals if live EC hydration was unavailable.
      if (totalVotes === 0) {
        const allRows = await query<{
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
          status: string;
          candidates_json: string;
        }>("SELECT * FROM constituency_results ORDER BY province_id, district_id, const_number");

        const seatLike: SeatLike[] = allRows.map((x) => {
          let cands: SeatLike["candidates"] = [];
          try {
            const raw = typeof x.candidates_json === "string" ? JSON.parse(x.candidates_json) : x.candidates_json;
            cands = (raw || []).map((c: Record<string, unknown>) => ({
              id: String(c.id),
              name: String(c.name || ""),
              partyShortName: String(c.partyShortName || ""),
              partyColor: String(c.partyColor || "#94a3b8"),
              votes: Number(c.votes || 0),
              status: (c.status as "won" | "leading" | "trailing" | "pending") || "pending",
              margin: c.margin as number | undefined,
              photo: String(c.photo || `/api/candidate-image/${String(c.id || "")}`),
            }));
          } catch {
            cands = [];
          }

          return {
            districtId: x.district_id,
            constNumber: x.const_number,
            districtName: x.district_name,
            constituency: x.constituency_name,
            constituencySlug: x.constituency_slug,
            provinceId: x.province_id,
            provinceName: x.province_name,
            partyShortName: x.leader_party,
            partyColor: x.leader_party_color,
            leaderName: x.leader_name,
            leaderVotes: x.leader_votes,
            runnerUpName: x.runner_up_name,
            runnerUpVotes: x.runner_up_votes,
            margin: x.margin,
            totalVotes: x.total_votes,
            status: (x.status as "won" | "leading" | "counting" | "pending") || "pending",
            candidates: cands,
          };
        });

        const partyWinRows = await query<{ party_slug: string; winner_count: number }>(
          "SELECT party_slug, winner_count FROM party_results"
        );
        const repaired = repairSeatModelFromPartyWins(seatLike, partyWinRows);
        const seat = repaired.seats.find((s) => s.districtId === districtId && s.constNumber === constNum);
        if (seat) {
          candidates = seat.candidates as unknown as Record<string, unknown>[];
          status = seat.status;
          totalVotes = seat.totalVotes;
        }
      }

      const hasWinner = status === "won";
      const hasVotes = totalVotes > 0;

      const data = {
        constituency: r.constituency_name,
        constituencySlug: r.constituency_slug,
        districtId: r.district_id,
        constNumber: r.const_number,
        province: r.province_name,
        provinceId: r.province_id,
        candidates,
        totalVotes,
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
