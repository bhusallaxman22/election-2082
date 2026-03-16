import { ensureSchema } from "@/lib/migrate";
import { query } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { ENABLE_RUNTIME_EC_FALLBACK } from "@/lib/results-mode";
import {
  DISTRICT_NAME_MAP,
  fetchECConstituencyResults,
  fetchECJson,
  getPartyMeta,
} from "@/lib/ec-api";

export interface SeatResult {
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
}

interface LoadSeatResultsOptions {
  hydrateBreakdowns?: boolean;
}

interface LiveSeatSeed {
  districtId: number;
  constNumber: number;
  districtName?: string;
  constituency?: string;
  constituencySlug?: string;
  provinceId?: number;
  provinceName?: string;
}

interface SeatRow {
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

interface ECWinnerFeedItem {
  PartyId: number;
  PartyName: string;
  CandidateId: number;
  CandidateName: string;
  DistrictCd: number;
  ScConstId: number | string;
  SymbolId: number;
  TotalVote: number;
}

const PROVINCE_NAME_MAP: Record<number, string> = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpaschim",
};

const DB_RESULTS_CACHE_KEY = "all_results_db_v2";
const RICH_RESULTS_CACHE_KEY = "all_results_rich_v1";
const LIVE_SEAT_CACHE_PREFIX = "live_seat_v1";
const LIVE_SEAT_TTL = 900;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveDistrictName(seed: LiveSeatSeed): string {
  return seed.districtName || DISTRICT_NAME_MAP[seed.districtId] || `District-${seed.districtId}`;
}

function deriveConstituencyName(seed: LiveSeatSeed): string {
  return seed.constituency || `${deriveDistrictName(seed)}-${seed.constNumber}`;
}

function deriveConstituencySlug(seed: LiveSeatSeed): string {
  return seed.constituencySlug || `${slugify(deriveDistrictName(seed))}-${seed.constNumber}`;
}

function mapSeatRows(rows: SeatRow[]): SeatResult[] {
  return rows.map((r) => {
    let candidates: SeatResult["candidates"] = [];
    try {
      const raw =
        typeof r.candidates_json === "string"
          ? JSON.parse(r.candidates_json)
          : r.candidates_json;
      candidates = (raw || []).slice(0, 10).map((c: Record<string, unknown>) => ({
        id: String(c.id),
        name: String(c.name || ""),
        partyShortName: String(c.partyShortName || ""),
        partyColor: String(c.partyColor || "#94a3b8"),
        votes: Number(c.votes || 0),
        status:
          ((c.status as
            | "won"
            | "leading"
            | "trailing"
            | "pending") || "pending"),
        margin: c.margin as number | undefined,
        photo:
          (c.photo as string) || `/api/candidate-image/${String(c.id || "")}`,
      }));
    } catch {
      candidates = [];
    }

    return {
      districtId: r.district_id,
      constNumber: r.const_number,
      districtName: r.district_name,
      constituency: r.constituency_name,
      constituencySlug: r.constituency_slug,
      provinceId: r.province_id,
      provinceName: r.province_name,
      partyShortName: r.leader_party,
      partyColor: r.leader_party_color,
      leaderName: r.leader_name,
      leaderVotes: r.leader_votes,
      runnerUpName: r.runner_up_name,
      runnerUpVotes: r.runner_up_votes,
      margin: r.margin,
      totalVotes: r.total_votes,
      status: r.status,
      candidates,
    };
  });
}

function isSeatDataStale(seats: SeatResult[]): boolean {
  if (!seats.length) return true;
  const broken = seats.filter(
    (seat) =>
      seat.leaderVotes === 0 &&
      seat.totalVotes === 0 &&
      (seat.status === "pending" || seat.status === "counting")
  ).length;
  return broken >= Math.ceil(seats.length * 0.25);
}

export function isSeatBreakdownStale(seat: SeatResult): boolean {
  if (seat.status === "pending" && seat.totalVotes === 0) return false;

  const candidates = seat.candidates || [];
  const candidateVoteSum = candidates.reduce(
    (sum, candidate) => sum + Number(candidate.votes || 0),
    0
  );
  const nonZeroCandidates = candidates.filter(
    (candidate) => Number(candidate.votes || 0) > 0
  ).length;

  if (seat.totalVotes === 0) return true;
  if (seat.leaderVotes > 0 && seat.totalVotes <= seat.leaderVotes) return true;
  if (seat.status !== "pending" && seat.runnerUpVotes === 0 && seat.margin >= seat.leaderVotes) {
    return true;
  }
  if (seat.status !== "pending" && nonZeroCandidates < 2) return true;
  if (candidateVoteSum > 0 && candidateVoteSum < Math.max(seat.totalVotes * 0.8, seat.leaderVotes)) {
    return true;
  }

  return false;
}

function hasStaleSeatBreakdowns(seats: SeatResult[]): boolean {
  return seats.some((seat) => isSeatBreakdownStale(seat));
}

async function readSeatRowsFromDb(): Promise<SeatResult[]> {
  await ensureSchema();
  const rows = await query<SeatRow>(
    "SELECT * FROM constituency_results ORDER BY province_id, district_id, const_number"
  );
  return mapSeatRows(rows);
}

async function fetchWinnerFeed(): Promise<Map<string, ECWinnerFeedItem>> {
  const [partyWinners, independentWinners] = await Promise.all([
    fetchECJson<ECWinnerFeedItem[]>(
      "JSONFiles/Election2082/Common/HOR-T5Winner.json"
    ),
    fetchECJson<ECWinnerFeedItem[]>(
      "JSONFiles/Election2082/Common/HOR-T6Winner.json"
    ),
  ]);

  const winners = new Map<string, ECWinnerFeedItem>();
  for (const entry of [...(partyWinners || []), ...(independentWinners || [])]) {
    const districtId = Number(entry.DistrictCd);
    const constNumber = Number(entry.ScConstId);
    if (!Number.isFinite(districtId) || !Number.isFinite(constNumber)) continue;
    winners.set(`${districtId}_${constNumber}`, entry);
  }
  return winners;
}

export async function fetchLiveSeatResult(
  seed: LiveSeatSeed
): Promise<SeatResult | null> {
  if (!ENABLE_RUNTIME_EC_FALLBACK) {
    return null;
  }

  const cacheKey = `${LIVE_SEAT_CACHE_PREFIX}_${seed.districtId}_${seed.constNumber}`;
  const cached = await cacheGet<SeatResult>(cacheKey);
  if (cached && !isSeatBreakdownStale(cached)) {
    return cached;
  }

  try {
    const live = await fetchECConstituencyResults(seed.districtId, seed.constNumber);
    const sorted = [...live].sort(
      (a, b) => Number(b.TotalVoteReceived || 0) - Number(a.TotalVoteReceived || 0)
    );

    const totalVotes = sorted.reduce(
      (sum, candidate) => sum + Number(candidate.TotalVoteReceived || 0),
      0
    );
    const hasWinner = sorted.some((candidate) => candidate.Remarks === "Elected");
    const status: SeatResult["status"] = hasWinner
      ? "won"
      : totalVotes > 0
        ? "leading"
        : "pending";

    const leader = sorted[0];
    const runnerUp = sorted[1];
    const leaderParty = leader
      ? getPartyMeta(Number(leader.SymbolID || 0), leader.PoliticalPartyName)
      : { shortName: "", color: "#94a3b8", name: "" };
    const districtName = deriveDistrictName(seed);
    const provinceId =
      seed.provinceId ||
      Number(leader?.State || sorted[0]?.State || 0);
    const provinceName =
      seed.provinceName ||
      PROVINCE_NAME_MAP[provinceId] ||
      leader?.StateName ||
      "";

    const seat: SeatResult = {
      districtId: seed.districtId,
      constNumber: seed.constNumber,
      districtName,
      constituency: deriveConstituencyName(seed),
      constituencySlug: deriveConstituencySlug(seed),
      provinceId,
      provinceName,
      partyShortName: leaderParty.shortName,
      partyColor: leaderParty.color,
      leaderName: leader?.CandidateName || "",
      leaderVotes: Number(leader?.TotalVoteReceived || 0),
      runnerUpName: runnerUp?.CandidateName || "",
      runnerUpVotes: Number(runnerUp?.TotalVoteReceived || 0),
      margin:
        leader && runnerUp
          ? Math.max(
              Number(leader.TotalVoteReceived || 0) - Number(runnerUp.TotalVoteReceived || 0),
              0
            )
          : 0,
      totalVotes,
      status,
      candidates: sorted.map((candidate, index) => {
        const party = getPartyMeta(
          Number(candidate.SymbolID || 0),
          candidate.PoliticalPartyName
        );
        return {
          id: String(candidate.CandidateID),
          name: candidate.CandidateName,
          partyShortName: party.shortName,
          partyColor: party.color,
          votes: Number(candidate.TotalVoteReceived || 0),
          status:
            candidate.Remarks === "Elected"
              ? "won"
              : index === 0 && totalVotes > 0
                ? "leading"
                : totalVotes > 0
                  ? "trailing"
                  : "pending",
          margin:
            index === 0 && sorted.length > 1
              ? Math.max(
                  Number(candidate.TotalVoteReceived || 0) -
                    Number(sorted[1]?.TotalVoteReceived || 0),
                  0
                )
              : undefined,
          photo: `/api/candidate-image/${candidate.CandidateID}`,
        };
      }),
    };

    await cacheSet(cacheKey, seat, LIVE_SEAT_TTL);
    return seat;
  } catch {
    return null;
  }
}

function mergeSeatWithWinner(
  seat: SeatResult,
  winner: ECWinnerFeedItem | undefined
): SeatResult {
  if (!winner) return seat;

  const party = getPartyMeta(Number(winner.SymbolId || 0), winner.PartyName);
  const winnerId = String(winner.CandidateId);
  let candidates = [...(seat.candidates || [])];
  const existingIndex = candidates.findIndex(
    (candidate) =>
      candidate.id === winnerId || candidate.name === winner.CandidateName
  );

  if (existingIndex >= 0) {
    const existing = candidates[existingIndex];
    candidates[existingIndex] = {
      ...existing,
      id: winnerId,
      name: winner.CandidateName,
      partyShortName: party.shortName,
      partyColor: party.color,
      votes: Number(winner.TotalVote || 0),
      status: "won",
      photo: existing.photo || `/api/candidate-image/${winner.CandidateId}`,
    };
  } else {
    candidates.unshift({
      id: winnerId,
      name: winner.CandidateName,
      partyShortName: party.shortName,
      partyColor: party.color,
      votes: Number(winner.TotalVote || 0),
      status: "won",
      photo: `/api/candidate-image/${winner.CandidateId}`,
    });
  }

  candidates = candidates
    .map((candidate): SeatResult["candidates"][number] =>
      candidate.id === winnerId
        ? { ...candidate, status: "won", votes: Number(winner.TotalVote || 0) }
        : candidate.status === "won"
          ? { ...candidate, status: "trailing" }
          : candidate
    )
    .sort((a, b) => b.votes - a.votes);

  const runnerUp = candidates.find((candidate) => candidate.id !== winnerId);
  const leaderVotes = Number(winner.TotalVote || 0);
  const runnerUpVotes = Math.max(seat.runnerUpVotes || 0, runnerUp?.votes || 0);

  return {
    ...seat,
    partyShortName: party.shortName,
    partyColor: party.color,
    leaderName: winner.CandidateName,
    leaderVotes,
    runnerUpName: seat.runnerUpName || runnerUp?.name || "",
    runnerUpVotes,
    margin: seat.margin > 0 ? seat.margin : Math.max(leaderVotes - runnerUpVotes, 0),
    totalVotes: Math.max(seat.totalVotes || 0, leaderVotes),
    status: "won",
    candidates,
  };
}

async function hydrateSeatsWithLiveBreakdowns(
  seats: SeatResult[]
): Promise<{ seats: SeatResult[]; hydratedCount: number }> {
  const indexesToHydrate = seats
    .map((seat, index) => ({ seat, index }))
    .filter(({ seat }) => isSeatBreakdownStale(seat));

  if (!indexesToHydrate.length) {
    return { seats, hydratedCount: 0 };
  }

  const nextSeats = [...seats];
  let hydratedCount = 0;
  const batchSize = 1;

  for (let offset = 0; offset < indexesToHydrate.length; offset += batchSize) {
    const batch = indexesToHydrate.slice(offset, offset + batchSize);
    const results = await Promise.allSettled(
      batch.map(async ({ seat, index }) => ({
        index,
        liveSeat: await fetchLiveSeatResult({
          districtId: seat.districtId,
          constNumber: seat.constNumber,
          districtName: seat.districtName,
          constituency: seat.constituency,
          constituencySlug: seat.constituencySlug,
          provinceId: seat.provinceId,
          provinceName: seat.provinceName,
        }),
      }))
    );

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.liveSeat) continue;
      nextSeats[result.value.index] = result.value.liveSeat;
      hydratedCount++;
    }

    if (offset + batchSize < indexesToHydrate.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return { seats: nextSeats, hydratedCount };
}

export async function hydrateSeatBreakdowns(
  seats: SeatResult[]
): Promise<{ seats: SeatResult[]; hydratedCount: number }> {
  if (!ENABLE_RUNTIME_EC_FALLBACK) {
    return { seats, hydratedCount: 0 };
  }
  return hydrateSeatsWithLiveBreakdowns(seats);
}

export async function loadSeatResults(): Promise<{
  seats: SeatResult[];
  source: string;
}>;
export async function loadSeatResults(
  options: LoadSeatResultsOptions
): Promise<{
  seats: SeatResult[];
  source: string;
}>;
export async function loadSeatResults(
  options: LoadSeatResultsOptions = {}
): Promise<{
  seats: SeatResult[];
  source: string;
}> {
  if (options.hydrateBreakdowns) {
    const cachedRich = await cacheGet<SeatResult[]>(RICH_RESULTS_CACHE_KEY);
    if (cachedRich?.length && !hasStaleSeatBreakdowns(cachedRich)) {
      return { seats: cachedRich, source: "redis-rich" };
    }
  }

  let source = "db";
  let seats = await readSeatRowsFromDb();

  if (seats.length) {
    await cacheSet(DB_RESULTS_CACHE_KEY, seats, 300);
  } else {
    source = "redis-db";
    seats = (await cacheGet<SeatResult[]>(DB_RESULTS_CACHE_KEY)) || [];
  }

  if (!ENABLE_RUNTIME_EC_FALLBACK) {
    return { seats, source };
  }

  if (options.hydrateBreakdowns && source === "redis-db" && hasStaleSeatBreakdowns(seats)) {
    seats = await readSeatRowsFromDb();
    source = "db";
  }

  if (isSeatDataStale(seats)) {
    if (source === "redis-db") {
      seats = await readSeatRowsFromDb();
      source = "db";
    }

    if (isSeatDataStale(seats)) {
      const winners = await fetchWinnerFeed();
      seats = seats.map((seat) =>
        mergeSeatWithWinner(
          seat,
          winners.get(`${seat.districtId}_${seat.constNumber}`)
        )
      );
      await cacheSet(DB_RESULTS_CACHE_KEY, seats, 120);
      source += "-live-winners";
    }
  }

  if (options.hydrateBreakdowns) {
    const hydrated = await hydrateSeatsWithLiveBreakdowns(seats);
    seats = hydrated.seats;
    if (hydrated.hydratedCount > 0) {
      await cacheSet(RICH_RESULTS_CACHE_KEY, seats, LIVE_SEAT_TTL);
      source += "-live-breakdowns";
    }
  }

  return { seats, source };
}
