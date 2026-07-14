"use client";

import { useEffect, useRef, useState } from "react";

type LogLine = { text: string; cls?: "u" | "dim" | "banner" };
type Session = { name: string; phone: string };

const SESSION_KEY = "pm_session";

function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

const INTRO: LogLine[] = [
  { text: "PROJECT MARKET", cls: "banner" },
  { text: "프로젝트는 이름으로 찾고 부르면 됨. 대화하듯 입력하면 됨. 예시:", cls: "dim" },
  { text: '  · "로그인 이준호 010-1234-5678 junho@psynet.co.kr" → 로그인(이메일 선택, 처음이면 자동 가입)', cls: "dim" },
  { text: '  · "AI/ML 관련 프로젝트 찾아줘"           → 매칭 조회', cls: "dim" },
  { text: '  · "다크모드 프로젝트 현황 어때?"          → 협의방 조회', cls: "dim" },
  { text: '  · "다크모드 프로젝트에 나 20% 지분 넣고싶어" → 지분 제안·참여 등록', cls: "dim" },
  { text: '  · "이개발 30%, 박기획 50% 추가"          → 이어서 여러 명 한번에 등록', cls: "dim" },
  { text: '  · "다 됐어 확정하자"                    → 전원 합의 시 지분 확정 (합계 100% 필요)', cls: "dim" },
  { text: '  · "내 스킬은 기획,마케팅,운영이야"        → 스킬 프로필 저장(로그인 필요)', cls: "dim" },
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
  const [session, setSession] = useState<Session | null>(null);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [log]);

  function append(text: string, cls?: LogLine["cls"]) {
    setLog((prev) => [...prev, { text, cls }]);
  }

  function persistSession(next: Session | null) {
    setSession(next);
    if (next) window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(SESSION_KEY);
  }

  async function submit(cmd: string) {
    if (!cmd.trim()) return;
    append("❯ " + cmd, "u");
    setHistory((h) => [...h, cmd]);
    setHIdx((h) => h + 1);
    setValue("");

    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd, session, lastProjectId }),
      });
      const data = await res.json();
      if ("session" in data) {
        persistSession(data.session);
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
            project-market — <b>{session ? `${session.name}님` : "LOGGED OUT"}</b>
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
          <span id="prompt">{session ? `${session.name}❯` : "❯"}</span>
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
