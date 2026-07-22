import { randomBytes } from "node:crypto";
import {
  supabase,
  type ConnectLikeRow,
  type ConnectMessageRow,
  type ConnectProjectRow,
  type ConnectRoomRow,
  type InviteRow,
} from "@/lib/supabase";
import { findOrCreateUser } from "@/lib/auth";

const MAX_EXTERNAL_USERS = 10;

export function generateInviteCode(): string {
  return randomBytes(4).toString("hex"); // 8자리
}

export async function createInvite(): Promise<InviteRow> {
  const code = generateInviteCode();
  const { data, error } = await supabase.from("invites").insert({ code }).select("*").single();
  if (error) throw new Error(error.message);
  return data as InviteRow;
}

export async function listInvites(): Promise<InviteRow[]> {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as InviteRow[];
}

// 표시용 더미 보정치 — 실제 connect_queue에는 절대 더미 row를 넣지 않음(진짜 유저가
// 응답 없는 유령 계정과 매칭돼버리는 사고가 남). 화면에 보이는 숫자에만 더함.
const DISPLAY_WAITING_PADDING = 5;

export async function getConnectStats(): Promise<{ waiting: number; activeRooms: number }> {
  const [{ count: waiting }, { count: activeRooms }] = await Promise.all([
    supabase.from("connect_queue").select("*", { count: "exact", head: true }),
    supabase.from("connect_rooms").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);
  return { waiting: (waiting ?? 0) + DISPLAY_WAITING_PADDING, activeRooms: activeRooms ?? 0 };
}

export async function externalUserCount(): Promise<number> {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_external", true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

type RedeemResult =
  | { ok: true; session: { name: string; phone: string } }
  | { ok: false; error: string };

export async function redeemInvite(code: string, name: string, phone: string): Promise<RedeemResult> {
  const { data: invite, error: findErr } = await supabase
    .from("invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!invite) return { ok: false, error: "존재하지 않는 초대코드야." };
  if (invite.used_at) return { ok: false, error: "이미 사용된 초대코드야." };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "만료된 초대코드야." };
  }

  const count = await externalUserCount();
  if (count >= MAX_EXTERNAL_USERS) {
    return { ok: false, error: "외부 인원 한도(10명)를 초과했어. 다음 기회에!" };
  }

  const user = await findOrCreateUser(name, phone, null);
  await supabase.from("users").update({ is_external: true }).eq("phone", phone);
  await supabase
    .from("invites")
    .update({ used_by_phone: phone, used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { ok: true, session: { name: user.name, phone: user.phone } };
}

/** 매칭 큐 진입/폴링. 상대가 대기 중이면 즉시 매칭해 room_id 반환, 없으면 null(대기중). */
export async function matchOrQueue(phone: string, name: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("connect_match_or_queue", {
    p_phone: phone,
    p_name: name,
  });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? null;
}

export async function leaveQueue(phone: string): Promise<void> {
  await supabase.from("connect_queue").delete().eq("phone", phone);
}

export async function getRoom(roomId: number): Promise<ConnectRoomRow | null> {
  const { data, error } = await supabase
    .from("connect_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ConnectRoomRow) ?? null;
}

// 시뮬레이션 상대(봇). 대기인원 표시용 더미(+5)와 이름 맞춤 — 실제 큐/매칭에는 관여 안 함.
const SIM_BOT_PHONES = ["sim-0001", "sim-0002", "sim-0003", "sim-0004", "sim-0005"];
const SIM_BOT_NAMES = ["민준", "서연", "도윤", "하은", "지호"];
const SIM_BOT_REPLIES = [
  "오 그거 재밌는 얘기네요!",
  "저도 그 분야 관심 많아요.",
  "혹시 어떤 스킬 필요하세요?",
  "같이 해보면 재밌을 것 같은데요?",
  "괜찮은데요? 한번 해봐요.",
  "오, 구체적으로 어떤 거 생각하고 계세요?",
  "저 그거 예전에 비슷한 거 해본 적 있어요.",
  "좋아요, 언제부터 시작할 수 있어요?",
];

export function isBotPhone(phone: string): boolean {
  return phone.startsWith("sim-");
}

/** 시뮬레이션 매칭 — 실제 대기열(connect_queue) 안 거치고 봇과 바로 방 생성. */
export async function startSimulatedMatch(phone: string, name: string): Promise<number> {
  const i = Math.floor(Math.random() * SIM_BOT_PHONES.length);
  const { data, error } = await supabase
    .from("connect_rooms")
    .insert({
      participant_a_phone: phone,
      participant_a_name: name,
      participant_b_phone: SIM_BOT_PHONES[i],
      participant_b_name: SIM_BOT_NAMES[i],
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as number;
}

/** 방 상대가 봇이면 자동으로 답장 하나 보냄(약간의 딜레이로 실제 대화처럼). */
export async function maybeBotReply(roomId: number, room: ConnectRoomRow): Promise<void> {
  const botPhone = [room.participant_a_phone, room.participant_b_phone].find(isBotPhone);
  if (!botPhone) return;
  const botName = room.participant_a_phone === botPhone ? room.participant_a_name : room.participant_b_name;
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 700));
  const reply = SIM_BOT_REPLIES[Math.floor(Math.random() * SIM_BOT_REPLIES.length)];
  await sendMessage(roomId, botPhone, botName, reply);
}

export function partnerOf(room: ConnectRoomRow, phone: string): { phone: string; name: string } {
  return room.participant_a_phone === phone
    ? { phone: room.participant_b_phone, name: room.participant_b_name }
    : { phone: room.participant_a_phone, name: room.participant_a_name };
}

export async function listMessages(roomId: number): Promise<ConnectMessageRow[]> {
  const { data, error } = await supabase
    .from("connect_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ConnectMessageRow[];
}

export async function sendMessage(
  roomId: number,
  senderPhone: string,
  senderName: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("connect_messages")
    .insert({ room_id: roomId, sender_phone: senderPhone, sender_name: senderName, content });
  if (error) throw new Error(error.message);
}

/** 방 종료 — 메시지 전부 삭제(영구 로그 없음), 방 상태만 ended로 남김. */
export async function endRoom(roomId: number): Promise<void> {
  await supabase.from("connect_messages").delete().eq("room_id", roomId);
  await supabase
    .from("connect_rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", roomId);
}

export async function likeUser(roomId: number, likerPhone: string, likedPhone: string): Promise<boolean> {
  await supabase
    .from("connect_likes")
    .upsert({ room_id: roomId, liker_phone: likerPhone, liked_phone: likedPhone }, { onConflict: "room_id,liker_phone" });

  const { data, error } = await supabase
    .from("connect_likes")
    .select("*")
    .eq("room_id", roomId);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ConnectLikeRow[];
  return rows.some((r) => r.liker_phone === likedPhone && r.liked_phone === likerPhone);
}

export async function createConnectProject(
  roomId: number,
  title: string,
  summary: string,
  pmPhone: string,
  pmName: string,
  partnerPhone: string,
  partnerName: string
): Promise<ConnectProjectRow> {
  const { data, error } = await supabase
    .from("connect_projects")
    .insert({
      room_id: roomId,
      title,
      summary,
      pm_phone: pmPhone,
      pm_name: pmName,
      partner_phone: partnerPhone,
      partner_name: partnerName,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ConnectProjectRow;
}

export async function listConnectProjects(): Promise<ConnectProjectRow[]> {
  const { data, error } = await supabase
    .from("connect_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ConnectProjectRow[];
}
