import { NextRequest, NextResponse } from "next/server";
import {
  runExternalBackfillOnce,
  runExternalConstituencyProbe,
  runSync,
  startSyncLoop,
  stopSyncLoop,
  waitForSyncIdle,
} from "@/lib/sync";
import { ENABLE_BACKGROUND_SYNC } from "@/lib/results-mode";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync — manually trigger a sync cycle.
 * Also auto-triggered on first API request to bootstrap data.
 * Protected by a simple secret header.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret");
  const expectedSecret = process.env.SYNC_SECRET || "election2082";
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let result: Record<string, unknown>;
  if (mode === "stop-loop") {
    stopSyncLoop();
    result = { stopped: true };
  } else if (mode === "start-loop") {
    if (!ENABLE_BACKGROUND_SYNC) {
      result = { started: false, reason: "disabled-in-final-results-mode" };
    } else {
      startSyncLoop();
      result = { started: true };
    }
  } else if (mode === "backfill-once") {
    stopSyncLoop();
    const idle = await waitForSyncIdle();
    if (!idle) {
      if (ENABLE_BACKGROUND_SYNC) startSyncLoop();
      return NextResponse.json(
        { success: false, error: "Sync worker is busy. Try again shortly." },
        { status: 409 }
      );
    }
    result = await runExternalBackfillOnce();
    if (ENABLE_BACKGROUND_SYNC) startSyncLoop();
  } else if (mode === "probe") {
    const districtId = Number(url.searchParams.get("districtId"));
    const constNum = Number(url.searchParams.get("constNumber"));
    if (!Number.isInteger(districtId) || !Number.isInteger(constNum)) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide valid integer districtId and constNumber for probe mode",
        },
        { status: 400 }
      );
    }
    result = await runExternalConstituencyProbe(districtId, constNum);
  } else {
    result = await runSync();
  }

  return NextResponse.json({
    success: true,
    mode:
      mode === "backfill-once"
        ? "backfill-once"
        : mode === "probe"
          ? "probe"
          : "normal",
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
