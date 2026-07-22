"use client";

import { useState } from "react";
import type { InviteRow } from "@/lib/supabase";

export default function AdminInviteIssuer({ invites }: { invites: InviteRow[] }) {
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function issue() {
    setBusy(true);
    try {
      const res = await fetch("/api/connect/invite", { method: "POST" });
      if (res.ok) window.location.reload();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  function copyLink(invite: InviteRow) {
    const url = `${window.location.origin}/connect/join?code=${invite.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="card" style={{ display: "block" }}>
      <button
        onClick={issue}
        disabled={busy}
        style={{
          padding: "8px 16px",
          background: "#ffb800",
          color: "#0b0b0a",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        {busy ? "발급 중…" : "초대코드 발급"}
      </button>

      {invites.length === 0 ? (
        <p className="sub">발급된 초대코드 없음.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {invites.map((inv) => (
              <tr key={inv.id}>
                <td style={{ padding: "6px 8px 6px 0", fontSize: 13, fontFamily: "monospace" }}>{inv.code}</td>
                <td style={{ padding: "6px 8px", fontSize: 12, color: inv.used_at ? "#5fd98a" : "#8c887e" }}>
                  {inv.used_at ? "사용됨" : "미사용"}
                </td>
                <td style={{ padding: "6px 8px", fontSize: 12, color: "#8c887e" }}>
                  {new Date(inv.expires_at).toLocaleDateString("ko-KR")}까지
                </td>
                <td style={{ padding: "6px 0", textAlign: "right" }}>
                  {!inv.used_at && (
                    <button
                      onClick={() => copyLink(inv)}
                      style={{
                        padding: "4px 10px",
                        background: "transparent",
                        color: "#ffb800",
                        border: "1px solid #ffb80055",
                        borderRadius: 4,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {copiedId === inv.id ? "복사됨!" : "링크 복사"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
