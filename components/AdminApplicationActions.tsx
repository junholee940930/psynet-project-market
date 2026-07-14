"use client";

import { useState } from "react";

export default function AdminApplicationActions({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);

  async function act(action: "accept" | "reject") {
    setBusy(true);
    try {
      const res = await fetch("/api/admin-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) window.location.reload();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <button
        onClick={() => act("accept")}
        disabled={busy}
        style={{
          padding: "4px 10px",
          background: "#5fd98a22",
          color: "#5fd98a",
          border: "1px solid #5fd98a55",
          borderRadius: 4,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        수락
      </button>
      <button
        onClick={() => act("reject")}
        disabled={busy}
        style={{
          padding: "4px 10px",
          background: "#ff5a4e22",
          color: "#ff5a4e",
          border: "1px solid #ff5a4e55",
          borderRadius: 4,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        거절
      </button>
    </span>
  );
}
