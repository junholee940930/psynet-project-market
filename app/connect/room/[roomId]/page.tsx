"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const SESSION_KEY = "pm_session";

type Session = { name: string; phone: string };
type Message = { id: number; sender_phone: string; sender_name: string; content: string; created_at: string };
type Phase = "chatting" | "ended" | "liked" | "matched";

function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export default function ConnectRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = Number(params.roomId);

  const [session, setSession] = useState<Session | null>(null);
  const [partner, setPartner] = useState<{ name: string; phone: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("chatting");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [createdProjectTitle, setCreatedProjectTitle] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.push("/connect");
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (!session || !roomId) return;
    let cancelled = false;

    async function tick() {
      const res = await fetch(`/api/connect/room?roomId=${roomId}&phone=${encodeURIComponent(session!.phone)}`);
      const data = await res.json();
      if (cancelled || !data.ok) return;
      setPartner(data.partner);
      setMessages(data.messages);
      if (data.room.status === "ended") {
        setPhase((p) => (p === "chatting" ? "ended" : p));
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }

    tick();
    pollRef.current = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session, roomId]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    if (!session || !value.trim()) return;
    const content = value;
    setValue("");
    await fetch("/api/connect/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, phone: session.phone, name: session.name, content }),
    });
  }

  async function endChat() {
    await fetch("/api/connect/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    setPhase("ended");
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function pollLike() {
    if (!session) return;
    const res = await fetch("/api/connect/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, phone: session.phone }),
    });
    const data = await res.json();
    if (data.ok && data.mutual) {
      setPhase("matched");
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }

  async function showLike() {
    setPhase("liked");
    await pollLike();
    pollRef.current = setInterval(pollLike, 3000);
  }

  async function createProject() {
    if (!session || !title.trim()) return;
    const res = await fetch("/api/connect/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, phone: session.phone, name: session.name, title, summary }),
    });
    const data = await res.json();
    if (data.ok) setCreatedProjectTitle(data.project.title);
  }

  if (!session) return null;

  return (
    <main className="cards-page" style={{ maxWidth: 520 }}>
      {phase === "chatting" && (
        <>
          <h1 style={{ marginBottom: 4 }}>{partner ? `${partner.name}님과 대화 중` : "연결 중…"}</h1>
          <p className="sub" style={{ marginTop: 0 }}>대화가 끝나면 이 방은 사라져. 신고/차단은 없고, 대신 서로 호감표시만 할 수 있어.</p>
          <div
            ref={bodyRef}
            style={{
              height: 360,
              overflowY: "auto",
              border: "1px solid #302e2a",
              borderRadius: 6,
              padding: 12,
              margin: "12px 0",
              background: "#111110",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  textAlign: m.sender_phone === session.phone ? "right" : "left",
                  margin: "6px 0",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    background: m.sender_phone === session.phone ? "#ffb800" : "#1c1c19",
                    color: m.sender_phone === session.phone ? "#0b0b0a" : "#f3f1ea",
                    maxWidth: "80%",
                  }}
                >
                  {m.content}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
              }}
              placeholder="메시지 입력…"
              style={{ flex: 1, padding: 10, background: "#111110", border: "1px solid #302e2a", borderRadius: 6, color: "#f3f1ea" }}
            />
            <button onClick={send} style={btnStyle}>전송</button>
          </div>
          <button
            onClick={endChat}
            style={{ ...btnStyle, marginTop: 16, background: "transparent", color: "#8c887e", border: "1px solid #302e2a" }}
          >
            대화 종료
          </button>
        </>
      )}

      {phase === "ended" && (
        <>
          <h1>대화가 끝났어</h1>
          <p className="sub">대화 내용은 삭제됐어. {partner?.name}님이 괜찮았다면 호감을 표시해봐.</p>
          <button onClick={showLike} style={btnStyle}>호감 표시</button>
          <p className="sub" style={{ marginTop: 24 }}>
            <a href="/connect">← 다시 매칭하기</a>
          </p>
        </>
      )}

      {phase === "liked" && (
        <>
          <h1>호감 표시했어</h1>
          <p className="sub">{partner?.name}님도 호감을 표시하면 여기서 바로 프로젝트를 만들 수 있어. (자동으로 확인 중…)</p>
          <p className="sub" style={{ marginTop: 24 }}>
            <a href="/connect">← 다시 매칭하기</a>
          </p>
        </>
      )}

      {phase === "matched" && !createdProjectTitle && (
        <>
          <h1>서로 호감이야! 🎉</h1>
          <p className="sub">{partner?.name}님과 바로 프로젝트를 시작해봐. 만들면 둘 다 바로 참여자로 등록돼.</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="프로젝트 제목"
            style={{ width: "100%", padding: 10, margin: "8px 0", background: "#111110", border: "1px solid #302e2a", borderRadius: 6, color: "#f3f1ea" }}
          />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="한 줄 설명 (선택)"
            rows={3}
            style={{ width: "100%", padding: 10, margin: "8px 0", background: "#111110", border: "1px solid #302e2a", borderRadius: 6, color: "#f3f1ea" }}
          />
          <button onClick={createProject} style={btnStyle} disabled={!title.trim()}>
            프로젝트 만들기
          </button>
        </>
      )}

      {createdProjectTitle && (
        <>
          <h1>프로젝트 생성 완료</h1>
          <p className="sub">『{createdProjectTitle}』 — {partner?.name}님과 함께 시작이야.</p>
          <p className="sub" style={{ marginTop: 24 }}>
            <a href="/connect">← 다시 매칭하기</a> &nbsp;|&nbsp; <a href="/start">터미널로</a>
          </p>
        </>
      )}
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
