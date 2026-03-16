import { NextRequest, NextResponse } from "next/server";
import { proportionalResults2074, proportionalResults2079 } from "@/data/provinces";
import { loadSeatResults } from "@/lib/seat-results";

export const dynamic = "force-dynamic";

const PROVINCES: Record<number, { name: string; totalSeats: number }> = {
  1: { name: "Koshi", totalSeats: 28 },
  2: { name: "Madhesh", totalSeats: 32 },
  3: { name: "Bagmati", totalSeats: 33 },
  4: { name: "Gandaki", totalSeats: 18 },
  5: { name: "Lumbini", totalSeats: 26 },
  6: { name: "Karnali", totalSeats: 12 },
  7: { name: "Sudurpaschim", totalSeats: 16 },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "proportional") {
    const year = searchParams.get("year") || "2079";
    const data = year === "2074" ? proportionalResults2074 : proportionalResults2079;
    return NextResponse.json({ success: true, data });
  }

  try {
    const { seats, source } = await loadSeatResults();
    const partyMap = new Map<
      string,
      { color: string; wins: number; leads: number }
    >();
    const provinceMap = new Map<
      number,
      Map<string, { color: string; wins: number; leads: number }>
    >();

    let declared = 0;
    let counting = 0;

    for (const seat of seats) {
      const isWon = seat.status === "won";
      const isLead = seat.status === "leading" || seat.status === "counting";

      if (isWon) declared++;
      else if (isLead) counting++;

      if (!seat.partyShortName || (!isWon && !isLead)) continue;

      const partyEntry = partyMap.get(seat.partyShortName) || {
        color: seat.partyColor || "#94a3b8",
        wins: 0,
        leads: 0,
      };
      if (isWon) partyEntry.wins++;
      if (isLead) partyEntry.leads++;
      partyMap.set(seat.partyShortName, partyEntry);

      const provinceEntry =
        provinceMap.get(seat.provinceId) ||
        new Map<string, { color: string; wins: number; leads: number }>();
      const provinceParty = provinceEntry.get(seat.partyShortName) || {
        color: seat.partyColor || "#94a3b8",
        wins: 0,
        leads: 0,
      };
      if (isWon) provinceParty.wins++;
      if (isLead) provinceParty.leads++;
      provinceEntry.set(seat.partyShortName, provinceParty);
      provinceMap.set(seat.provinceId, provinceEntry);
    }

    const provinceWise = Object.entries(PROVINCES).map(([id, info]) => ({
      province: info.name,
      totalSeats: info.totalSeats,
      results: Array.from(provinceMap.get(Number(id))?.entries() || [])
        .map(([party, value]) => ({
          partyShortName: party,
          partyColor: value.color,
          wins: value.wins,
          leads: value.leads,
        }))
        .sort((a, b) => (b.wins + b.leads) - (a.wins + a.leads) || b.wins - a.wins),
    }));

    const data = {
      totalSeats: 165,
      declared,
      counting,
      remaining: Math.max(165 - declared - counting, 0),
      partyWise: Array.from(partyMap.entries())
        .map(([party, value]) => ({
          party,
          color: value.color,
          wins: value.wins,
          leads: value.leads,
          total: value.wins + value.leads,
        }))
        .sort((a, b) => b.total - a.total || b.wins - a.wins),
      provinceWise,
    };

    return NextResponse.json({
      success: true,
      data,
      meta: { timestamp: new Date().toISOString(), source },
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, meta: { timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
}
