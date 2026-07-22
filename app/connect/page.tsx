"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function ConnectPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<{ waiting: number; activeRooms: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (s) startMatching(s);

    fetchStats();
    statsRef.current = setInterval(fetchStats, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStats() {
    const res = await fetch("/api/connect/stats");
    const data = await res.json();
    if (data.ok) setStats({ waiting: data.waiting, activeRooms: data.activeRooms });
  }

  async function poll(s: Session) {
    const res = await fetch("/api/connect/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const data = await res.json();
    if (data.ok && data.roomId) {
      if (pollRef.current) clearInterval(pollRef.current);
      router.push(`/connect/room/${data.roomId}`);
    } else if (!data.ok) {
      setError(data.error || "매칭 실패");
      setWaiting(false);
    }
  }

  async function startMatching(s: Session) {
    setError("");
    setWaiting(true);
    await poll(s);
    pollRef.current = setInterval(() => poll(s), 2000);
  }

  async function cancelMatching() {
    if (pollRef.current) clearInterval(pollRef.current);
    setWaiting(false);
    if (session) {
      await fetch("/api/connect/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
    }
  }

  return (
    <main className="cards-page" style={{ maxWidth: 480, textAlign: "center" }}>
      <h1>미토크리에이트</h1>
      <p className="sub">낯선 동료와 랜덤으로 1:1 매칭돼서 대화하는 공간.</p>
      {stats && (
        <p className="sub" style={{ fontSize: 12, marginTop: 4 }}>
          지금 대기 중 {stats.waiting}명 · 대화 중인 방 {stats.activeRooms}개
        </p>
      )}

      {!session ? (
        <p className="sub" style={{ marginTop: 24 }}>
          로그인 안 됨 — <a href="/start">터미널에서 먼저 로그인</a>해줘.
        </p>
      ) : (
        <div style={{ marginTop: 32 }}>
          <p className="sub">{session.name}님</p>
          {waiting && (
            <>
              <p className="sub" style={{ margin: "16px 0" }}>
                상대를 찾는 중… (대기자가 나타나면 자동으로 연결돼)
              </p>
              <button onClick={cancelMatching} style={{ ...btnStyle, background: "transparent", color: "#8c887e", border: "1px solid #302e2a" }}>
                취소
              </button>
            </>
          )}
          {error && <p className="sub" style={{ color: "#ff5a4e" }}>{error}</p>}
        </div>
      )}

      <p className="sub" style={{ marginTop: 40 }}>
        <a href="/start">← 프로젝트 마켓으로</a>
      </p>
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "10px 24px",
  background: "#ffb800",
  color: "#0b0b0a",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
