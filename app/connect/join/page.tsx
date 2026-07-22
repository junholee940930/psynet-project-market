"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SESSION_KEY = "pm_session";

export default function ConnectJoinPage() {
  return (
    <Suspense fallback={null}>
      <ConnectJoinForm />
    </Suspense>
  );
}

function ConnectJoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/connect/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "가입 실패");
        return;
      }
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
      router.push("/connect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cards-page" style={{ maxWidth: 420, textAlign: "center" }}>
      <h1>미토크리에이트 초대</h1>
      <p className="sub">받은 초대코드로 참여할 수 있어. 실명제로 운영돼.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="초대코드"
          style={inputStyle}
        />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" style={inputStyle} />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="전화번호 (010-1234-5678)"
          style={inputStyle}
        />
        <button onClick={submit} disabled={loading || !code || !name || !phone} style={btnStyle}>
          {loading ? "확인 중…" : "참여하기"}
        </button>
        {error && <p className="sub" style={{ color: "#ff5a4e" }}>{error}</p>}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  background: "#111110",
  border: "1px solid #302e2a",
  borderRadius: 6,
  color: "#f3f1ea",
};

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
