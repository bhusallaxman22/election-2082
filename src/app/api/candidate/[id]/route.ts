import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: "Candidate ID required" }, { status: 400 });
  }

  try {
    await ensureSchema();

    // Search all constituency results for this candidate
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
      "SELECT * FROM constituency_results WHERE JSON_CONTAINS(candidates_json, JSON_OBJECT('id', ?), '$')",
      [id]
    );

    if (rows.length === 0) {
      // Fallback: brute-force search through all results
      const allRows = await query<{
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
      }>("SELECT * FROM constituency_results");

      for (const r of allRows) {
        try {
          const candidates = typeof r.candidates_json === "string" ? JSON.parse(r.candidates_json) : r.candidates_json;
          const match = (candidates || []).find((c: { id: string }) => String(c.id) === String(id));
          if (match) {
            return buildResponse(match, r);
          }
        } catch { /* skip */ }
      }

      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    const r = rows[0];
    const candidates = typeof r.candidates_json === "string" ? JSON.parse(r.candidates_json) : r.candidates_json;
    const candidate = (candidates || []).find((c: { id: string }) => String(c.id) === String(id));

    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return buildResponse(candidate, r);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}

function buildResponse(
  candidate: Record<string, unknown>,
  constituency: {
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
  }
) {
  // Parse all candidates to find rank and competitor info
  let allCandidates: Record<string, unknown>[] = [];
  try {
    allCandidates = typeof constituency.candidates_json === "string"
      ? JSON.parse(constituency.candidates_json)
      : constituency.candidates_json;
  } catch { /* */ }

  const sorted = (allCandidates || []).sort(
    (a, b) => (b.votes as number) - (a.votes as number)
  );
  const position = sorted.findIndex((c) => String(c.id) === String(candidate.id)) + 1;
  const totalCandidates = sorted.length;
  const voteShare = constituency.total_votes > 0
    ? ((candidate.votes as number) / constituency.total_votes * 100).toFixed(1)
    : "0";

  return NextResponse.json({
    success: true,
    data: {
      id: String(candidate.id),
      name: candidate.name,
      gender: candidate.gender || null,
      age: candidate.age || null,
      dob: candidate.dob || null,
      qualification: candidate.qualification || null,
      address: candidate.address || null,
      photo: (candidate.photo as string) || `/api/candidate-image/${candidate.id}`,
      partyShortName: candidate.partyShortName,
      partyFullName: candidate.partyFullName,
      partyColor: candidate.partyColor,
      symbolName: candidate.symbolName,
      symbolId: candidate.symbolId,
      votes: candidate.votes,
      status: candidate.status,
      rank: candidate.rank,
      remarks: candidate.remarks,
      margin: candidate.margin,
      castedVote: candidate.castedVote || null,
      totalVoters: candidate.totalVoters || null,
      position,
      totalCandidates,
      voteShare: Number(voteShare),
      constituency: {
        name: constituency.constituency_name,
        slug: constituency.constituency_slug,
        districtId: constituency.district_id,
        constNumber: constituency.const_number,
        districtName: constituency.district_name,
        provinceId: constituency.province_id,
        provinceName: constituency.province_name,
        totalVotes: constituency.total_votes,
        status: constituency.status,
      },
      competitors: sorted.slice(0, 5).map((c) => ({
        id: String(c.id),
        name: c.name,
        partyShortName: c.partyShortName,
        partyColor: c.partyColor,
        votes: c.votes,
        status: c.status,
        photo: (c.photo as string) || `/api/candidate-image/${c.id}`,
      })),
    },
  });
}
