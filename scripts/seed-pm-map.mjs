#!/usr/bin/env node
// source-data/projects/*.md 의 PM 실명을 Supabase project_pm_map 테이블에 업서트.
// 로컬 1회 실행용 — 결과물(PM 실명)은 git에 절대 커밋하지 않음(저장소가 public GitHub).
// 실행: node scripts/seed-pm-map.mjs  (.env.local의 SUPABASE_URL/SERVICE_ROLE_KEY 사용)

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "source-data", "projects");

for (const line of readFileSync(path.join(ROOT, ".env.local"), "utf-8").split("\n")) {
  if (!line.trim()) continue;
  const i = line.indexOf("=");
  process.env[line.slice(0, i)] = line.slice(i + 1);
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
  }
  return fm;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const files = readdirSync(SRC_DIR).filter((f) => f.endsWith(".md"));

  const rows = [];
  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    const fm = parseFrontmatter(readFileSync(path.join(SRC_DIR, file), "utf-8"));
    if (fm.pm) rows.push({ project_id: id, pm_full_name: fm.pm.trim() });
  }

  const { error, count } = await supabase
    .from("project_pm_map")
    .upsert(rows, { onConflict: "project_id", count: "exact" });

  if (error) {
    console.error("실패:", error.message);
    process.exit(1);
  }
  console.log(`project_pm_map 업서트 완료: ${rows.length}건`);
}

main();
