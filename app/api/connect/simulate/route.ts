import { NextRequest, NextResponse } from "next/server";
import { startSimulatedMatch } from "@/lib/connect";
import { normalizePhone } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "");
  if (!name || !phone) return NextResponse.json({ ok: false, error: "로그인 정보 없음" }, { status: 400 });

  const roomId = await startSimulatedMatch(phone, name);
  return NextResponse.json({ ok: true, roomId });
}
