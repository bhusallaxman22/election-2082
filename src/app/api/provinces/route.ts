import { NextRequest, NextResponse } from "next/server";
import { provinces, proportionalResults2079, proportionalResults2074 } from "@/data/provinces";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const province = provinces.find((p) => p.id === parseInt(id));
    if (!province) {
      return NextResponse.json(
        { success: false, error: "Province not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: province });
  }

  return NextResponse.json({
    success: true,
    data: provinces,
    meta: {
      totalProvinces: provinces.length,
      totalSeats: provinces.reduce((sum, p) => sum + p.totalSeats, 0),
      timestamp: new Date().toISOString(),
    },
  });
}
