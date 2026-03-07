import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

async function ensureVisitorTable() {
  await ensureSchema();
  await execute(`
    CREATE TABLE IF NOT EXISTS site_visitors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ip_hash VARCHAR(64) NOT NULL,
      first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      visit_count INT DEFAULT 1,
      UNIQUE KEY uk_ip (ip_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function hashIP(ip: string): string {
  // Simple hash — no need for crypto-grade since it's just for counting
  let hash = 0;
  const salt = "election2082";
  const salted = salt + ip;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(request: NextRequest) {
  try {
    await ensureVisitorTable();

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashIP(ip);

    await execute(
      `INSERT INTO site_visitors (ip_hash) VALUES (?)
       ON DUPLICATE KEY UPDATE last_visit = CURRENT_TIMESTAMP, visit_count = visit_count + 1`,
      [ipHash]
    );

    const rows = await query<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM site_visitors");
    const uniqueCount = rows[0]?.cnt ?? 0;

    return NextResponse.json({ count: uniqueCount });
  } catch {
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureVisitorTable();
    const rows = await query<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM site_visitors");
    const uniqueCount = rows[0]?.cnt ?? 0;
    return NextResponse.json({ count: uniqueCount });
  } catch {
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
