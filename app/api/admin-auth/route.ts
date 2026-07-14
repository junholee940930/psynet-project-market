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
    // "/admin" 페이지뿐 아니라 "/api/admin-applications"(수락·거절) 요청에도 실려야 하므로
    // 사이트 전체 경로로 설정. httpOnly + 토큰이 비밀번호의 해시값이라는 점으로 보호.
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete({ name: ADMIN_COOKIE, path: "/" });
  return res;
}
