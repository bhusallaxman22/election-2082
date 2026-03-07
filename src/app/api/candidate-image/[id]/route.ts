import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const dynamic = "force-dynamic";

const EC_IMAGE_URL = "https://result.election.gov.np/Images/Candidate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidateId = Number(id);
  if (!candidateId || candidateId <= 0) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  try {
    await ensureSchema();

    // 1. Check DB cache
    const rows = await query<{ image_data: Buffer; content_type: string }>(
      "SELECT image_data, content_type FROM candidate_images WHERE candidate_id = ?",
      [candidateId]
    );

    if (rows.length > 0) {
      const { image_data, content_type } = rows[0];
      return new NextResponse(new Uint8Array(image_data), {
        headers: {
          "Content-Type": content_type,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    // 2. Fetch from EC and store
    const ecUrl = `${EC_IMAGE_URL}/${candidateId}.jpg`;
    const res = await fetch(ecUrl, { signal: AbortSignal.timeout(10_000) });

    if (!res.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";

    // Store in DB (fire-and-forget, don't block response)
    const { getPool } = await import("@/lib/db");
    const pool = getPool();
    pool
      .execute(
        "INSERT INTO candidate_images (candidate_id, image_data, content_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)",
        [candidateId, buffer, contentType]
      )
      .catch(() => {});

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
