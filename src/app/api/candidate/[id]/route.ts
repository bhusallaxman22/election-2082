import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";
import { fetchECConstituencyResults, getPartyMeta } from "@/lib/ec-api";
import { ENABLE_RUNTIME_EC_FALLBACK } from "@/lib/results-mode";

export const dynamic = "force-dynamic";

interface ConstituencyRow {
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

interface CandidatePayload {
  id: string;
  name: string;
  gender?: string | null;
  age?: number | null;
  dob?: string | null;
  qualification?: string | null;
  address?: string | null;
  photo?: string;
  partyShortName: string;
  partyFullName?: string | null;
  partyColor: string;
  symbolName?: string | null;
  symbolId?: number | null;
  votes: number;
  status: string;
  rank?: string | number | null;
  remarks?: string | null;
  margin?: number | null;
  castedVote?: number | null;
  totalVoters?: number | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Candidate ID required" },
      { status: 400 }
    );
  }

  try {
    await ensureSchema();

    const rows = await query<ConstituencyRow>(
      "SELECT * FROM constituency_results WHERE JSON_CONTAINS(candidates_json, JSON_OBJECT('id', ?), '$')",
      [id]
    );

    let constituency = rows[0] || null;
    let rawCandidates: Record<string, unknown>[] = [];
    let candidate: Record<string, unknown> | null = null;

    if (!constituency) {
      const allRows = await query<ConstituencyRow>("SELECT * FROM constituency_results");
      for (const row of allRows) {
        try {
          const parsed =
            typeof row.candidates_json === "string"
              ? JSON.parse(row.candidates_json)
              : row.candidates_json;
          const match = (parsed || []).find(
            (entry: { id?: string | number }) => String(entry?.id) === String(id)
          );
          if (match) {
            constituency = row;
            rawCandidates = parsed || [];
            candidate = match;
            break;
          }
        } catch {
          // skip malformed rows
        }
      }
    } else {
      rawCandidates =
        typeof constituency.candidates_json === "string"
          ? JSON.parse(constituency.candidates_json)
          : constituency.candidates_json;
      candidate =
        (rawCandidates || []).find(
          (entry: { id?: string | number }) => String(entry?.id) === String(id)
        ) || null;
    }

    if (!constituency || !candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const normalizedDbCandidates = normalizeDbCandidates(rawCandidates || []);
    const seatLooksStale =
      constituency.total_votes === 0 ||
      normalizedDbCandidates.every((entry) => entry.votes === 0) ||
      (candidate && Number(candidate.votes || 0) === 0 && normalizedDbCandidates.some((entry) => entry.id === String(id)));

    const effectiveCandidates = seatLooksStale && ENABLE_RUNTIME_EC_FALLBACK
      ? await hydrateCandidatesFromEC(constituency, normalizedDbCandidates)
      : normalizedDbCandidates;

    const effectiveCandidate =
      effectiveCandidates.find((entry) => entry.id === String(id)) || null;

    if (!effectiveCandidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return buildResponse(effectiveCandidate, effectiveCandidates, constituency);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to fetch candidate",
      },
      { status: 500 }
    );
  }
}

function normalizeDbCandidates(rawCandidates: Record<string, unknown>[]): CandidatePayload[] {
  return (rawCandidates || []).map((candidate) => ({
    id: String(candidate.id || ""),
    name: String(candidate.name || ""),
    gender: (candidate.gender as string | null) ?? null,
    age: Number(candidate.age || 0) || null,
    dob: (candidate.dob as string | null) ?? null,
    qualification: (candidate.qualification as string | null) ?? null,
    address: (candidate.address as string | null) ?? null,
    photo:
      String(candidate.photo || "") || `/api/candidate-image/${String(candidate.id || "")}`,
    partyShortName: String(candidate.partyShortName || ""),
    partyFullName: (candidate.partyFullName as string | null) ?? null,
    partyColor: String(candidate.partyColor || "#94a3b8"),
    symbolName: (candidate.symbolName as string | null) ?? null,
    symbolId: Number(candidate.symbolId || 0) || null,
    votes: Number(candidate.votes || 0),
    status: String(candidate.status || "pending"),
    rank: (candidate.rank as string | number | null) ?? null,
    remarks: (candidate.remarks as string | null) ?? null,
    margin:
      typeof candidate.margin === "number"
        ? candidate.margin
        : Number(candidate.margin || 0) || null,
    castedVote: Number(candidate.castedVote || 0) || null,
    totalVoters: Number(candidate.totalVoters || 0) || null,
  }));
}

async function hydrateCandidatesFromEC(
  constituency: ConstituencyRow,
  fallbackCandidates: CandidatePayload[]
): Promise<CandidatePayload[]> {
  try {
    const live = await fetchECConstituencyResults(
      constituency.district_id,
      constituency.const_number
    );

    const sorted = [...live].sort(
      (a, b) => Number(b.TotalVoteReceived || 0) - Number(a.TotalVoteReceived || 0)
    );

    return sorted.map((candidate, index) => {
      const party = getPartyMeta(
        Number(candidate.SymbolID || 0),
        candidate.PoliticalPartyName
      );
      return {
        id: String(candidate.CandidateID),
        name: candidate.CandidateName,
        gender: candidate.Gender || null,
        age: Number(candidate.Age || 0) || null,
        dob: candidate.DOB || null,
        qualification: candidate.QUALIFICATION || null,
        address: candidate.ADDRESS || null,
        photo: `/api/candidate-image/${candidate.CandidateID}`,
        partyShortName: party.shortName,
        partyFullName: candidate.PoliticalPartyName || null,
        partyColor: party.color,
        symbolName: candidate.SymbolName || null,
        symbolId: Number(candidate.SymbolID || 0) || null,
        votes: Number(candidate.TotalVoteReceived || 0),
        status:
          candidate.Remarks === "Elected"
            ? "won"
            : index === 0 && sorted.length > 0
              ? "leading"
              : "trailing",
        rank: candidate.Rank || String(index + 1),
        remarks: candidate.Remarks || null,
        margin:
          index === 0 && sorted.length > 1
            ? Math.max(
                Number(candidate.TotalVoteReceived || 0) -
                  Number(sorted[1]?.TotalVoteReceived || 0),
                0
              )
            : null,
        castedVote: Number(candidate.CastedVote || 0) || null,
        totalVoters: Number(candidate.TotalVoters || 0) || null,
      };
    });
  } catch {
    return fallbackCandidates;
  }
}

function buildResponse(
  candidate: CandidatePayload,
  candidates: CandidatePayload[],
  constituency: ConstituencyRow
) {
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const position = sorted.findIndex((entry) => entry.id === candidate.id) + 1;
  const totalVotes = Math.max(
    Number(constituency.total_votes || 0),
    sorted.reduce((sum, entry) => sum + Number(entry.votes || 0), 0)
  );
  const constituencyStatus =
    sorted.some((entry) => entry.status === "won")
      ? "won"
      : totalVotes > 0
        ? "leading"
        : constituency.status;
  const voteShare = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;

  return NextResponse.json({
    success: true,
    data: {
      id: candidate.id,
      name: candidate.name,
      gender: candidate.gender || null,
      age: candidate.age || null,
      dob: candidate.dob || null,
      qualification: candidate.qualification || null,
      address: candidate.address || null,
      photo: candidate.photo || `/api/candidate-image/${candidate.id}`,
      partyShortName: candidate.partyShortName,
      partyFullName: candidate.partyFullName || candidate.partyShortName,
      partyColor: candidate.partyColor,
      symbolName: candidate.symbolName || null,
      symbolId: candidate.symbolId || null,
      votes: candidate.votes,
      status: candidate.status,
      rank: candidate.rank || String(position),
      remarks: candidate.remarks || null,
      margin: candidate.margin ?? null,
      castedVote: candidate.castedVote || null,
      totalVoters: candidate.totalVoters || null,
      position,
      totalCandidates: sorted.length,
      voteShare: Number(voteShare.toFixed(1)),
      constituency: {
        name: constituency.constituency_name,
        slug: constituency.constituency_slug,
        districtId: constituency.district_id,
        constNumber: constituency.const_number,
        districtName: constituency.district_name,
        provinceId: constituency.province_id,
        provinceName: constituency.province_name,
        totalVotes,
        status: constituencyStatus,
      },
      competitors: sorted.slice(0, 5).map((entry) => ({
        id: entry.id,
        name: entry.name,
        partyShortName: entry.partyShortName,
        partyColor: entry.partyColor,
        votes: entry.votes,
        status: entry.status,
        photo: entry.photo || `/api/candidate-image/${entry.id}`,
      })),
    },
  });
}
