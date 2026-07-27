import { NextRequest, NextResponse } from "next/server";
import { getProjectsByParticipant } from "@/lib/participants";

export const runtime = "nodejs";

// 호감 성사 후: 상대(name)의 참여 프로젝트 리스트를 반환. 실패 시 빈 배열(폴백용).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ ok: false, projects: [] }, { status: 400 });
  }
  try {
    const projects = await getProjectsByParticipant(name.trim());
    return NextResponse.json({ ok: true, projects });
  } catch {
    // 테이블 미생성 등 오류 → 빈 목록으로 폴백(호감 흐름이 깨지지 않게)
    return NextResponse.json({ ok: true, projects: [] });
  }
}
