#!/usr/bin/env node
// source-data/season2-participants.json → Supabase project_participants 업서트.
// 로컬 1회 실행용. 실명이 들어가므로 결과는 git에 커밋 안 됨(테이블 자체가 DB 전용).
// 선행 조건: Supabase SQL 편집기에서 project_participants 테이블을 먼저 생성(schema.sql 참고).
// 실행: node scripts/seed-participants.mjs   (.env.local의 SUPABASE_URL/SERVICE_ROLE_KEY 사용)

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

const rows = JSON.parse(readFileSync(path.join(ROOT, "source-data", "season2-participants.json"), "utf-8"));
console.log(`시드 대상: ${rows.length}행`);

let ok = 0;
for (let i = 0; i < rows.length; i += 100) {
  const chunk = rows.slice(i, i + 100).map((r) => ({ project_id: r.project_id, name: r.name, role: r.role }));
  const { error } = await supabase
    .from("project_participants")
    .upsert(chunk, { onConflict: "project_id,name" });
  if (error) {
    console.error("업서트 실패:", error.message);
    process.exit(1);
  }
  ok += chunk.length;
  console.log(`  ${ok}/${rows.length}`);
}
console.log("완료.");
