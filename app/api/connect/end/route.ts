import { NextRequest, NextResponse } from "next/server";
import { endRoom, getRoom } from "@/lib/connect";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const roomId = Number(body?.roomId);
  if (!roomId) return NextResponse.json({ ok: false, error: "roomId 필요" }, { status: 400 });

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ ok: false, error: "방을 찾을 수 없음" }, { status: 404 });
  if (room.status === "active") await endRoom(roomId);

  return NextResponse.json({ ok: true });
}
