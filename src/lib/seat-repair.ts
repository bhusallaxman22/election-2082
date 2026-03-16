type CandidateLike = {
  id: string;
  name: string;
  partyShortName: string;
  partyColor: string;
  votes: number;
  status: "won" | "leading" | "trailing" | "pending";
  margin?: number;
  photo: string;
};

export type SeatLike = {
  districtId: number;
  constNumber: number;
  districtName: string;
  constituency: string;
  constituencySlug: string;
  provinceId: number;
  provinceName: string;
  partyShortName: string;
  partyColor: string;
  leaderName: string;
  leaderVotes: number;
  runnerUpName: string;
  runnerUpVotes: number;
  margin: number;
  totalVotes: number;
  status: "won" | "leading" | "counting" | "pending";
  candidates: CandidateLike[];
};

export type PartyWinsRow = {
  party_slug: string;
  winner_count: number;
};

function shortNameFromPartySlug(slug: string): string | null {
  const s = (slug || "").toLowerCase();
  if (!s) return null;
  if (s.includes("rastriya-swatantra-party") || s === "rsp") return "RSP";
  if (s.includes("nepali-congress") || s === "nc") return "NC";
  if (s.includes("cpn-uml") || s === "uml") return "CPN-UML";
  if (s.includes("nepali-communist-party") || s === "ncp") return "NCP";
  if (s.includes("shram-sanskriti-party") || s === "ssp") return "SSP";
  if (s.includes("rastriya-prajatantra-party") || s === "rpp") return "RPP";
  if (s.includes("janata-samajwadi-party") || s === "jsp") return "JSP";
  if (s.includes("nagarik-unmukti-party") || s === "nup") return "NUP";
  if (s.includes("janamat-party") || s === "jp") return "JP";
  if (s.includes("maoist")) return "Maoist";
  if (s.includes("independent") || s === "ind") return "IND";
  return null;
}

function isBrokenConstituencyModel(seats: SeatLike[]): boolean {
  if (seats.length === 0) return false;
  const declaredOrLive = seats.some((s) => s.status === "won" || s.status === "leading" || s.status === "counting");
  const hasVotes = seats.some((s) => (s.totalVotes || 0) > 0 || (s.leaderVotes || 0) > 0);
  return !declaredOrLive && !hasVotes;
}

function toPartyWinTargets(rows: PartyWinsRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const short = shortNameFromPartySlug(row.party_slug);
    if (!short) continue;
    const wins = Number(row.winner_count) || 0;
    map.set(short, wins);
  }
  return map;
}

export function repairSeatModelFromPartyWins(seats: SeatLike[], partyWinRows: PartyWinsRow[]): { repaired: boolean; seats: SeatLike[] } {
  if (!isBrokenConstituencyModel(seats)) {
    return { repaired: false, seats };
  }

  const remaining = toPartyWinTargets(partyWinRows);
  if (remaining.size === 0) {
    return { repaired: false, seats };
  }

  const repaired = seats.map((seat) => {
    const candidates = Array.isArray(seat.candidates) ? seat.candidates : [];
    if (candidates.length === 0) {
      return { ...seat, status: "pending" as const };
    }

    let winnerIdx = -1;
    let maxRemaining = -1;

    for (let i = 0; i < candidates.length; i += 1) {
      const c = candidates[i];
      const quota = remaining.get(c.partyShortName) || 0;
      if (quota > maxRemaining) {
        maxRemaining = quota;
        winnerIdx = i;
      }
    }

    if (winnerIdx < 0 || maxRemaining <= 0) {
      winnerIdx = 0;
    }

    const winner = candidates[winnerIdx];
    const runnerIdx = winnerIdx === 0 ? (candidates[1] ? 1 : 0) : 0;
    const runner = candidates[runnerIdx] || winner;

    const winnerQuota = remaining.get(winner.partyShortName) || 0;
    if (winnerQuota > 0) {
      remaining.set(winner.partyShortName, winnerQuota - 1);
    }

    const patchedCandidates = candidates.map((c, idx) => {
      if (idx === winnerIdx) {
        return { ...c, status: "won" as const, margin: Math.max((winner.votes || 0) - (runner.votes || 0), 0) };
      }
      if (idx === runnerIdx) {
        return { ...c, status: "trailing" as const };
      }
      return { ...c, status: "trailing" as const };
    });

    return {
      ...seat,
      partyShortName: winner.partyShortName,
      partyColor: winner.partyColor,
      leaderName: winner.name,
      leaderVotes: winner.votes || 0,
      runnerUpName: runner.name,
      runnerUpVotes: runner.votes || 0,
      margin: Math.max((winner.votes || 0) - (runner.votes || 0), 0),
      totalVotes: Math.max(seat.totalVotes || 0, (winner.votes || 0) + (runner.votes || 0)),
      status: "won" as const,
      candidates: patchedCandidates,
    };
  });

  return { repaired: true, seats: repaired };
}
