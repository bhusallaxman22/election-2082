/**
 * Server-side helper to fetch data from Nepal Election Commission (result.election.gov.np).
 * Handles session acquisition + CSRF token automatically.
 */

const EC_BASE = "https://result.election.gov.np";

let cachedSession: { cookie: string; csrf: string; ts: number } | null = null;
const SESSION_TTL = 4 * 60 * 1000; // 4 minutes (sessions expire quickly)

async function getSession(): Promise<{ cookie: string; csrf: string }> {
  if (cachedSession && Date.now() - cachedSession.ts < SESSION_TTL) {
    return cachedSession;
  }

  const controller = new AbortController();
  const sessionTimeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

  try {
    const res = await fetch(EC_BASE + "/", {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      signal: controller.signal,
    });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  let sessionId = "";
  let csrf = "";

  // Parse Set-Cookie headers
  for (const sc of setCookies) {
    if (sc.startsWith("ASP.NET_SessionId=")) {
      sessionId = sc.split(";")[0].split("=")[1];
    }
    if (sc.startsWith("CsrfToken=")) {
      csrf = sc.split(";")[0].split("=")[1];
    }
  }

  // Fallback: parse from raw headers if getSetCookie not available
  if (!sessionId || !csrf) {
    const rawHeaders = res.headers;
    const allCookies: string[] = [];
    rawHeaders.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        allCookies.push(value);
      }
    });
    for (const sc of allCookies) {
      for (const part of sc.split(",")) {
        const trimmed = part.trim();
        if (trimmed.startsWith("ASP.NET_SessionId=")) {
          sessionId = trimmed.split(";")[0].split("=")[1];
        }
        if (trimmed.startsWith("CsrfToken=")) {
          csrf = trimmed.split(";")[0].split("=")[1];
        }
      }
    }
  }

  if (!csrf) {
    throw new Error("Failed to obtain CSRF token from EC website");
  }

  const cookie = `ASP.NET_SessionId=${sessionId}; CsrfToken=${csrf}`;
  cachedSession = { cookie, csrf, ts: Date.now() };
  return cachedSession;
  } finally {
    clearTimeout(sessionTimeout);
  }
}

export async function fetchECJson<T = unknown>(filePath: string): Promise<T> {
  const { cookie, csrf } = await getSession();
  const url = `${EC_BASE}/Handlers/SecureJson.ashx?file=${filePath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15s timeout

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "X-Csrf-Token": csrf,
        Referer: EC_BASE + "/",
        Cookie: cookie,
      },
      signal: controller.signal,
    });

  if (!res.ok) {
    // Session might have expired – clear cache and retry once
    if (res.status === 403 && cachedSession) {
      cachedSession = null;
      const newSession = await getSession();
      const retry = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "X-Csrf-Token": newSession.csrf,
          Referer: EC_BASE + "/",
          Cookie: newSession.cookie,
        },
        signal: controller.signal,
      });
      if (!retry.ok) throw new Error(`EC API ${retry.status}: ${filePath}`);
      const text = await retry.text();
      // Handle BOM
      return JSON.parse(text.replace(/^\uFEFF/, ""));
    }
    throw new Error(`EC API ${res.status}: ${filePath}`);
  }

  const text = await res.text();
  return JSON.parse(text.replace(/^\uFEFF/, ""));
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Typed helpers for specific EC data ──────────────────────────────

export interface ECState {
  id: number;
  name: string;
}

export interface ECDistrict {
  id: number;
  name: string;
  parentId: number; // state ID
}

export interface ECConstituencyCount {
  distId: number;
  consts: number;
}

export interface ECCandidate {
  CandidateName: string;
  Gender: string;
  Age: number;
  PartyID: number;
  SymbolID: number;
  SymbolName: string;
  CandidateID: number;
  StateName: string;
  PoliticalPartyName: string;
  ElectionPost: string | null;
  DistrictCd: number;
  DistrictName: string;
  State: number;
  SCConstID: string;
  CenterConstID: string | null;
  SerialNo: number;
  TotalVoteReceived: number;
  CastedVote: number;
  TotalVoters: number;
  Rank: string;
  Remarks: string | null;
  DOB: string;
  QUALIFICATION: string;
  ADDRESS: string;
}

export interface ECPartyResult {
  PartyId: number;
  PoliticalPartyName: string;
  TotWin: number;
  TotLead: number;
  TotWinLead: number;
  SymbolID: number;
}

export async function fetchECStates(): Promise<ECState[]> {
  return fetchECJson("JSONFiles/Election2082/Local/Lookup/states.json");
}

export async function fetchECDistricts(): Promise<ECDistrict[]> {
  return fetchECJson("JSONFiles/Election2082/Local/Lookup/districts.json");
}

export async function fetchECConstituencyCounts(): Promise<ECConstituencyCount[]> {
  return fetchECJson("JSONFiles/Election2082/HOR/Lookup/constituencies.json");
}

export async function fetchECPartyResults(): Promise<ECPartyResult[]> {
  return fetchECJson("JSONFiles/Election2082/Common/HoRPartyTop5.txt");
}

export async function fetchECConstituencyResults(
  districtId: number,
  constNumber: number
): Promise<ECCandidate[]> {
  return fetchECJson(
    `JSONFiles/Election2082/HOR/FPTP/HOR-${districtId}-${constNumber}.json`
  );
}

// ─── District ID → English name mapping ──────────────────────────────
export const DISTRICT_NAME_MAP: Record<number, string> = {
  1: "Taplejung", 2: "Panchthar", 3: "Ilam", 4: "Jhapa",
  5: "Sankhuwasabha", 6: "Terhathum", 7: "Bhojpur", 8: "Dhankuta",
  9: "Morang", 10: "Sunsari", 11: "Solukhumbu", 12: "Khotang",
  13: "Okhaldhunga", 14: "Udayapur", 15: "Saptari", 16: "Siraha",
  17: "Dolakha", 18: "Ramechhap", 19: "Sindhuli", 20: "Dhanusha",
  21: "Mahottari", 22: "Sarlahi", 23: "Rasuwa", 24: "Dhading",
  25: "Nuwakot", 26: "Kathmandu", 27: "Bhaktapur", 28: "Lalitpur",
  29: "Kavrepalanchok", 30: "Sindhupalchok", 31: "Makwanpur",
  32: "Rautahat", 33: "Bara", 34: "Parsa", 35: "Chitwan",
  36: "Gorkha", 37: "Manang", 38: "Lamjung", 39: "Kaski",
  40: "Tanahun", 41: "Syangja", 42: "Gulmi", 43: "Palpa",
  44: "Arghakhanchi", 45: "Nawalparasi East", 46: "Rupandehi",
  47: "Kapilvastu", 48: "Mustang", 49: "Myagdi", 50: "Baglung",
  51: "Parbat", 52: "Rukum East", 53: "Rolpa", 54: "Pyuthan",
  55: "Salyan", 56: "Dang", 57: "Dolpa", 58: "Mugu",
  59: "Jumla", 60: "Kalikot", 61: "Humla", 62: "Jajarkot",
  63: "Dailekh", 64: "Surkhet", 65: "Banke", 66: "Bardiya",
  67: "Bajura", 68: "Achham", 69: "Bajhang", 70: "Doti",
  71: "Kailali", 72: "Darchula", 73: "Baitadi", 74: "Dadeldhura",
  75: "Kanchanpur", 77: "Nawalparasi West", 78: "Rukum West",
};

// ─── Party symbol ID → metadata mapping ──────────────────────────────
export interface PartyMeta {
  name: string;
  shortName: string;
  color: string;
}

export const EC_PARTY_META: Record<number, PartyMeta> = {
  // Verified against actual 2082 EC data (PoliticalPartyName field)
  2528: { name: "Rastriya Swatantra Party", shortName: "RSP", color: "#E63946" },
  2583: { name: "Nepali Congress", shortName: "NC", color: "#2196F3" },
  2598: { name: "CPN-UML", shortName: "CPN-UML", color: "#F44336" },
  2557: { name: "Nepal Communist Party", shortName: "NCP", color: "#FF5722" },
  2604: { name: "Rastriya Prajatantra Party", shortName: "RPP", color: "#FF9800" },
  2542: { name: "Janata Samajbadi Party", shortName: "JSP", color: "#4CAF50" },
  2526: { name: "CPN (Maoist Centre)", shortName: "Maoist", color: "#B71C1C" },
  2585: { name: "Janamat Party", shortName: "JP", color: "#795548" },
  2531: { name: "Nagarik Unmukti Party", shortName: "NUP", color: "#607D8B" },
  2575: { name: "Loktantrik Samajbadi Party", shortName: "LSP", color: "#00897B" },
  2501: { name: "Shram Sanskriti Party", shortName: "SSP", color: "#9C27B0" },
  2566: { name: "Ujaylo Nepal Party", shortName: "Ujaylo", color: "#FFC107" },
  2578: { name: "Nepal Majdur Kisan Party", shortName: "NWPP", color: "#C62828" },
  2522: { name: "Rastriya Janamorcha", shortName: "RJM", color: "#009688" },
};

// Deterministic color fallback
const FALLBACK_COLORS = [
  "#E63946", "#2196F3", "#FF5722", "#4CAF50", "#FF9800",
  "#9C27B0", "#00BCD4", "#795548", "#607D8B", "#FFC107",
];

/**
 * Get party metadata from EC symbolId.
 * Pass optional partyName (PoliticalPartyName from EC) to identify independents
 * and other unmapped parties.
 */
export function getPartyMeta(symbolId: number, partyName?: string): PartyMeta {
  // 1. Check known symbol IDs
  const known = EC_PARTY_META[symbolId];
  if (known) return known;

  // 2. Check if independent (स्वतन्त्र)
  if (partyName === "स्वतन्त्र" || partyName === "Independent") {
    return { name: "Independent", shortName: "IND", color: "#9E9E9E" };
  }

  // 3. Fuzzy match by Nepali name for parties not in the fixed symbolId map
  if (partyName) {
    if (partyName.includes("स्वतन्त्र पार्टी") && partyName.includes("राष्ट्रिय")) return EC_PARTY_META[2528]; // RSP
    if (partyName.includes("काँग्रेस")) return EC_PARTY_META[2583]; // NC
    if (partyName.includes("एकीकृत मार्क्सवादी")) return EC_PARTY_META[2598]; // CPN-UML
    if (partyName.includes("प्रजातन्त्र पार्टी")) return EC_PARTY_META[2604]; // RPP
    if (partyName.includes("माओवादी") || partyName.includes("माओइस्ट")) return EC_PARTY_META[2526]; // Maoist
    if (partyName.includes("समाजवादी पार्टी") && partyName.includes("जनता")) return EC_PARTY_META[2542]; // JSP
    if (partyName.includes("जनमत पार्टी")) return EC_PARTY_META[2585]; // JP
    if (partyName.includes("नागरिक उन्मुक्ति")) return EC_PARTY_META[2531]; // NUP
    if (partyName.includes("श्रम संस्कृति")) return EC_PARTY_META[2501]; // SSP
    if (partyName.includes("उज्यालो")) return EC_PARTY_META[2566]; // Ujaylo
    if (partyName.includes("लोकतान्त्रिक समाजवादी") || partyName.includes("लोकतान्त्रिक समाजबादी")) return EC_PARTY_META[2575]; // LSP
  }

  // 4. Fallback
  return {
    name: partyName || "Others",
    shortName: "OTH",
    color: FALLBACK_COLORS[symbolId % FALLBACK_COLORS.length],
  };
}
