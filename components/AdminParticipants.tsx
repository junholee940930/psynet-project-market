"use client";

import { useEffect, useState } from "react";

type ProjectOpt = { id: string; title: string };
type Participant = { id: number; name: string; role: string };

export default function AdminParticipants({ projects }: { projects: ProjectOpt[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [list, setList] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("협업자");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(pid: string) {
    if (!pid) return;
    setErr(null);
    const res = await fetch(`/api/admin-participants?projectId=${encodeURIComponent(pid)}`);
    const data = await res.json();
    if (data.ok) setList(data.participants);
    else setErr(data.error ?? "불러오기 실패");
  }

  useEffect(() => {
    load(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function add() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin-participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name: name.trim(), role }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setName("");
      load(projectId);
    } else setErr(data.error ?? "추가 실패");
  }

  async function remove(id: number) {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/admin-participants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) load(projectId);
    else setErr(data.error ?? "삭제 실패");
  }

  const inputStyle = {
    background: "#151512",
    border: "1px solid #2a2a26",
    color: "#e8e4d8",
    padding: "6px 8px",
    borderRadius: 4,
    fontSize: 13,
  } as const;

  return (
    <div className="card" style={{ display: "block" }}>
      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: 12 }}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      {err && <p style={{ color: "#e0736d", fontSize: 12 }}>{err}</p>}

      {list.length === 0 ? (
        <p className="sub" style={{ marginTop: 0 }}>참여자 없음.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: "6px 8px 6px 0", fontSize: 13 }}>{p.name}</td>
                <td style={{ padding: "6px 8px", fontSize: 12, color: "#8c887e" }}>{p.role}</td>
                <td style={{ padding: "6px 0", textAlign: "right" }}>
                  <button
                    onClick={() => remove(p.id)}
                    disabled={busy}
                    style={{ ...inputStyle, cursor: "pointer", color: "#e0736d" }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="참여자 이름"
          style={{ ...inputStyle, flex: 1 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
          <option value="협업자">협업자</option>
          <option value="PM">PM</option>
        </select>
        <button onClick={add} disabled={busy || !name.trim()} style={{ ...inputStyle, cursor: "pointer" }}>
          추가
        </button>
      </div>
    </div>
  );
}
