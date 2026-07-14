import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, checkAdminPassword, computeAdminToken } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ ok: false, error: "비밀번호가 틀렸어." }, { status: 401 });
  }

  const token = computeAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete({ name: ADMIN_COOKIE, path: "/admin" });
  return res;
}
