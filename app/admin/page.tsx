import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminPasswordConfigured, isValidAdminToken } from "@/lib/adminAuth";
import { getAdminSummary } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import AdminLogout from "@/components/AdminLogout";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!adminPasswordConfigured()) {
    return (
      <main className="cards-page">
        <h1>관리자 페이지</h1>
        <p className="sub">ADMIN_PASSWORD 환경변수가 설정되지 않았어.</p>
      </main>
    );
  }

  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;

  if (!isValidAdminToken(token)) {
    return <AdminLogin />;
  }

  const summary = await getAdminSummary();

  return (
    <main className="cards-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>관리자 — 전체 현황</h1>
        <AdminLogout />
      </div>
      <a href="/">← 홈으로</a>

      <h2 style={{ marginTop: 24, fontSize: 14, color: "#8c887e" }}>요약</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0" }}>
        <tbody>
          <Row label="전체 프로젝트" value={summary.totalProjects} />
          <Row label="확정 완료" value={summary.statusCount.confirmed} />
          <Row label="협의 중" value={summary.statusCount.negotiating} />
          <Row label="빈 방 (미참여)" value={summary.statusCount.empty} />
          <Row label="활동 참여자 수" value={summary.participants.length} />
        </tbody>
      </table>

      <h2 style={{ marginTop: 24, fontSize: 14, color: "#8c887e" }}>
        참여자별 현황 (확정 지분 합 기준 정렬)
      </h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr>
            {["참여자", "참여 건수", "제안 지분 합", "확정 지분 합", "참여 프로젝트"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderBottom: "1px solid #302e2a",
                  fontSize: 11,
                  color: "#8c887e",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.participants.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: "#8c887e", padding: "12px 10px" }}>
                활동 기록 없음
              </td>
            </tr>
          ) : (
            summary.participants.map((p) => (
              <tr key={p.name}>
                <Cell>{p.name}</Cell>
                <Cell num>{p.joined}</Cell>
                <Cell num>{p.proposedSum}%</Cell>
                <Cell num>{p.confirmedSum}%</Cell>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #302e2a", fontSize: 12, color: "#8c887e" }}>
                  {p.projects.join(", ")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td style={{ padding: "6px 10px", borderBottom: "1px solid #232019" }}>{label}</td>
      <td style={{ padding: "6px 10px", borderBottom: "1px solid #232019", textAlign: "right" }}>{value}</td>
    </tr>
  );
}

function Cell({ children, num }: { children: React.ReactNode; num?: boolean }) {
  return (
    <td
      style={{
        padding: "8px 10px",
        borderBottom: "1px solid #302e2a",
        fontSize: 13,
        textAlign: num ? "right" : "left",
      }}
    >
      {children}
    </td>
  );
}
