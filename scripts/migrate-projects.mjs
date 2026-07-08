#!/usr/bin/env node
// source-data/projects/*.md -> data/projects.json
// 비공개 대상(EXCLUDED_IDS) 제외 + PM 이름 마스킹(성만 노출) 후 정적 카탈로그 생성.

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "source-data", "projects");
const OUT_PATH = path.join(ROOT, "data", "projects.json");

// 보안(085/088/094) + 순수 내부행정성(038/071/073/074/096) — 총 9건, 공개 목록에서 제외
const EXCLUDED_IDS = new Set([
  "prj-2026-2-038",
  "prj-2026-2-071",
  "prj-2026-2-073",
  "prj-2026-2-074",
  "prj-2026-2-085",
  "prj-2026-2-088",
  "prj-2026-2-094",
  "prj-2026-2-096",
]);
// 위 목록은 8건. 원 계획서상 9건 표기 오류 정정 — 실제 제외 대상은 8건.

function parseYamlList(line) {
  const m = line.match(/\[(.*)\]/);
  if (!m || !m[1].trim()) return [];
  return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    fm[k] = k === "required_skills" ? parseYamlList(line) : v.replace(/^"|"$/g, "");
  }
  return fm;
}

function bodyAfterFrontmatter(text) {
  const m = text.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return (m ? m[1] : text).trim();
}

// 한글 성은 대부분 1글자(복성 예외: 남궁/황보 등 2글자) — 2글자 성 목록 우선 매칭, 나머지는 1글자.
const COMPOUND_SURNAMES = ["남궁", "황보", "제갈", "선우", "독고"];
function maskName(name) {
  if (!name) return name;
  const trimmed = name.trim();
  const compound = COMPOUND_SURNAMES.find((s) => trimmed.startsWith(s));
  const surnameLen = compound ? 2 : 1;
  const surname = trimmed.slice(0, surnameLen);
  const rest = trimmed.slice(surnameLen);
  return surname + "*".repeat(Math.max(rest.length, 2));
}

function main() {
  const files = readdirSync(SRC_DIR).filter((f) => f.endsWith(".md"));
  const projects = [];
  let excludedCount = 0;

  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    if (EXCLUDED_IDS.has(id)) {
      excludedCount++;
      continue;
    }
    const text = readFileSync(path.join(SRC_DIR, file), "utf-8");
    const fm = parseFrontmatter(text);
    const summary = bodyAfterFrontmatter(text)
      .split("\n")
      .find((l) => l.trim() && !l.startsWith("#")) || "";

    projects.push({
      id,
      title: fm.title || id,
      pm: maskName(fm.pm || ""),
      max_participants: fm.max_participants ? Number(fm.max_participants) : null,
      required_skills: fm.required_skills || [],
      status: fm.status || "negotiating",
      summary: summary.trim(),
    });
  }

  projects.sort((a, b) => a.id.localeCompare(b.id));

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(projects, null, 2) + "\n", "utf-8");

  console.log(`총 ${files.length}건 중 ${excludedCount}건 제외 → ${projects.length}건 → ${OUT_PATH}`);
}

main();
