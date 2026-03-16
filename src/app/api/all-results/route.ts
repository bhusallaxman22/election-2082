import { NextRequest, NextResponse } from "next/server";
import { hydrateSeatBreakdowns, loadSeatResults, type SeatResult } from "@/lib/seat-results";

export const dynamic = "force-dynamic";

function matchesSearch(seat: SeatResult, query: string): boolean {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return true;

  const seatMatch =
    seat.constituency.toLowerCase().includes(normalized) ||
    seat.constituencySlug.toLowerCase().includes(normalized) ||
    seat.districtName.toLowerCase().includes(normalized) ||
    seat.provinceName.toLowerCase().includes(normalized) ||
    seat.leaderName.toLowerCase().includes(normalized) ||
    seat.runnerUpName.toLowerCase().includes(normalized) ||
    seat.partyShortName.toLowerCase().includes(normalized);

  if (seatMatch) return true;

  return seat.candidates.some(
    (candidate) =>
      candidate.name.toLowerCase().includes(normalized) ||
      candidate.partyShortName.toLowerCase().includes(normalized)
  );
}

function filterSeats(seats: SeatResult[], request: NextRequest): SeatResult[] {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.toLowerCase().trim();
  const party = searchParams.get("party")?.toLowerCase().trim();
  const constituency = searchParams.get("constituency")?.toLowerCase().trim();
  const search = searchParams.get("search")?.trim() || "";
  const provinceId = Number(searchParams.get("provinceId") || 0);
  const districtId = Number(searchParams.get("districtId") || 0);

  return seats.filter((seat) => {
    if (status && seat.status.toLowerCase() !== status) return false;
    if (party && seat.partyShortName.toLowerCase() !== party) return false;
    if (constituency && seat.constituencySlug.toLowerCase() !== constituency) return false;
    if (provinceId > 0 && seat.provinceId !== provinceId) return false;
    if (districtId > 0 && seat.districtId !== districtId) return false;
    if (search && !matchesSearch(seat, search)) return false;
    return true;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hydrate = searchParams.get("hydrate") === "1";

    const { seats: baseSeats, source } = await loadSeatResults();
    let seats = filterSeats(baseSeats, request);
    let hydratedCount = 0;
    let resolvedSource = source;

    if (hydrate && seats.length > 0) {
      const hydrated = await hydrateSeatBreakdowns(seats);
      seats = hydrated.seats;
      hydratedCount = hydrated.hydratedCount;
      if (hydratedCount > 0) resolvedSource += "-filtered-breakdowns";
    }

    return NextResponse.json(
      {
        success: true,
        data: seats,
        meta: {
          total: seats.length,
          hydratedCount,
          timestamp: new Date().toISOString(),
          source: resolvedSource,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=1800",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch", data: [] },
      { status: 500 }
    );
  }
}
