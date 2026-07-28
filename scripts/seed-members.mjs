#!/usr/bin/env node
// source-data/season2-members.json → Supabase users 업서트.
// 엑셀 협업자 명단의 고유 멤버를 users 레지스트리에 넣어 관리자 "전체 사용자"에 뜨게 한다.
// phone은 로그인 식별자라 필수·유일 — 실제 번호가 없으므로 사번 기반 합성값(emp-<사번>)을 쓴다.
// (실제 사원이 본인 번호로 로그인하면 별도 행이 생김 — phone이 계정 식별자인 기존 설계 특성.)
// 실행: node scripts/seed-members.mjs   (.env.local 사용)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

for (const line of readFileSync(path.join(ROOT, ".env.local"), "utf-8").split("\n")) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i === -1) continue;
  process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const members = JSON.parse(readFileSync(path.join(ROOT, "source-data", "season2-members.json"), "utf-8"));
const rows = members.map((m) => ({ phone: `emp-${m.emp_id}`, name: m.name }));
console.log(`시드 대상: ${rows.length}명`);

const { error } = await supabase.from("users").upsert(rows, { onConflict: "phone" });
if (error) {
  console.error("업서트 실패:", error.message);
  process.exit(1);
}
console.log("완료.");
