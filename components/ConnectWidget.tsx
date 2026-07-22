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

function leaveQueueBeacon(session: Session) {
  const body = JSON.stringify(session);
  const sent = navigator.sendBeacon?.(
    "/api/connect/leave",
    new Blob([body], { type: "application/json" })
  );
  if (!sent) {
    fetch("/api/connect/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

/**
 * 미토크리에이트 매칭 위젯 — /start에 바로 임베드됨(별도 페이지/버튼 없음).
 * 로그인돼 있으면 마운트되자마자 자동으로 대기열에 들어가고, 매칭되면 방으로 이동.
 * 대기 중에 탭을 닫거나 다른 페이지로 이동하면 대기열에서 자동으로 빠짐 — 안 그러면 유령 대기 생김.
 */
export default function ConnectWidget() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [stats, setStats] = useState<{ waiting: number; activeRooms: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitingRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    sessionRef.current = s;
    if (s) startMatching(s);

    fetchStats();
    statsRef.current = setInterval(fetchStats, 4000);

    function onBeforeUnload() {
      if (waitingRef.current && sessionRef.current) leaveQueueBeacon(sessionRef.current);
    }
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (pollRef.current) clearInterval(pollRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
      if (waitingRef.current && sessionRef.current) leaveQueueBeacon(sessionRef.current);
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
      waitingRef.current = false;
      router.push(`/connect/room/${data.roomId}`);
    } else if (!data.ok) {
      waitingRef.current = false;
      setWaiting(false);
    }
  }

  async function startMatching(s: Session) {
    waitingRef.current = true;
    setWaiting(true);
    await poll(s);
    pollRef.current = setInterval(() => poll(s), 2000);
  }

  async function startSimulation() {
    if (!session) return;
    if (pollRef.current) clearInterval(pollRef.current);
    if (waitingRef.current) {
      waitingRef.current = false;
      await fetch("/api/connect/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      }).catch(() => {});
    }
    const res = await fetch("/api/connect/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
    const data = await res.json();
    if (data.ok) router.push(`/connect/room/${data.roomId}`);
  }

  if (!session) return null;

  return (
    <div style={{ fontSize: 12, color: "#8c887e", marginTop: 8 }}>
      미토크리에이트 · 대기 중 {stats?.waiting ?? "-"}명 · 대화 중인 방 {stats?.activeRooms ?? "-"}개
      {waiting && <> · <span style={{ color: "#ffb800" }}>매칭 대기 중…</span></>}
      {" · "}
      <a href="#" onClick={(e) => { e.preventDefault(); startSimulation(); }} style={{ color: "#ffb800" }}>
        시뮬레이션으로 체험해보기
      </a>
    </div>
  );
}
