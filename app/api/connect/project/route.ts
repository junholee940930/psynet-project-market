import { NextRequest, NextResponse } from "next/server";
import { createConnectProject, getRoom, partnerOf } from "@/lib/connect";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const roomId = Number(body?.roomId);
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  if (!roomId || !phone || !name || !title) {
    return NextResponse.json({ ok: false, error: "제목은 필수야." }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ ok: false, error: "방을 찾을 수 없음" }, { status: 404 });

  const partner = partnerOf(room, phone);
  const project = await createConnectProject(roomId, title, summary, phone, name, partner.phone, partner.name);
  return NextResponse.json({ ok: true, project });
}
