import { NextRequest, NextResponse } from "next/server";
import { proportionalResults2079, proportionalResults2074 } from "@/data/provinces";
import { cacheGet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "proportional") {
    const year = searchParams.get("year") || "2079";
    const data = year === "2074" ? proportionalResults2074 : proportionalResults2079;
    return NextResponse.json({ success: true, data });
  }

  try {
    // 1. Try Redis (pre-warmed by sync)
    const cached = await cacheGet<unknown>("results_summary");
    if (cached) {
      return NextResponse.json({ success: true, data: cached, meta: { timestamp: new Date().toISOString(), source: "redis" } });
    }

    // 2. Fallback to MariaDB
    await ensureSchema();
    const partyRows = await query<{
      party_id: number;
      party_slug: string;
      party_nickname: string;
      party_color: string;
      leading_count: number;
      winner_count: number;
    }>("SELECT party_id, party_slug, party_nickname, party_color, leading_count, winner_count FROM party_results ORDER BY (winner_count + leading_count) DESC");

    // Try to get province-wise results from election_meta (pre-computed by sync)
    let provinceWise: unknown[] = [];
    try {
      const metaRows = await query<{ meta_value: string }>(
        "SELECT meta_value FROM election_meta WHERE meta_key = 'province_results'"
      );
      if (metaRows.length > 0) {
        const raw = typeof metaRows[0].meta_value === 'string' ? JSON.parse(metaRows[0].meta_value) : metaRows[0].meta_value;
        // raw is Record<number, {party, color, wins, leads}[]>
        const PROV_NAMES: Record<number, { name: string; totalSeats: number }> = {
          1: { name: "Koshi", totalSeats: 28 },
          2: { name: "Madhesh", totalSeats: 32 },
          3: { name: "Bagmati", totalSeats: 33 },
          4: { name: "Gandaki", totalSeats: 18 },
          5: { name: "Lumbini", totalSeats: 26 },
          6: { name: "Karnali", totalSeats: 12 },
          7: { name: "Sudurpaschim", totalSeats: 16 },
        };
        provinceWise = Object.entries(PROV_NAMES).map(([id, info]) => ({
          province: info.name,
          totalSeats: info.totalSeats,
          results: (raw[id] ?? []).map((r: { party: string; color: string; wins: number; leads: number }) => ({
            partyShortName: r.party,
            partyColor: r.color,
            wins: r.wins,
            leads: r.leads,
          })),
        }));
      }
    } catch { /* */ }

    const totalSeats = 165;
    const declared = partyRows.reduce((sum, p) => sum + (p.winner_count ?? 0), 0);
    const counting = partyRows.reduce((sum, p) => sum + (p.leading_count ?? 0), 0);

    const data = {
      totalSeats,
      declared,
      counting,
      remaining: totalSeats - declared - counting,
      partyWise: partyRows
        .filter((p) => (p.winner_count ?? 0) > 0 || (p.leading_count ?? 0) > 0)
        .map((p) => ({
          party: p.party_nickname ?? p.party_slug,
          color: p.party_color,
          wins: p.winner_count,
          leads: p.leading_count,
          total: (p.winner_count ?? 0) + (p.leading_count ?? 0),
        })),
      provinceWise,
    };

    return NextResponse.json({ success: true, data, meta: { timestamp: new Date().toISOString(), source: "db" } });
  } catch {
    return NextResponse.json(
      { success: false, data: null, meta: { timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
}
