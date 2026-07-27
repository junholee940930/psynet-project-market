import { NextRequest, NextResponse } from "next/server";
import { getRoom, listMessages, partnerOf, sendMessage } from "@/lib/connect";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const roomId = Number(req.nextUrl.searchParams.get("roomId"));
  const phone = req.nextUrl.searchParams.get("phone") || "";
  if (!roomId) return NextResponse.json({ ok: false, error: "roomId 필요" }, { status: 400 });

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ ok: false, error: "방을 찾을 수 없음" }, { status: 404 });

  const messages = room.status === "active" ? await listMessages(roomId) : [];
  return NextResponse.json({
    ok: true,
    room,
    partner: partnerOf(room, phone),
    messages,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const roomId = Number(body?.roomId);
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!roomId || !phone || !name || !content) {
    return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room || room.status !== "active") {
    return NextResponse.json({ ok: false, error: "종료된 방이야." }, { status: 400 });
  }

  await sendMessage(roomId, phone, name, content);
  return NextResponse.json({ ok: true });
}
