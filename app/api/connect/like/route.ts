import { NextRequest, NextResponse } from "next/server";
import { getRoom, likeUser, partnerOf } from "@/lib/connect";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const roomId = Number(body?.roomId);
  const phone = typeof body?.phone === "string" ? body.phone : "";
  if (!roomId || !phone) return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 });

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ ok: false, error: "방을 찾을 수 없음" }, { status: 404 });

  const partner = partnerOf(room, phone);
  const mutual = await likeUser(roomId, phone, partner.phone);
  return NextResponse.json({ ok: true, mutual, partner });
}
