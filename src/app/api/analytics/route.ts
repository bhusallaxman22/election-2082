import { NextResponse } from "next/server";
import { cacheGet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";
import type { SeatResult } from "@/app/api/all-results/route";

export const dynamic = "force-dynamic";

const PROV_NAMES: Record<number, string> = {
  1: "Koshi", 2: "Madhesh", 3: "Bagmati", 4: "Gandaki",
  5: "Lumbini", 6: "Karnali", 7: "Sudurpaschim",
};

const PROV_SEATS: Record<number, number> = {
  1: 28, 2: 32, 3: 33, 4: 18, 5: 26, 6: 12, 7: 16,
};

export async function GET() {
  try {
    let seats: SeatResult[] | null = await cacheGet<SeatResult[]>("all_results");

    if (!seats) {
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
        status: string;
        candidates_json: string;
      }>("SELECT * FROM constituency_results ORDER BY province_id, district_id, const_number");

      seats = rows.map((r) => {
        let candidates: SeatResult["candidates"] = [];
        try {
          const raw = typeof r.candidates_json === "string" ? JSON.parse(r.candidates_json) : r.candidates_json;
          candidates = (raw || []).slice(0, 10).map((c: Record<string, unknown>) => ({
            id: String(c.id), name: c.name as string,
            partyShortName: c.partyShortName as string, partyColor: c.partyColor as string,
            votes: c.votes as number, status: c.status as string, margin: c.margin as number | undefined,
          }));
        } catch { /* */ }
        return {
          districtId: r.district_id, constNumber: r.const_number,
          districtName: r.district_name, constituency: r.constituency_name,
          constituencySlug: r.constituency_slug, provinceId: r.province_id,
          provinceName: r.province_name, partyShortName: r.leader_party,
          partyColor: r.leader_party_color, leaderName: r.leader_name,
          leaderVotes: r.leader_votes, runnerUpName: r.runner_up_name,
          runnerUpVotes: r.runner_up_votes, margin: r.margin,
          totalVotes: r.total_votes, status: r.status as SeatResult["status"], candidates,
        };
      });
    }

    // Fetch PR data
    let prParties: { shortName: string; color: string; seats: number; votes: number; votePercent: number }[] = [];
    try {
      const prCached = await cacheGet<{ parties: typeof prParties }>("pr_party_results");
      if (prCached?.parties) prParties = prCached.parties;
    } catch { /* */ }

    // --- Compute analytics ---
    const declared = seats.filter((s) => s.status === "won").length;
    const counting = seats.filter((s) => s.status === "leading" || s.status === "counting").length;
    const pending = 165 - declared - counting;
    const totalVotesCast = seats.reduce((sum, s) => sum + (s.totalVotes || 0), 0);

    // All constituency flat data for drill-down
    const allConstituencies = seats.map((s) => ({
      districtId: s.districtId, constNumber: s.constNumber,
      constituencySlug: s.constituencySlug,
      constituency: s.constituency, district: s.districtName,
      provinceId: s.provinceId, province: s.provinceName,
      leaderName: s.leaderName, leaderParty: s.partyShortName,
      leaderPartyColor: s.partyColor, leaderVotes: s.leaderVotes,
      runnerUpName: s.runnerUpName, runnerUpVotes: s.runnerUpVotes,
      margin: s.margin, totalVotes: s.totalVotes, status: s.status,
      candidates: (s.candidates || []).map((c) => ({
        name: c.name, party: c.partyShortName, color: c.partyColor,
        votes: c.votes, status: c.status,
      })),
    }));

    // Party standings
    type ConstEntry = { districtId: number; constNumber: number; constituency: string; district: string; province: string; provinceId: number; status: string; leaderName: string; votes: number; margin: number; totalVotes: number };
    const partyMap = new Map<string, {
      color: string; fptpWins: number; fptpLeads: number; prSeats: number;
      totalVotes: number; prVotes: number; prVotePercent: number;
      constituencies: ConstEntry[];
      provinceWise: Map<number, { wins: number; leads: number; votes: number }>;
    }>();

    for (const s of seats) {
      if (!s.partyShortName) continue;
      const existing = partyMap.get(s.partyShortName) || {
        color: s.partyColor || "#94a3b8", fptpWins: 0, fptpLeads: 0, prSeats: 0,
        totalVotes: 0, prVotes: 0, prVotePercent: 0, constituencies: [] as ConstEntry[], provinceWise: new Map<number, { wins: number; leads: number; votes: number }>(),
      };
      if (s.status === "won") existing.fptpWins++;
      else if (s.status === "leading" || s.status === "counting") existing.fptpLeads++;
      existing.totalVotes += s.leaderVotes || 0;
      existing.constituencies.push({
        districtId: s.districtId, constNumber: s.constNumber,
        constituency: s.constituency, district: s.districtName,
        province: s.provinceName, provinceId: s.provinceId,
        status: s.status, leaderName: s.leaderName,
        votes: s.leaderVotes, margin: s.margin, totalVotes: s.totalVotes,
      });
      const pw = existing.provinceWise.get(s.provinceId) || { wins: 0, leads: 0, votes: 0 };
      if (s.status === "won") pw.wins++;
      else if (s.status === "leading" || s.status === "counting") pw.leads++;
      pw.votes += s.leaderVotes || 0;
      existing.provinceWise.set(s.provinceId, pw);
      partyMap.set(s.partyShortName, existing);
    }
    for (const pr of prParties) {
      const existing = partyMap.get(pr.shortName) || {
        color: pr.color || "#94a3b8", fptpWins: 0, fptpLeads: 0, prSeats: 0,
        totalVotes: 0, prVotes: 0, prVotePercent: 0, constituencies: [], provinceWise: new Map(),
      };
      existing.prSeats = pr.seats || 0;
      existing.prVotes = pr.votes || 0;
      existing.prVotePercent = pr.votePercent || 0;
      if (!partyMap.has(pr.shortName)) existing.color = pr.color || "#94a3b8";
      partyMap.set(pr.shortName, existing);
    }

    const partyStandings = Array.from(partyMap.entries())
      .map(([party, d]) => ({
        party, color: d.color, fptpWins: d.fptpWins, fptpLeads: d.fptpLeads,
        prSeats: d.prSeats, totalSeats: d.fptpWins + d.fptpLeads + d.prSeats,
        totalVotes: d.totalVotes, prVotes: d.prVotes, prVotePercent: d.prVotePercent,
        constituencies: d.constituencies.sort((a, b) => b.votes - a.votes),
        provinceWise: Object.fromEntries(
          Array.from(d.provinceWise.entries()).map(([id, v]) => [PROV_NAMES[id] || `Province ${id}`, v])
        ),
      }))
      .sort((a, b) => b.totalSeats - a.totalSeats || b.totalVotes - a.totalVotes);

    // Province breakdown with constituency list
    const provMap = new Map<number, {
      totalVotes: number; declared: number;
      parties: Map<string, { color: string; wins: number; leads: number; votes: number }>;
      constituencies: typeof allConstituencies;
    }>();
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      const pv = provMap.get(s.provinceId) || { totalVotes: 0, declared: 0, parties: new Map<string, { color: string; wins: number; leads: number; votes: number }>(), constituencies: [] as typeof allConstituencies };
      pv.totalVotes += s.totalVotes || 0;
      if (s.status === "won") pv.declared++;
      pv.constituencies.push(allConstituencies[i]);
      if (s.partyShortName) {
        const pp = pv.parties.get(s.partyShortName) || { color: s.partyColor || "#94a3b8", wins: 0, leads: 0, votes: 0 };
        if (s.status === "won") pp.wins++;
        else if (s.status === "leading" || s.status === "counting") pp.leads++;
        pp.votes += s.leaderVotes || 0;
        pv.parties.set(s.partyShortName, pp);
      }
      provMap.set(s.provinceId, pv);
    }

    const provinceBreakdown = Array.from(provMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([id, d]) => ({
        province: PROV_NAMES[id] || `Province ${id}`, provinceId: id,
        totalSeats: PROV_SEATS[id] || 0, declared: d.declared, totalVotes: d.totalVotes,
        parties: Array.from(d.parties.entries())
          .map(([party, pd]) => ({ party, color: pd.color, wins: pd.wins, leads: pd.leads, votes: pd.votes }))
          .sort((a, b) => (b.wins + b.leads) - (a.wins + a.leads)),
        constituencies: d.constituencies,
      }));

    // Closest races
    const closestRaces = seats
      .filter((s) => (s.status === "won" || s.status === "leading") && s.margin > 0 && s.margin < 50000)
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 20)
      .map((s) => ({
        districtId: s.districtId, constNumber: s.constNumber,
        constituency: s.constituency, district: s.districtName, province: s.provinceName,
        leader: s.leaderName, leaderParty: s.partyShortName, leaderPartyColor: s.partyColor,
        leaderVotes: s.leaderVotes,
        runnerUp: s.runnerUpName, runnerUpVotes: s.runnerUpVotes,
        margin: s.margin, totalVotes: s.totalVotes,
      }));

    // Biggest margins
    const biggestMargins = seats
      .filter((s) => s.status === "won" && s.margin > 0)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 20)
      .map((s) => ({
        districtId: s.districtId, constNumber: s.constNumber,
        constituency: s.constituency, district: s.districtName, province: s.provinceName,
        winner: s.leaderName, winnerParty: s.partyShortName, winnerPartyColor: s.partyColor,
        winnerVotes: s.leaderVotes, runnerUpVotes: s.runnerUpVotes,
        margin: s.margin, totalVotes: s.totalVotes,
      }));

    // Vote distribution - use ALL candidate votes, not just leader votes
    const allVoteMap = new Map<string, { color: string; votes: number }>();
    for (const s of seats) {
      for (const c of s.candidates || []) {
        if (!c.partyShortName) continue;
        const existing = allVoteMap.get(c.partyShortName) || { color: c.partyColor || "#94a3b8", votes: 0 };
        existing.votes += c.votes || 0;
        allVoteMap.set(c.partyShortName, existing);
      }
      // Fallback: if no candidates, use leader votes
      if (!s.candidates?.length && s.partyShortName) {
        const existing = allVoteMap.get(s.partyShortName) || { color: s.partyColor || "#94a3b8", votes: 0 };
        existing.votes += s.leaderVotes || 0;
        allVoteMap.set(s.partyShortName, existing);
      }
    }
    const totalAllVotes = Array.from(allVoteMap.values()).reduce((s, d) => s + d.votes, 0);
    const voteDistribution = Array.from(allVoteMap.entries())
      .map(([party, d]) => ({
        party, color: d.color, votes: d.votes,
        percentage: totalAllVotes > 0 ? Math.round((d.votes / totalAllVotes) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 25);

    // Turnout by province
    const turnoutByProvince = Array.from(provMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([id, d]) => {
        const totalSeats = PROV_SEATS[id] || 1;
        return {
          province: PROV_NAMES[id] || `Province ${id}`, provinceId: id,
          totalVotes: d.totalVotes, constituencies: totalSeats,
          avgVotesPerConstituency: Math.round(d.totalVotes / totalSeats),
        };
      });

    const analytics = {
      overview: { totalFPTP: 165, totalPR: 110, declared, counting, pending, totalVotesCast },
      partyStandings, provinceBreakdown, closestRaces, biggestMargins,
      voteDistribution, turnoutByProvince,
    };

    return NextResponse.json({ success: true, data: analytics }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[analytics] Error:", (err as Error).message);
    return NextResponse.json({ success: false, data: null }, { status: 500 });
  }
}
