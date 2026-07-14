"use client";

import { useEffect, useState } from "react";
import { GRADE_COLOR, gradeFor, listProjects } from "@/lib/projects";

const SESSION_KEY = "pm_session";

type Session = { name: string; phone: string };

function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export default function ProjectsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (!s) return;
    fetch(`/api/profile?phone=${encodeURIComponent(s.phone)}`)
      .then((r) => r.json())
      .then((d) => {
        setSkills(Array.isArray(d.skills) ? d.skills : []);
        setCompleted(Array.isArray(d.completed) ? d.completed : []);
      })
      .catch(() => {});
  }, []);

  const hasHistory = completed.length > 0;
  const projects = listProjects();

  return (
    <main className="cards-page">
      <h1>PROJECT MARKET — 전체 프로젝트</h1>
      <p className="sub">
        {session ? `${session.name}님 · 보유 스킬: ${skills.join(", ") || "(미설정)"}` : '로그인 안 됨 — 홈 터미널에서 "로그인 <이름> <전화번호>"'}
        {" · "}
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
