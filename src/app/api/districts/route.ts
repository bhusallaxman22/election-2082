import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/redis";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

interface MappedDistrict {
  id: number;
  name: string;
  nameNp: string;
  stateId: number;
  constituencies: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stateId = searchParams.get("state") ? Number(searchParams.get("state")) : null;

  try {
    const cacheKey = "districts_all";

    // 1. Try Redis (pre-warmed by sync)
    let allDistricts = await cacheGet<MappedDistrict[]>(cacheKey);

    // 2. Fallback to MariaDB
    if (!allDistricts) {
      await ensureSchema();
      const rows = await query<{
        district_id: number;
        name: string;
        name_np: string;
        state_id: number;
        constituencies: number;
      }>("SELECT district_id, name, name_np, state_id, constituencies FROM districts ORDER BY district_id");

      allDistricts = rows.map((r) => ({
        id: r.district_id,
        name: r.name,
        nameNp: r.name_np,
        stateId: r.state_id,
        constituencies: r.constituencies,
      }));
    }

    let result = allDistricts;
    if (stateId) {
      result = result.filter((d) => d.stateId === stateId);
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: { total: result.length, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch districts" },
      { status: 500 }
    );
  }
}
