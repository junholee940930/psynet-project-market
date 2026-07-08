import { NextRequest, NextResponse } from "next/server";
import { processCommand } from "@/lib/commands";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.cmd !== "string") {
    return NextResponse.json({ output: "[오류] 잘못된 요청", lastProjectId: null }, { status: 400 });
  }

  const result = await processCommand(body.cmd, {
    skills: Array.isArray(body.skills) ? body.skills : [],
    completed: Array.isArray(body.completed) ? body.completed : [],
    lastProjectId: typeof body.lastProjectId === "string" ? body.lastProjectId : null,
  });

  return NextResponse.json(result);
}
