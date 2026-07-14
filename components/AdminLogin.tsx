"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "로그인 실패");
        return;
      }
      window.location.reload();
    } catch {
      setError("서버 연결 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cards-page">
      <h1>관리자 로그인</h1>
      <form onSubmit={submit} style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "#151412",
            border: "1px solid #302e2a",
            borderRadius: 4,
            color: "#f3f1ea",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: "#ffb800",
            color: "#161200",
            border: "none",
            borderRadius: 4,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          입장
        </button>
      </form>
      {error && <p style={{ color: "#ff5a4e", marginTop: 12, fontSize: 13 }}>{error}</p>}
    </main>
  );
}
