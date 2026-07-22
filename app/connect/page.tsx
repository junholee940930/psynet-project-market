import { redirect } from "next/navigation";

// 미토크리에이트 기능은 /start에 임베드됨(ConnectWidget) — 이 경로는 하위호환용 리다이렉트만.
export default function ConnectPage() {
  redirect("/start");
}
