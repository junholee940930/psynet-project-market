import { NextRequest, NextResponse } from "next/server";
import { getUserByPhone, normalizePhone } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rawPhone = req.nextUrl.searchParams.get("phone");
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (!phone) {
    return NextResponse.json({ skills: [], completed: [] });
  }
  try {
    const user = await getUserByPhone(phone);
    return NextResponse.json({
      skills: user?.skills ?? [],
      completed: user?.completed_projects ?? [],
    });
  } catch {
    return NextResponse.json({ skills: [], completed: [] });
  }
}
