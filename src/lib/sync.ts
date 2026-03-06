/**
 * Background sync worker.
 * Fetches ALL data from EC API + OnlineKhabar every minute,
 * stores in MariaDB, and pre-warms ALL Redis caches so the UI
 * serves data instantly with zero loading.
 */
import crypto from "crypto";
import { query, execute } from "./db";
import { cacheSet, publish, CHANNEL_ELECTION_UPDATE } from "./redis";
import { ensureSchema } from "./migrate";
import {
  fetchECConstituencyResults,
  fetchECDistricts,
  fetchECConstituencyCounts,
  fetchECPartyResults,
  fetchECStates,
  getPartyMeta,
  DISTRICT_NAME_MAP,
  type ECCandidate,
} from "./ec-api";
import { provinces } from "@/data/provinces";

// ── Complete district → constituency mapping (authoritative, 165 seats) ──

interface DistrictInfo {
  districtId: number;
  name: string;
  provinceId: number;
  provinceName: string;
  constituencies: number;
}

const ALL_DISTRICTS: DistrictInfo[] = [
  // Province 1 - Koshi (28 seats)
  { districtId: 1, name: "Taplejung", provinceId: 1, provinceName: "Koshi", constituencies: 1 },
  { districtId: 2, name: "Panchthar", provinceId: 1, provinceName: "Koshi", constituencies: 2 },
  { districtId: 3, name: "Ilam", provinceId: 1, provinceName: "Koshi", constituencies: 2 },
  { districtId: 4, name: "Jhapa", provinceId: 1, provinceName: "Koshi", constituencies: 5 },
  { districtId: 5, name: "Sankhuwasabha", provinceId: 1, provinceName: "Koshi", constituencies: 1 },
  { districtId: 6, name: "Terhathum", provinceId: 1, provinceName: "Koshi", constituencies: 1 },
  { districtId: 7, name: "Bhojpur", provinceId: 1, provinceName: "Koshi", constituencies: 1 },
  { districtId: 8, name: "Dhankuta", provinceId: 1, provinceName: "Koshi", constituencies: 1 },
  { districtId: 9, name: "Morang", provinceId: 1, provinceName: "Koshi", constituencies: 6 },
  { districtId: 10, name: "Sunsari", provinceId: 1, provinceName: "Koshi", constituencies: 3 },
  { districtId: 11, name: "Solukhumbu", provinceId: 1, provinceName: "Koshi", constituencies: 1 },
  { districtId: 12, name: "Khotang", provinceId: 1, provinceName: "Koshi", constituencies: 1 },
  { districtId: 13, name: "Okhaldhunga", provinceId: 1, provinceName: "Koshi", constituencies: 1 },
  { districtId: 14, name: "Udayapur", provinceId: 1, provinceName: "Koshi", constituencies: 2 },
  // Province 2 - Madhesh (32 seats)
  { districtId: 15, name: "Saptari", provinceId: 2, provinceName: "Madhesh", constituencies: 3 },
  { districtId: 16, name: "Siraha", provinceId: 2, provinceName: "Madhesh", constituencies: 4 },
  { districtId: 20, name: "Dhanusha", provinceId: 2, provinceName: "Madhesh", constituencies: 4 },
  { districtId: 21, name: "Mahottari", provinceId: 2, provinceName: "Madhesh", constituencies: 4 },
  { districtId: 22, name: "Sarlahi", provinceId: 2, provinceName: "Madhesh", constituencies: 4 },
  { districtId: 32, name: "Rautahat", provinceId: 2, provinceName: "Madhesh", constituencies: 4 },
  { districtId: 33, name: "Bara", provinceId: 2, provinceName: "Madhesh", constituencies: 4 },
  { districtId: 34, name: "Parsa", provinceId: 2, provinceName: "Madhesh", constituencies: 5 },
  // Province 3 - Bagmati (33 seats)
  { districtId: 17, name: "Dolakha", provinceId: 3, provinceName: "Bagmati", constituencies: 1 },
  { districtId: 18, name: "Ramechhap", provinceId: 3, provinceName: "Bagmati", constituencies: 1 },
  { districtId: 19, name: "Sindhuli", provinceId: 3, provinceName: "Bagmati", constituencies: 2 },
  { districtId: 23, name: "Rasuwa", provinceId: 3, provinceName: "Bagmati", constituencies: 1 },
  { districtId: 24, name: "Dhading", provinceId: 3, provinceName: "Bagmati", constituencies: 2 },
  { districtId: 25, name: "Nuwakot", provinceId: 3, provinceName: "Bagmati", constituencies: 2 },
  { districtId: 26, name: "Kathmandu", provinceId: 3, provinceName: "Bagmati", constituencies: 10 },
  { districtId: 27, name: "Bhaktapur", provinceId: 3, provinceName: "Bagmati", constituencies: 2 },
  { districtId: 28, name: "Lalitpur", provinceId: 3, provinceName: "Bagmati", constituencies: 3 },
  { districtId: 29, name: "Kavrepalanchok", provinceId: 3, provinceName: "Bagmati", constituencies: 2 },
  { districtId: 30, name: "Sindhupalchok", provinceId: 3, provinceName: "Bagmati", constituencies: 2 },
  { districtId: 31, name: "Makwanpur", provinceId: 3, provinceName: "Bagmati", constituencies: 2 },
  { districtId: 35, name: "Chitwan", provinceId: 3, provinceName: "Bagmati", constituencies: 3 },
  // Province 4 - Gandaki (18 seats)
  { districtId: 36, name: "Gorkha", provinceId: 4, provinceName: "Gandaki", constituencies: 2 },
  { districtId: 37, name: "Manang", provinceId: 4, provinceName: "Gandaki", constituencies: 1 },
  { districtId: 38, name: "Lamjung", provinceId: 4, provinceName: "Gandaki", constituencies: 1 },
  { districtId: 39, name: "Kaski", provinceId: 4, provinceName: "Gandaki", constituencies: 3 },
  { districtId: 40, name: "Tanahun", provinceId: 4, provinceName: "Gandaki", constituencies: 2 },
  { districtId: 41, name: "Syangja", provinceId: 4, provinceName: "Gandaki", constituencies: 2 },
  { districtId: 45, name: "Nawalparasi East", provinceId: 4, provinceName: "Gandaki", constituencies: 2 },
  { districtId: 48, name: "Mustang", provinceId: 4, provinceName: "Gandaki", constituencies: 1 },
  { districtId: 49, name: "Myagdi", provinceId: 4, provinceName: "Gandaki", constituencies: 1 },
  { districtId: 50, name: "Baglung", provinceId: 4, provinceName: "Gandaki", constituencies: 2 },
  { districtId: 51, name: "Parbat", provinceId: 4, provinceName: "Gandaki", constituencies: 1 },
  // Province 5 - Lumbini (26 seats)
  { districtId: 77, name: "Nawalparasi West", provinceId: 5, provinceName: "Lumbini", constituencies: 2 },
  { districtId: 46, name: "Rupandehi", provinceId: 5, provinceName: "Lumbini", constituencies: 6 },
  { districtId: 47, name: "Kapilvastu", provinceId: 5, provinceName: "Lumbini", constituencies: 4 },
  { districtId: 43, name: "Palpa", provinceId: 5, provinceName: "Lumbini", constituencies: 1 },
  { districtId: 44, name: "Arghakhanchi", provinceId: 5, provinceName: "Lumbini", constituencies: 1 },
  { districtId: 42, name: "Gulmi", provinceId: 5, provinceName: "Lumbini", constituencies: 1 },
  { districtId: 54, name: "Pyuthan", provinceId: 5, provinceName: "Lumbini", constituencies: 1 },
  { districtId: 53, name: "Rolpa", provinceId: 5, provinceName: "Lumbini", constituencies: 1 },
  { districtId: 52, name: "Rukum East", provinceId: 5, provinceName: "Lumbini", constituencies: 1 },
  { districtId: 56, name: "Dang", provinceId: 5, provinceName: "Lumbini", constituencies: 3 },
  { districtId: 65, name: "Banke", provinceId: 5, provinceName: "Lumbini", constituencies: 3 },
  { districtId: 66, name: "Bardiya", provinceId: 5, provinceName: "Lumbini", constituencies: 2 },
  // Province 6 - Karnali (12 seats)
  { districtId: 57, name: "Dolpa", provinceId: 6, provinceName: "Karnali", constituencies: 1 },
  { districtId: 58, name: "Mugu", provinceId: 6, provinceName: "Karnali", constituencies: 1 },
  { districtId: 59, name: "Jumla", provinceId: 6, provinceName: "Karnali", constituencies: 1 },
  { districtId: 60, name: "Kalikot", provinceId: 6, provinceName: "Karnali", constituencies: 1 },
  { districtId: 61, name: "Humla", provinceId: 6, provinceName: "Karnali", constituencies: 1 },
  { districtId: 62, name: "Jajarkot", provinceId: 6, provinceName: "Karnali", constituencies: 1 },
  { districtId: 63, name: "Dailekh", provinceId: 6, provinceName: "Karnali", constituencies: 2 },
  { districtId: 64, name: "Surkhet", provinceId: 6, provinceName: "Karnali", constituencies: 2 },
  { districtId: 78, name: "Rukum West", provinceId: 6, provinceName: "Karnali", constituencies: 1 },
  { districtId: 55, name: "Salyan", provinceId: 6, provinceName: "Karnali", constituencies: 1 },
  // Province 7 - Sudurpaschim (16 seats)
  { districtId: 67, name: "Bajura", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 1 },
  { districtId: 68, name: "Achham", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 2 },
  { districtId: 69, name: "Bajhang", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 2 },
  { districtId: 70, name: "Doti", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 1 },
  { districtId: 71, name: "Kailali", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 4 },
  { districtId: 72, name: "Darchula", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 1 },
  { districtId: 73, name: "Baitadi", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 2 },
  { districtId: 74, name: "Dadeldhura", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 1 },
  { districtId: 75, name: "Kanchanpur", provinceId: 7, provinceName: "Sudurpaschim", constituencies: 2 },
];

const POPULAR_CONSTITUENCIES = [
  { districtId: 4, constNum: 5 },
  { districtId: 35, constNum: 2 },
  { districtId: 26, constNum: 1 },
  { districtId: 26, constNum: 3 },
  { districtId: 27, constNum: 2 },
  { districtId: 28, constNum: 3 },
  { districtId: 40, constNum: 1 },
  { districtId: 36, constNum: 1 },
  { districtId: 9, constNum: 1 },
  { districtId: 26, constNum: 4 },
  { districtId: 26, constNum: 5 },
  { districtId: 39, constNum: 2 },
];

// ── Helpers ──────────────────────────────────────────────────────────

function md5(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex");
}

function getAllConstituencies() {
  const all: {
    districtId: number;
    constNum: number;
    provinceId: number;
    provinceName: string;
  }[] = [];
  for (const dist of ALL_DISTRICTS) {
    for (let c = 1; c <= dist.constituencies; c++) {
      all.push({
        districtId: dist.districtId,
        constNum: c,
        provinceId: dist.provinceId,
        provinceName: dist.provinceName,
      });
    }
  }
  return all; // Always returns exactly 165
}

// ── Sync parties from OnlineKhabar ───────────────────────────────────

async function syncParties(): Promise<number> {
  const UPSTREAM =
    "https://election.onlinekhabar.com/wp-json/okelapi/v1/2082/home/election-results?";

  let rows: Record<string, unknown>[];
  try {
    const res = await fetch(UPSTREAM, {
      headers: { "User-Agent": "Nepal-Election-2082-Dashboard/1.0" },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const json = await res.json();
    rows = json.data?.party_results ?? [];

    // Also persist the raw response for /api/election endpoint
    await execute(
      `INSERT INTO election_meta (meta_key, meta_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
      ["election_raw", JSON.stringify(json)]
    );
  } catch (err) {
    console.error("[sync] Party fetch failed:", err);
    return 0;
  }

  let changed = 0;

  for (const p of rows) {
    const hash = md5(JSON.stringify(p));
    const partyId = Number(p.party_id) || 0;

    // Check if this party already exists with same data
    const existing = await query<{ data_hash?: string }>(
      "SELECT JSON_UNQUOTE(JSON_EXTRACT(extra_json, '$.data_hash')) AS data_hash FROM party_results WHERE party_id = ?",
      [partyId]
    );

    if (existing.length > 0 && existing[0].data_hash === hash) {
      continue; // No change
    }

    await execute(
      `INSERT INTO party_results
        (party_id, party_name, party_nickname, party_slug, party_image, party_color,
         leading_count, winner_count, total_seat, extra_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         party_name = VALUES(party_name),
         party_nickname = VALUES(party_nickname),
         party_slug = VALUES(party_slug),
         party_image = VALUES(party_image),
         party_color = VALUES(party_color),
         leading_count = VALUES(leading_count),
         winner_count = VALUES(winner_count),
         total_seat = VALUES(total_seat),
         extra_json = VALUES(extra_json)`,
      [
        partyId,
        String(p.party_name ?? ""),
        String(p.party_nickname ?? ""),
        String(p.party_slug ?? ""),
        String(p.party_image ?? ""),
        String(p.party_color ?? ""),
        Number(p.leading_count) || 0,
        Number(p.winner_count) || 0,
        Number(p.total_seat) || 0,
        JSON.stringify({ ...p, data_hash: hash }),
      ]
    );
    changed++;
  }

  return changed;
}

// ── Sync constituency results from EC API ────────────────────────────

async function syncConstituencies(): Promise<number> {
  const allConst = getAllConstituencies();
  let changed = 0;
  const batchSize = 5; // Keep small to avoid 429 rate limits

  for (let i = 0; i < allConst.length; i += batchSize) {
    const batch = allConst.slice(i, i + batchSize);
    // Small delay between batches to avoid rate limiting
    if (i > 0) await new Promise((r) => setTimeout(r, 500));

    const batchResults = await Promise.allSettled(
      batch.map(async (c) => {
        let candidates: ECCandidate[];
        try {
          candidates = await fetchECConstituencyResults(
            c.districtId,
            c.constNum
          );
        } catch {
          return null; // Skip failed fetches
        }

        const sorted = [...candidates].sort(
          (a, b) => b.TotalVoteReceived - a.TotalVoteReceived
        );
        const totalVotes = sorted.reduce(
          (s, cd) => s + cd.TotalVoteReceived,
          0
        );

        const hash = md5(JSON.stringify(sorted.map((cd) => [cd.CandidateID, cd.TotalVoteReceived, cd.Remarks])));

        // Check existing hash
        const existing = await query<{ data_hash: string | null }>(
          "SELECT data_hash FROM constituency_results WHERE district_id = ? AND const_number = ?",
          [c.districtId, c.constNum]
        );

        if (existing.length > 0 && existing[0].data_hash === hash) {
          return null; // No change
        }

        const districtName =
          DISTRICT_NAME_MAP[c.districtId] ?? `District-${c.districtId}`;
        const leader = sorted[0];
        const runnerUp = sorted[1];
        const leaderMeta = leader ? getPartyMeta(leader.SymbolID, leader.PoliticalPartyName) : null;
        const hasWinner = sorted.some((cd) => cd.Remarks === "Elected");
        const hasVotes = totalVotes > 0;
        const status = hasWinner
          ? "won"
          : hasVotes
            ? "leading"
            : "pending";

        const candidatesJson = sorted.map((cd, idx) => {
          const party = getPartyMeta(cd.SymbolID, cd.PoliticalPartyName);
          return {
            id: String(cd.CandidateID),
            name: cd.CandidateName,
            partyShortName: party.shortName,
            partyFullName: cd.PoliticalPartyName,
            partyColor: party.color,
            symbolName: cd.SymbolName,
            symbolId: cd.SymbolID,
            votes: cd.TotalVoteReceived,
            status:
              cd.Remarks === "Elected"
                ? "won"
                : idx === 0 && hasVotes
                  ? "leading"
                  : hasVotes
                    ? "trailing"
                    : "pending",
            margin:
              idx === 0 && sorted.length > 1
                ? cd.TotalVoteReceived - sorted[1].TotalVoteReceived
                : undefined,
            gender: cd.Gender,
            age: cd.Age,
            rank: cd.Rank,
            remarks: cd.Remarks,
          };
        });

        await execute(
          `INSERT INTO constituency_results
            (district_id, const_number, district_name, province_id, province_name,
             constituency_name, constituency_slug, leader_name, leader_party,
             leader_party_color, leader_votes, runner_up_name, runner_up_votes,
             margin, total_votes, status, candidates_json, data_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             district_name = VALUES(district_name),
             province_id = VALUES(province_id),
             province_name = VALUES(province_name),
             constituency_name = VALUES(constituency_name),
             constituency_slug = VALUES(constituency_slug),
             leader_name = VALUES(leader_name),
             leader_party = VALUES(leader_party),
             leader_party_color = VALUES(leader_party_color),
             leader_votes = VALUES(leader_votes),
             runner_up_name = VALUES(runner_up_name),
             runner_up_votes = VALUES(runner_up_votes),
             margin = VALUES(margin),
             total_votes = VALUES(total_votes),
             status = VALUES(status),
             candidates_json = VALUES(candidates_json),
             data_hash = VALUES(data_hash)`,
          [
            c.districtId,
            c.constNum,
            districtName,
            c.provinceId,
            c.provinceName,
            `${districtName}-${c.constNum}`,
            `${districtName.toLowerCase().replace(/\s+/g, "-")}-${c.constNum}`,
            leader?.CandidateName ?? "",
            leaderMeta?.shortName ?? "—",
            leaderMeta?.color ?? "#9E9E9E",
            leader?.TotalVoteReceived ?? 0,
            runnerUp?.CandidateName ?? "",
            runnerUp?.TotalVoteReceived ?? 0,
            leader && runnerUp
              ? leader.TotalVoteReceived - runnerUp.TotalVoteReceived
              : 0,
            totalVotes,
            status,
            JSON.stringify(candidatesJson),
            hash,
          ]
        );

        changed++;
        return {
          districtId: c.districtId,
          constNum: c.constNum,
          status,
        };
      })
    );
  }

  return changed;
}

// ── Sync districts from EC API (with hardcoded fallback) ─────────────

async function syncDistricts(): Promise<number> {
  let changed = 0;

  try {
    const [districts, constCounts] = await Promise.all([
      fetchECDistricts(),
      fetchECConstituencyCounts(),
    ]);

    const constMap = new Map(constCounts.map((c) => [c.distId, c.consts]));

    for (const d of districts) {
      if (d.id >= 90) continue;
      await execute(
        `INSERT INTO districts (district_id, name, name_np, state_id, constituencies)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), name_np = VALUES(name_np),
           state_id = VALUES(state_id), constituencies = VALUES(constituencies)`,
        [
          d.id,
          DISTRICT_NAME_MAP[d.id] ?? d.name,
          d.name,
          d.parentId,
          constMap.get(d.id) ?? 0,
        ]
      );
      changed++;
    }
    return changed;
  } catch (err) {
    console.warn("[sync] EC districts fetch failed, using hardcoded data:", (err as Error).message);
    // Fallback: populate districts from our hardcoded ALL_DISTRICTS
    for (const d of ALL_DISTRICTS) {
      await execute(
        `INSERT INTO districts (district_id, name, name_np, state_id, constituencies)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), state_id = VALUES(state_id), constituencies = VALUES(constituencies)`,
        [d.districtId, d.name, d.name, d.provinceId, d.constituencies]
      );
      changed++;
    }
    return changed;
  }
}

// ── Sync EC party results (election commission aggregated data) ──────

async function syncECParties(): Promise<void> {
  try {
    const ecParties = await fetchECPartyResults();
    if (ecParties && ecParties.length > 0) {
      await execute(
        `INSERT INTO election_meta (meta_key, meta_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
        ["ec_party_results", JSON.stringify(ecParties)]
      );
      console.log(`[sync] EC party results: ${ecParties.length} parties`);
    }
  } catch (err) {
    console.warn("[sync] EC party results fetch failed:", (err as Error).message);
  }
}

// ── Sync EC states ───────────────────────────────────────────────────

async function syncECStates(): Promise<void> {
  try {
    const states = await fetchECStates();
    if (states && states.length > 0) {
      await execute(
        `INSERT INTO election_meta (meta_key, meta_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
        ["ec_states", JSON.stringify(states)]
      );
    }
  } catch {
    // Silent — states are static
  }
}

// ── Pre-warm ALL Redis caches ────────────────────────────────────────

const CACHE_TTL = 300; // 5 minutes — sync runs every 1 min so always fresh

async function preWarmRedis(): Promise<void> {
  console.log("[sync] Pre-warming Redis caches...");

  try {
    // ── 1. all_results (SeatMap data) ──────────────────────────────
    const constRows = await query<{
      district_id: number;
      const_number: number;
      district_name: string;
      constituency_name: string;
      constituency_slug: string;
      province_id: number;
      province_name: string;
      leader_name: string;
      leader_party: string;
      leader_party_color: string;
      leader_votes: number;
      runner_up_name: string;
      runner_up_votes: number;
      margin: number;
      total_votes: number;
      status: "won" | "leading" | "counting" | "pending";
      candidates_json: string;
    }>(
      "SELECT * FROM constituency_results ORDER BY province_id, district_id, const_number"
    );

    if (constRows.length > 0) {
      // Build all_results view
      const allResults = constRows.map((r) => {
        let candidates: { id: string; name: string; partyShortName: string; partyColor: string; votes: number; status: string; margin?: number }[] = [];
        try {
          const raw =
            typeof r.candidates_json === "string"
              ? JSON.parse(r.candidates_json)
              : r.candidates_json;
          candidates = (raw || []).slice(0, 5).map((c: Record<string, unknown>) => ({
            id: String(c.id),
            name: c.name as string,
            partyShortName: c.partyShortName as string,
            partyColor: c.partyColor as string,
            votes: c.votes as number,
            status: c.status as string,
            margin: c.margin as number | undefined,
          }));
        } catch {
          /* */
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
      await cacheSet("all_results", allResults, CACHE_TTL);

      // ── 2. popular_candidates ──────────────────────────────────
      const popularSet = new Set(
        POPULAR_CONSTITUENCIES.map((c) => `${c.districtId}_${c.constNum}`)
      );
      const popularRows = constRows.filter((r) =>
        popularSet.has(`${r.district_id}_${r.const_number}`)
      );
      const popularCandidates = popularRows.map((r) => {
        let candidates: { id: string; name: string; partyShortName: string; partyColor: string; votes: number; status: string; margin?: number; photo: string }[] = [];
        try {
          const raw =
            typeof r.candidates_json === "string"
              ? JSON.parse(r.candidates_json)
              : r.candidates_json;
          candidates = (raw || []).slice(0, 5).map((c: Record<string, unknown>) => ({
            id: String(c.id),
            name: c.name as string,
            partyShortName: c.partyShortName as string,
            partyColor: c.partyColor as string,
            votes: c.votes as number,
            status: c.status as string,
            margin: c.margin as number | undefined,
            photo: "",
          }));
        } catch {
          /* */
        }
        const hasWinner = r.status === "won";
        const hasVotes = r.total_votes > 0;
        return {
          constituency: r.constituency_name,
          constituencySlug: r.constituency_slug,
          districtId: r.district_id,
          constNumber: r.const_number,
          province: r.province_name,
          provinceId: r.province_id,
          candidates,
          totalVotes: r.total_votes,
          countingStatus: hasWinner
            ? "Result declared"
            : hasVotes
              ? "Counting in progress"
              : "Counting not started",
        };
      });
      await cacheSet("popular_candidates", popularCandidates, CACHE_TTL);

      // ── 3. Per-constituency caches ─────────────────────────────
      for (const r of constRows) {
        let candidates: Record<string, unknown>[] = [];
        try {
          const raw =
            typeof r.candidates_json === "string"
              ? JSON.parse(r.candidates_json)
              : r.candidates_json;
          candidates = raw || [];
        } catch {
          /* */
        }
        const hasWinner = r.status === "won";
        const hasVotes = r.total_votes > 0;
        const data = {
          constituency: r.constituency_name,
          constituencySlug: r.constituency_slug,
          districtId: r.district_id,
          constNumber: r.const_number,
          province: r.province_name,
          provinceId: r.province_id,
          candidates,
          totalVotes: r.total_votes,
          countingStatus: hasWinner
            ? "Result declared"
            : hasVotes
              ? "Counting in progress"
              : "Counting not started",
          totalCandidates: candidates.length,
        };
        await cacheSet(
          `constituency_${r.district_id}_${r.const_number}`,
          data,
          CACHE_TTL
        );
      }

      // ── 4. Province-wise aggregated results from DB ────────────
      const provinceAgg = new Map<
        number,
        Map<string, { party: string; color: string; wins: number; leads: number }>
      >();
      for (const r of constRows) {
        if (!provinceAgg.has(r.province_id)) {
          provinceAgg.set(r.province_id, new Map());
        }
        const pMap = provinceAgg.get(r.province_id)!;
        const key = r.leader_party;
        if (key === "—" || !key) continue;
        if (!pMap.has(key)) {
          pMap.set(key, {
            party: key,
            color: r.leader_party_color,
            wins: 0,
            leads: 0,
          });
        }
        const entry = pMap.get(key)!;
        if (r.status === "won") entry.wins++;
        else if (r.status === "leading") entry.leads++;
      }

      // Store computed province results in election_meta
      const provinceResults: Record<
        number,
        { party: string; color: string; wins: number; leads: number }[]
      > = {};
      for (const [pId, pMap] of provinceAgg) {
        provinceResults[pId] = Array.from(pMap.values())
          .filter((e) => e.wins > 0 || e.leads > 0)
          .sort((a, b) => b.wins + b.leads - (a.wins + a.leads));
      }
      await execute(
        `INSERT INTO election_meta (meta_key, meta_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
        ["province_results", JSON.stringify(provinceResults)]
      );
    }

    // ── 5. parties ─────────────────────────────────────────────────
    const partyRows = await query<{
      party_id: number;
      party_name: string;
      party_nickname: string;
      party_slug: string;
      party_image: string;
      party_color: string;
      leading_count: number;
      winner_count: number;
      total_seat: number;
    }>(
      "SELECT * FROM party_results ORDER BY (winner_count + leading_count) DESC, winner_count DESC"
    );
    if (partyRows.length > 0) {
      const parties = partyRows.map((p) => ({
        id: p.party_id,
        name: p.party_nickname ?? p.party_slug,
        nameNp: p.party_name,
        wins: p.winner_count,
        leads: p.leading_count,
        totalSeats: p.total_seat,
        color: p.party_color,
        logo: p.party_image,
      }));
      await cacheSet("parties", parties, CACHE_TTL);

      // ── 6. results_summary ───────────────────────────────────────
      const totalSeats = 165;
      const declared = partyRows.reduce(
        (sum, p) => sum + (p.winner_count ?? 0),
        0
      );
      const counting = partyRows.reduce(
        (sum, p) => sum + (p.leading_count ?? 0),
        0
      );

      let provinceResults: Record<
        number,
        { party: string; color: string; wins: number; leads: number }[]
      > = {};
      try {
        const metaRows = await query<{ meta_value: string }>(
          "SELECT meta_value FROM election_meta WHERE meta_key = 'province_results'"
        );
        if (metaRows.length > 0) {
          provinceResults = JSON.parse(metaRows[0].meta_value);
        }
      } catch {
        /* */
      }

      const resultsSummary = {
        totalSeats,
        declared,
        counting,
        remaining: totalSeats - declared - counting,
        partyWise: partyRows
          .filter(
            (p) => (p.winner_count ?? 0) > 0 || (p.leading_count ?? 0) > 0
          )
          .map((p) => ({
            party: p.party_nickname ?? p.party_slug,
            color: p.party_color,
            wins: p.winner_count,
            leads: p.leading_count,
            total: (p.winner_count ?? 0) + (p.leading_count ?? 0),
          })),
        provinceWise: provinces.map((prov) => ({
          province: prov.name,
          totalSeats: prov.totalSeats,
          results: (provinceResults[prov.id] ?? []).map((r) => ({
            partyShortName: r.party,
            partyColor: r.color,
            wins: r.wins,
            leads: r.leads,
          })),
        })),
      };
      await cacheSet("results_summary", resultsSummary, CACHE_TTL);
    }

    // ── 7. election_raw (from OnlineKhabar) ────────────────────────
    try {
      const metaRows = await query<{ meta_value: string }>(
        "SELECT meta_value FROM election_meta WHERE meta_key = 'election_raw'"
      );
      if (metaRows.length > 0 && metaRows[0].meta_value) {
        const electionRaw = JSON.parse(metaRows[0].meta_value);
        await cacheSet("election_raw", electionRaw, CACHE_TTL);
      }
    } catch {
      /* */
    }

    // ── 8. districts_all ───────────────────────────────────────────
    try {
      const distRows = await query<{
        district_id: number;
        name: string;
        name_np: string;
        state_id: number;
        constituencies: number;
      }>("SELECT * FROM districts ORDER BY state_id, district_id");
      if (distRows.length > 0) {
        const districts = distRows.map((d) => ({
          id: d.district_id,
          name: d.name,
          nameNp: d.name_np,
          stateId: d.state_id,
          constituencies: d.constituencies,
        }));
        await cacheSet("districts_all", districts, CACHE_TTL);
      }
    } catch {
      /* */
    }

    console.log("[sync] Redis caches pre-warmed");
  } catch (err) {
    console.error("[sync] Pre-warm error:", err);
  }
}

// ── Main sync orchestrator ───────────────────────────────────────────

let syncing = false;

export async function runSync(): Promise<{
  partiesChanged: number;
  constituenciesChanged: number;
}> {
  if (syncing) return { partiesChanged: 0, constituenciesChanged: 0 };
  syncing = true;

  try {
    await ensureSchema();

    // Log sync start
    await execute(
      "INSERT INTO sync_log (sync_type, status) VALUES ('full', 'running')"
    );
    const logRows = await query<{ id: number }>(
      "SELECT LAST_INSERT_ID() as id"
    );
    const logId = logRows[0]?.id;

    // Run all syncs — districts FIRST (needed for constituency enumeration)
    await syncDistricts();
    const partiesChanged = await syncParties();
    const constituenciesChanged = await syncConstituencies();
    // Additional EC API data
    await syncECParties();
    await syncECStates();

    const totalChanged = partiesChanged + constituenciesChanged;

    // Update sync log
    if (logId) {
      await execute(
        `UPDATE sync_log SET finished_at = NOW(), rows_changed = ?, status = 'success' WHERE id = ?`,
        [totalChanged, logId]
      );
    }

    // ★ Pre-warm ALL Redis caches after every sync (even if no changes,
    //   in case Redis was restarted and caches expired)
    await preWarmRedis();

    // Publish SSE event if anything changed
    if (totalChanged > 0) {
      await publish(CHANNEL_ELECTION_UPDATE, {
        type: "sync_complete",
        partiesChanged,
        constituenciesChanged,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[sync] Done — parties: ${partiesChanged}, constituencies: ${constituenciesChanged} changed`
    );

    return { partiesChanged, constituenciesChanged };
  } catch (err) {
    console.error("[sync] Error:", err);
    return { partiesChanged: 0, constituenciesChanged: 0 };
  } finally {
    syncing = false;
  }
}

// ── Auto-start sync loop (singleton) ─────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startSyncLoop() {
  if (intervalHandle) return;
  const interval = Number(process.env.SYNC_INTERVAL) || 60_000;

  console.log(`[sync] Starting sync loop (every ${interval / 1000}s)`);

  // Run immediately, then on interval
  runSync();
  intervalHandle = setInterval(runSync, interval);
}

export function stopSyncLoop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
