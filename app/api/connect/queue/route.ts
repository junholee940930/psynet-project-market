import { NextRequest, NextResponse } from "next/server";
import { matchOrQueue, leaveQueue } from "@/lib/connect";
import { getUserByPhone, normalizePhone } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "");
  if (!name || !phone) return NextResponse.json({ ok: false, error: "로그인 정보 없음" }, { status: 400 });

  // 실명제 폐쇄형 — users에 이미 등록된 사람(기존 프로젝트 마켓 유저 또는 초대코드로 가입한 외부인)만 입장 가능.
  const user = await getUserByPhone(phone);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "가입된 계정이 아니야. 터미널에서 먼저 로그인하거나 초대코드로 가입해줘." },
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
