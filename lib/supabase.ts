import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 지연 초기화 — 빌드 타임(Next.js route 수집 단계)에는 env가 없을 수 있으므로
// 모듈 로드 시점이 아니라 실제 요청 처리 시점에만 생성/검증한다.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.");
  }
  // 서버(API route) 전용 클라이언트. service role key — 클라이언트 번들에 노출 금지.
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export type ApplicationRow = {
  id: number;
  project_id: string;
  applicant: string;
  role: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type UserRow = {
  id: number;
  phone: string;
  name: string;
  email: string | null;
  skills: string[];
  completed_projects: string[];
  created_at: string;
  last_login_at: string;
  is_external: boolean;
};

export type InviteRow = {
  id: number;
  code: string;
  created_by: string;
  used_by_phone: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
};

export type ConnectRoomRow = {
  id: number;
  participant_a_phone: string;
  participant_a_name: string;
  participant_b_phone: string;
  participant_b_name: string;
  status: "active" | "ended";
  created_at: string;
  ended_at: string | null;
};

export type ConnectMessageRow = {
  id: number;
  room_id: number;
  sender_phone: string;
  sender_name: string;
  content: string;
  created_at: string;
};

export type ConnectLikeRow = {
  id: number;
  room_id: number;
  liker_phone: string;
  liked_phone: string;
  created_at: string;
};

export type ConnectProjectRow = {
  id: number;
  room_id: number;
  title: string;
  summary: string | null;
  pm_phone: string;
  pm_name: string;
  partner_phone: string;
  partner_name: string;
  created_at: string;
};
