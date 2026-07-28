import { NextRequest, NextResponse } from "next/server";
import { matchOrQueue, leaveQueue } from "@/lib/connect";
import { getUserByPhone, normalizePhone } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "");
  if (!name || !phone) return NextResponse.json({ ok: false, error: "로그인 정보 없음" }, { status: 400 });

  // 매칭 전 로그인 필요 — 터미널에서 이름+전화번호로 로그인하면 자동 등록됨.
  const user = await getUserByPhone(phone);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "먼저 터미널에서 로그인해줘 (이름 전화번호)." },
      { status: 403 }
    );
  }

  const roomId = await matchOrQueue(phone, name);
  return NextResponse.json({ ok: true, roomId });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "");
  if (!phone) return NextResponse.json({ ok: false, error: "로그인 정보 없음" }, { status: 400 });
  await leaveQueue(phone);
  return NextResponse.json({ ok: true });
}
