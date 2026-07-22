import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/adminAuth";
import { createInvite, externalUserCount, listInvites } from "@/lib/connect";

export const runtime = "nodejs";

function assertAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  return isValidAdminToken(token);
}

export async function GET(req: NextRequest) {
  if (!assertAdmin(req)) return NextResponse.json({ ok: false, error: "인증 필요" }, { status: 401 });
  const [invites, externalCount] = await Promise.all([listInvites(), externalUserCount()]);
  return NextResponse.json({ ok: true, invites, externalCount });
}

export async function POST(req: NextRequest) {
  if (!assertAdmin(req)) return NextResponse.json({ ok: false, error: "인증 필요" }, { status: 401 });
  const invite = await createInvite();
  return NextResponse.json({ ok: true, invite });
}
