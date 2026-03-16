import { NextRequest, NextResponse } from "next/server";
import { loadSeatResults } from "@/lib/seat-results";

export const dynamic = "force-dynamic";

interface SearchResult {
  type: "candidate" | "party" | "constituency" | "district" | "province";
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
  color?: string;
}

const PROV_NAMES: Record<number, string> = {
  1: "Koshi", 2: "Madhesh", 3: "Bagmati", 4: "Gandaki",
  5: "Lumbini", 6: "Karnali", 7: "Sudurpaschim",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  if (q.length < 2) {
    return NextResponse.json({ success: true, results: [] });
  }

  try {
    const results: SearchResult[] = [];

    // Fetch all constituency results
    const { seats } = await loadSeatResults();

    // Search candidates
    const seenCandidates = new Set<string>();
    for (const seat of seats) {
      for (const c of seat.candidates || []) {
        if (c.name?.toLowerCase().includes(q) && !seenCandidates.has(c.name)) {
          seenCandidates.add(c.name);
          results.push({
            type: "candidate",
            title: c.name,
            subtitle: `${c.partyShortName} · ${seat.constituency}`,
            href: `/analytics?view=constituency&id=${seat.constituencySlug}`,
            meta: c.status === "won" ? "Winner" : c.status === "leading" ? "Leading" : `${(c.votes || 0).toLocaleString()} votes`,
            color: c.partyColor,
          });
        }
      }
      // Also search leader/runner-up names
      if (seat.leaderName?.toLowerCase().includes(q) && !seenCandidates.has(seat.leaderName)) {
        seenCandidates.add(seat.leaderName);
        results.push({
          type: "candidate",
          title: seat.leaderName,
          subtitle: `${seat.partyShortName} · ${seat.constituency}`,
          href: `/analytics?view=constituency&id=${seat.constituencySlug}`,
          meta: seat.status === "won" ? "Winner" : "Leading",
          color: seat.partyColor,
        });
      }
    }

    // Search parties
    const partySet = new Map<string, { color: string; wins: number; leads: number }>();
    for (const s of seats) {
      if (!s.partyShortName) continue;
      const existing = partySet.get(s.partyShortName) || { color: s.partyColor, wins: 0, leads: 0 };
      if (s.status === "won") existing.wins++;
      else if (s.status === "leading" || s.status === "counting") existing.leads++;
      partySet.set(s.partyShortName, existing);
    }
    for (const [party, d] of partySet) {
      if (party.toLowerCase().includes(q)) {
        results.push({
          type: "party",
          title: party,
          subtitle: `${d.wins} won · ${d.leads} leading`,
          href: `/analytics?view=party&name=${encodeURIComponent(party)}`,
          color: d.color,
        });
      }
    }

    // Search constituencies
    for (const s of seats) {
      if (s.constituency?.toLowerCase().includes(q) || s.constituencySlug?.toLowerCase().includes(q)) {
        results.push({
          type: "constituency",
          title: s.constituency,
          subtitle: `${s.districtName} · ${s.provinceName}`,
          href: `/analytics?view=constituency&id=${s.constituencySlug}`,
          meta: s.status === "won" ? `${s.leaderName} (${s.partyShortName})` : s.status,
        });
      }
    }

    // Search districts
    const districtSet = new Set<string>();
    for (const s of seats) {
      if (s.districtName?.toLowerCase().includes(q) && !districtSet.has(s.districtName)) {
        districtSet.add(s.districtName);
        results.push({
          type: "district",
          title: s.districtName,
          subtitle: s.provinceName,
          href: `/analytics?view=province&id=${s.provinceId}`,
        });
      }
    }

    // Search provinces
    for (const [id, name] of Object.entries(PROV_NAMES)) {
      if (name.toLowerCase().includes(q)) {
        results.push({
          type: "province",
          title: name,
          subtitle: `Province ${id}`,
          href: `/analytics?view=province&id=${id}`,
        });
      }
    }

    // Limit results and prioritize
    const sorted = results.slice(0, 20);

    return NextResponse.json({ success: true, results: sorted });
  } catch (err) {
    console.error("[search] Error:", (err as Error).message);
    return NextResponse.json({ success: true, results: [] });
  }
}
