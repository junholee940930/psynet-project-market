import { NextRequest, NextResponse } from "next/server";
import { getRoom, isBotPhone, likeUser, partnerOf } from "@/lib/connect";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const roomId = Number(body?.roomId);
  const phone = typeof body?.phone === "string" ? body.phone : "";
  if (!roomId || !phone) return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 });

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ ok: false, error: "방을 찾을 수 없음" }, { status: 404 });

  const partner = partnerOf(room, phone);
  let mutual = await likeUser(roomId, phone, partner.phone);

  // 상대가 시뮬레이션 봇이면 항상 맞호감표시 — 시뮬레이션에서 프로젝트 생성까지 테스트 가능하게.
  if (!mutual && isBotPhone(partner.phone)) {
    mutual = await likeUser(roomId, partner.phone, phone);
  }

  return NextResponse.json({ ok: true, mutual, partner });
}
