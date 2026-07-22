import { NextRequest, NextResponse } from "next/server";
import { redeemInvite } from "@/lib/connect";
import { normalizePhone } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const rawPhone = typeof body?.phone === "string" ? body.phone : "";
  const phone = normalizePhone(rawPhone);

  if (!code || !name || !phone) {
    return NextResponse.json({ ok: false, error: "초대코드/이름/전화번호를 모두 입력해줘." }, { status: 400 });
  }

  const result = await redeemInvite(code, name, phone);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, session: result.session });
}
