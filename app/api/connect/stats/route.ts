import { NextResponse } from "next/server";
import { getConnectStats } from "@/lib/connect";

export const runtime = "nodejs";

export async function GET() {
  const stats = await getConnectStats();
  return NextResponse.json({ ok: true, ...stats });
}
