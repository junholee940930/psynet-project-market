"use client";

import { useEffect, useState } from "react";
import { GRADE_COLOR, gradeFor, listProjects } from "@/lib/projects";

const SKILLS_KEY = "pm_skills";
const COMPLETED_KEY = "pm_completed";

function loadList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export default function ProjectsPage() {
  const [skills, setSkills] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setSkills(loadList(SKILLS_KEY));
    setCompleted(loadList(COMPLETED_KEY));
  }, []);

  const hasHistory = completed.length > 0;
  const projects = listProjects();

  return (
    <main className="cards-page">
      <h1>PROJECT MARKET — 전체 프로젝트</h1>
      <p className="sub">
        보유 스킬: {skills.join(", ") || "(미설정 — 홈 터미널에서 \"내 스킬은 ...\"으로 설정)"} ·{" "}
        <a href="/">← 터미널로</a>
      </p>
      <p className="sub">
        {hasHistory ? `활동 이력 ${completed.length}건 → 등급 산출됨` : "활동 이력 없음 → 전 프로젝트 '신규' 표시 (등급 미산출)"}
      </p>
      {projects.map((p) => {
        const overlap = p.required_skills.filter((s) => skills.includes(s));
        const label = hasHistory ? gradeFor(skills, p.required_skills) : "신규";
        const color = GRADE_COLOR[label];
        return (
          <div className="card" key={p.id}>
            <div className="grade" style={{ background: color + "22", color }}>
              {label}
            </div>
            <div>
              <div className="title">{p.title}</div>
              <div className="meta">요구 스킬: {p.required_skills.join(", ") || "-"}</div>
              <div className="meta">일치 스킬: {overlap.join(", ") || "없음"}</div>
              <div className="meta">PM: {p.pm}</div>
            </div>
          </div>
        );
      })}
    </main>
  );
}
