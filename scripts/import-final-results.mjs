#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import Redis from "ioredis";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnvFile(path.join(ROOT, ".env.local"));

const DB_CONFIG = {
  host: process.env.DB_HOST || "192.168.0.142",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "election_2082",
  charset: "utf8mb4",
};

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || "192.168.0.142",
  port: Number(process.env.REDIS_PORT || 6379),
};

const EC_BASE = "https://result.election.gov.np";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

const PARTY_META = {
  2528: { name: "Rastriya Swatantra Party", shortName: "RSP", color: "#2563EB" },
  2583: { name: "Nepali Congress", shortName: "NC", color: "#16A34A" },
  2598: { name: "CPN-UML", shortName: "CPN-UML", color: "#DC2626" },
  2557: { name: "Nepal Communist Party", shortName: "NCP", color: "#C026D3" },
  2604: { name: "Rastriya Prajatantra Party", shortName: "RPP", color: "#F59E0B" },
  2542: { name: "Janata Samajbadi Party", shortName: "JSP", color: "#22C55E" },
  2526: { name: "CPN (Maoist Centre)", shortName: "Maoist", color: "#EC4899" },
  2585: { name: "Janamat Party", shortName: "JP", color: "#8B5CF6" },
  2531: { name: "Nagarik Unmukti Party", shortName: "NUP", color: "#0891B2" },
  2575: { name: "Loktantrik Samajbadi Party", shortName: "LSP", color: "#0F766E" },
  2501: { name: "Shram Sanskriti Party", shortName: "SSP", color: "#374151" },
  2566: { name: "Ujaylo Nepal Party", shortName: "Ujaylo", color: "#EAB308" },
  2578: { name: "Nepal Majdur Kisan Party", shortName: "NWPP", color: "#B91C1C" },
  2522: { name: "Rastriya Janamorcha", shortName: "RJM", color: "#0F766E" },
};

main().catch((error) => {
  console.error("[import-final-results] Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const pool = mysql.createPool(DB_CONFIG);
  const redis = new Redis(REDIS_CONFIG);

  try {
    const [rows] = await pool.execute(
      `SELECT district_id, const_number, district_name, province_id, province_name,
              constituency_name, constituency_slug
       FROM constituency_results
       ORDER BY province_id, district_id, const_number`
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("No constituency rows found in DB.");
    }

    console.log(`[import-final-results] Importing ${rows.length} constituencies into MariaDB...`);

    let updated = 0;
    let unchanged = 0;
    const failures = [];

    for (const row of rows) {
      const districtId = Number(row.district_id);
      const constNumber = Number(row.const_number);

      try {
        const candidates = await fetchConstituencyResults(districtId, constNumber);
        const seat = buildSeatPayload(row, candidates);

        const [existingRows] = await pool.execute(
          "SELECT data_hash FROM constituency_results WHERE district_id = ? AND const_number = ?",
          [districtId, constNumber]
        );
        const existingHash = Array.isArray(existingRows) ? existingRows[0]?.data_hash || null : null;

        if (existingHash === seat.dataHash) {
          unchanged++;
        } else {
          await pool.execute(
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
              districtId,
              constNumber,
              seat.districtName,
              seat.provinceId,
              seat.provinceName,
              seat.constituencyName,
              seat.constituencySlug,
              seat.leaderName,
              seat.leaderParty,
              seat.leaderPartyColor,
              seat.leaderVotes,
              seat.runnerUpName,
              seat.runnerUpVotes,
              seat.margin,
              seat.totalVotes,
              seat.status,
              JSON.stringify(seat.candidatesJson),
              seat.dataHash,
            ]
          );
          updated++;
        }

        if ((updated + unchanged) % 10 === 0 || updated + unchanged === rows.length) {
          console.log(
            `[import-final-results] ${updated + unchanged}/${rows.length} processed ` +
              `(updated: ${updated}, unchanged: ${unchanged}, failed: ${failures.length})`
          );
        }

        await sleep(125);
      } catch (error) {
        failures.push({
          districtId,
          constNumber,
          message: error instanceof Error ? error.message : String(error),
        });
        console.error(
          `[import-final-results] Failed ${districtId}-${constNumber}:`,
          error instanceof Error ? error.message : error
        );
        await sleep(1000);
      }
    }

    await invalidateCaches(redis);

    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN total_votes > 0 THEN 1 ELSE 0 END) AS nonzero,
         SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS won
       FROM constituency_results`
    );

    console.log("[import-final-results] Summary:", summaryRows[0]);
    console.log(
      `[import-final-results] Done. updated=${updated} unchanged=${unchanged} failed=${failures.length}`
    );

    if (failures.length > 0) {
      console.error("[import-final-results] Failures:");
      for (const failure of failures) {
        console.error(
          `  - ${failure.districtId}-${failure.constNumber}: ${failure.message}`
        );
      }
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
    redis.disconnect();
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function fetchConstituencyResults(districtId, constNumber) {
  const filePath = `JSONFiles/Election2082/HOR/FPTP/HOR-${districtId}-${constNumber}.json`;
  const url = `${EC_BASE}/Handlers/SecureJson.ashx?file=${filePath}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { sessionId, csrf } = await getSession();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const cookie = [
        sessionId ? `ASP.NET_SessionId=${sessionId}` : "",
        `CsrfToken=${csrf}`,
      ].filter(Boolean).join("; ");
      const res = await fetch(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: `${EC_BASE}/`,
          "X-Csrf-Token": csrf,
          Cookie: cookie,
        },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`EC returned ${res.status}`);
      }
      const text = (await res.text()).replace(/^\uFEFF/, "");
      const data = JSON.parse(text);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("EC returned an empty constituency payload");
      }
      const hasVotes = data.some(
        (candidate) => Number(candidate?.TotalVoteReceived || 0) > 0
      );
      if (!hasVotes) {
        throw new Error("EC returned a zeroed constituency payload");
      }
      return data;
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(1000 * (attempt + 1));
    }
  }

  throw new Error(`Unable to fetch constituency ${districtId}-${constNumber}`);
}

async function getSession() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${EC_BASE}/`, {
      headers: { "User-Agent": BROWSER_UA },
      redirect: "follow",
      signal: controller.signal,
    });

    const cookies = [];
    if (typeof res.headers.getSetCookie === "function") {
      cookies.push(...res.headers.getSetCookie());
    }
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") cookies.push(value);
    });

    let sessionId = "";
    let csrf = "";
    for (const header of cookies) {
      for (const part of String(header).split(",")) {
        const trimmed = part.trim();
        if (trimmed.startsWith("ASP.NET_SessionId=")) {
          sessionId = trimmed.split(";")[0].slice("ASP.NET_SessionId=".length);
        }
        if (trimmed.startsWith("CsrfToken=")) {
          csrf = trimmed.split(";")[0].slice("CsrfToken=".length);
        }
      }
    }

    if (!csrf) {
      throw new Error("Failed to acquire CSRF token from EC site");
    }

    return { sessionId, csrf };
  } finally {
    clearTimeout(timeout);
  }
}

function buildSeatPayload(row, rawCandidates) {
  const sorted = [...rawCandidates].sort(
    (left, right) => Number(right.TotalVoteReceived || 0) - Number(left.TotalVoteReceived || 0)
  );
  const totalVotes = sorted.reduce(
    (sum, candidate) => sum + Number(candidate.TotalVoteReceived || 0),
    0
  );
  const leader = sorted[0];
  const runnerUp = sorted[1];
  const leaderParty = leader
    ? getPartyMeta(Number(leader.SymbolID || 0), leader.PoliticalPartyName)
    : { shortName: "OTH", color: "#F59E0B" };
  const hasWinner = sorted.some((candidate) => candidate.Remarks === "Elected");
  const status = hasWinner ? "won" : totalVotes > 0 ? "leading" : "pending";
  const candidatesJson = sorted.map((candidate, index) => {
    const party = getPartyMeta(
      Number(candidate.SymbolID || 0),
      candidate.PoliticalPartyName
    );
    return {
      id: String(candidate.CandidateID),
      name: candidate.CandidateName,
      partyShortName: party.shortName,
      partyFullName: candidate.PoliticalPartyName || party.name,
      partyColor: party.color,
      symbolName: candidate.SymbolName || null,
      symbolId: Number(candidate.SymbolID || 0) || null,
      votes: Number(candidate.TotalVoteReceived || 0),
      photo: `/api/candidate-image/${candidate.CandidateID}`,
      status:
        candidate.Remarks === "Elected"
          ? "won"
          : index === 0 && totalVotes > 0
            ? "leading"
            : totalVotes > 0
              ? "trailing"
              : "pending",
      margin:
        index === 0 && runnerUp
          ? Math.max(
              Number(candidate.TotalVoteReceived || 0) -
                Number(runnerUp.TotalVoteReceived || 0),
              0
            )
          : undefined,
      gender: candidate.Gender || null,
      age: Number(candidate.Age || 0) || null,
      rank: candidate.Rank || String(index + 1),
      remarks: candidate.Remarks || null,
      dob: candidate.DOB || null,
      qualification: candidate.QUALIFICATION || null,
      address: candidate.ADDRESS || null,
      castedVote: Number(candidate.CastedVote || 0) || null,
      totalVoters: Number(candidate.TotalVoters || 0) || null,
    };
  });

  return {
    districtName: row.district_name,
    provinceId: Number(row.province_id || 0),
    provinceName: row.province_name,
    constituencyName: row.constituency_name || `${row.district_name}-${row.const_number}`,
    constituencySlug: row.constituency_slug || slugify(`${row.district_name}-${row.const_number}`),
    leaderName: leader?.CandidateName || "",
    leaderParty: leaderParty.shortName,
    leaderPartyColor: leaderParty.color,
    leaderVotes: Number(leader?.TotalVoteReceived || 0),
    runnerUpName: runnerUp?.CandidateName || "",
    runnerUpVotes: Number(runnerUp?.TotalVoteReceived || 0),
    margin:
      leader && runnerUp
        ? Math.max(
            Number(leader.TotalVoteReceived || 0) -
              Number(runnerUp.TotalVoteReceived || 0),
            0
          )
        : 0,
    totalVotes,
    status,
    candidatesJson,
    dataHash: crypto
      .createHash("md5")
      .update(
        JSON.stringify(
          sorted.map((candidate) => [
            candidate.CandidateID,
            Number(candidate.TotalVoteReceived || 0),
            candidate.Remarks || null,
          ])
        )
      )
      .digest("hex"),
  };
}

function getPartyMeta(symbolId, partyName) {
  if (PARTY_META[symbolId]) return PARTY_META[symbolId];
  if (partyName === "स्वतन्त्र" || partyName === "Independent") {
    return { name: "Independent", shortName: "IND", color: "#1E3A8A" };
  }
  if (partyName) {
    if (partyName.includes("स्वतन्त्र पार्टी") && partyName.includes("राष्ट्रिय")) return PARTY_META[2528];
    if (partyName.includes("काँग्रेस")) return PARTY_META[2583];
    if (partyName.includes("एकीकृत मार्क्सवादी")) return PARTY_META[2598];
    if (partyName.includes("प्रजातन्त्र पार्टी")) return PARTY_META[2604];
    if (partyName.includes("माओवादी") || partyName.includes("माओइस्ट")) return PARTY_META[2526];
    if (partyName.includes("समाजवादी पार्टी") && partyName.includes("जनता")) return PARTY_META[2542];
    if (partyName.includes("जनमत पार्टी")) return PARTY_META[2585];
    if (partyName.includes("नागरिक उन्मुक्ति")) return PARTY_META[2531];
    if (partyName.includes("श्रम संस्कृति")) return PARTY_META[2501];
    if (partyName.includes("उज्यालो")) return PARTY_META[2566];
    if (
      partyName.includes("लोकतान्त्रिक समाजवादी") ||
      partyName.includes("लोकतान्त्रिक समाजबादी")
    ) {
      return PARTY_META[2575];
    }
  }
  return { name: partyName || "Others", shortName: "OTH", color: "#F59E0B" };
}

async function invalidateCaches(redis) {
  const exactKeys = [
    "all_results",
    "all_results_db_v2",
    "all_results_rich_v1",
    "popular_candidates",
    "pr_party_results_v3",
    "results_summary",
    "parties",
    "districts_all",
  ];

  if (exactKeys.length) {
    await redis.del(...exactKeys);
  }

  await deletePattern(redis, "constituency_*");
  await deletePattern(redis, "live_seat_v1_*");

  console.log("[import-final-results] Redis summary caches invalidated");
}

async function deletePattern(redis, pattern) {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
    cursor = nextCursor;
    if (keys.length) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
