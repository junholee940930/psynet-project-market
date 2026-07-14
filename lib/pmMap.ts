import { supabase } from "@/lib/supabase";

/** 로그인한 이름이 PM으로 등록된 프로젝트 id 목록. project_pm_map은 서버에서만 조회 — 절대 클라이언트로 그대로 내려보내지 말 것. */
export async function getOwnedProjectIds(fullName: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_pm_map")
    .select("project_id")
    .eq("pm_full_name", fullName);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.project_id as string);
}
