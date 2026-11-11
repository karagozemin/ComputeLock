import { NextResponse } from "next/server";
import { fetchSiciMarket } from "@/lib/injective";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await fetchSiciMarket();
  return NextResponse.json(snapshot, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
