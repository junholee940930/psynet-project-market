"use client";

import { useEffect, useRef, useState } from "react";

type LogLine = { text: string; cls?: "u" | "dim" | "banner" };

const SKILLS_KEY = "pm_skills";
const COMPLETED_KEY = "pm_completed";

function loadList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

const INTRO: LogLine[] = [
  { text: "PROJECT MARKET", cls: "banner" },
  { text: "프로젝트는 이름으로 찾고 부르면 됨. 대화하듯 입력하면 됨. 예시:", cls: "dim" },
  { text: '  · "AI/ML 관련 프로젝트 찾아줘"           → 매칭 조회', cls: "dim" },
  { text: '  · "다크모드 프로젝트 현황 어때?"          → 협의방 조회', cls: "dim" },
  { text: '  · "다크모드 프로젝트에 나 20% 지분 넣고싶어" → 지분 제안·참여 등록', cls: "dim" },
  { text: '  · "이개발 30%, 박기획 50% 추가"          → 이어서 여러 명 한번에 등록', cls: "dim" },
  { text: '  · "다 됐어 확정하자"                    → 전원 합의 시 지분 확정 (합계 100% 필요)', cls: "dim" },
  { text: '  · "내 스킬은 기획,마케팅,운영이야"        → 스킬 프로필 저장', cls: "dim" },
  { text: '  · "프로젝트 총 몇개야?"                 → 등록 건수', cls: "dim" },
  { text: "도움말 입력하면 사용법 다시 볼 수 있음", cls: "dim" },
  { text: "──────────────────────────────────────────", cls: "dim" },
];

export default function Terminal() {
  const [log, setLog] = useState<LogLine[]>(INTRO);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(0);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [log]);

  function append(text: string, cls?: LogLine["cls"]) {
    setLog((prev) => [...prev, { text, cls }]);
  }

  async function submit(cmd: string) {
    if (!cmd.trim()) return;
    append("❯ " + cmd, "u");
    setHistory((h) => [...h, cmd]);
    setHIdx((h) => h + 1);
    setValue("");

    const skills = loadList(SKILLS_KEY);
    const completed = loadList(COMPLETED_KEY);

    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd, skills, completed, lastProjectId }),
      });
      const data = await res.json();
      if (Array.isArray(data.newSkills)) {
        window.localStorage.setItem(SKILLS_KEY, JSON.stringify(data.newSkills));
      }
      if (typeof data.lastProjectId === "string" || data.lastProjectId === null) {
        setLastProjectId(data.lastProjectId);
      }
      append(data.output || "");
    } catch {
      append("[오류] 서버 연결 실패");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (e.nativeEvent.isComposing) return; // 한글 IME 조합 중 엔터 무시
      submit(value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHIdx((idx) => {
        const next = Math.max(idx - 1, 0);
        if (history[next] !== undefined) setValue(history[next]);
        return next;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHIdx((idx) => {
        const next = idx + 1;
        if (next >= history.length) {
          setValue("");
          return history.length;
        }
        setValue(history[next]);
        return next;
      });
    }
  }

  return (
    <div className="term-wrap">
      <div id="window">
        <div id="titlebar">
          <span className="dot r" />
          <span className="dot y" />
          <span className="dot g" />
          <span className="tb-title">
            project-market — <b>LIVE</b>
          </span>
        </div>
        <div id="term" ref={termRef} onClick={() => document.getElementById("cmdInput")?.focus()}>
          {log.map((l, i) => (
            <div key={i} className={l.cls}>
              {l.text}
            </div>
          ))}
        </div>
        <div id="inputLine">
          <span id="prompt">❯</span>
          <input
            id="cmdInput"
            autoFocus
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  );
}
