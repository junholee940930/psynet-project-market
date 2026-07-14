"use client";

export default function AdminLogout() {
  async function logout() {
    await fetch("/api/admin-auth", { method: "DELETE" });
    window.location.reload();
  }
  return (
    <button
      onClick={logout}
      style={{
        padding: "6px 14px",
        background: "transparent",
        color: "#8c887e",
        border: "1px solid #302e2a",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      로그아웃
    </button>
  );
}
