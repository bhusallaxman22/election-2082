import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync — manually trigger a sync cycle.
 * Also auto-triggered on first API request to bootstrap data.
 * Protected by a simple secret header.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret");
  const expectedSecret = process.env.SYNC_SECRET || "election2082";

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSync();
  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/sync — returns sync status (last sync info).
 */
export async function GET() {
  try {
    const { query } = await import("@/lib/db");
    const { ensureSchema } = await import("@/lib/migrate");
    await ensureSchema();

    const logs = await query<{
      id: number;
      sync_type: string;
      started_at: string;
      finished_at: string | null;
      rows_changed: number;
      status: string;
    }>("SELECT * FROM sync_log ORDER BY id DESC LIMIT 5");

    const counts = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM constituency_results"
    );

    return NextResponse.json({
      success: true,
      recentSyncs: logs,
      constituenciesInDB: counts[0]?.cnt ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
