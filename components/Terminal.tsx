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

function greeting(session: Session | null): LogLine[] {
  if (session) {
    return [
      { text: "PROJECT MARKET", cls: "banner" },
      { text: `다시 왔네, ${session.name}님. 바로 검색하면 됨 — 예) "AI/ML 프로젝트 찾아줘"`, cls: "dim" },
    ];
  }
  return [
    { text: "PROJECT MARKET", cls: "banner" },
    { text: "누구세요? 이름이랑 전화번호부터 알려줘 (예: 이준호 010-1234-5678, 이메일은 선택)", cls: "dim" },
  ];
}

export default function Terminal() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(0);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setLog(greeting(s));
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
