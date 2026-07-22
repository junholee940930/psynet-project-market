import { NextRequest, NextResponse } from "next/server";
import { leaveQueue } from "@/lib/connect";
import { normalizePhone } from "@/lib/auth";

export const runtime = "nodejs";

// sendBeacon은 POST만 지원해서 DELETE /api/connect/queue와 별개로 둠 —
// 탭 닫기/페이지 이탈 시 대기열 정리용(beforeunload, 컴포넌트 unmount).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "");
  if (!phone) return NextResponse.json({ ok: false }, { status: 400 });
  await leaveQueue(phone);
  return NextResponse.json({ ok: true });
}
