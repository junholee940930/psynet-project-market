import { supabase, type UserRow } from "@/lib/supabase";

export type Session = { name: string; phone: string };

/** "010-1234-5678" / "010 1234 5678" / "01012345678" 등 -> "01012345678". 유효하지 않으면 null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 11) return null;
  return digits;
}

export function extractPhone(text: string): string | null {
  const m = text.match(/01[0-9][-\s]?\d{3,4}[-\s]?\d{4}/);
  return m ? normalizePhone(m[0]) : null;
}

export function extractEmail(text: string): string | null {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : null;
}

/** 로그인: phone이 없으면 새 계정 생성, 있으면 그 계정으로 로그인(name/email 최신화). */
export async function findOrCreateUser(
  name: string,
  phone: string,
  email: string | null
): Promise<UserRow> {
  const { data: existing, error: findErr } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const { data, error } = await supabase
      .from("users")
      .update({
        name,
        email: email ?? existing.email,
        last_login_at: new Date().toISOString(),
      })
      .eq("phone", phone)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as UserRow;
  }

  const { data, error } = await supabase
    .from("users")
    .insert({ name, phone, email })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as UserRow;
}

export async function getUserByPhone(phone: string): Promise<UserRow | null> {
  const { data, error } = await supabase.from("users").select("*").eq("phone", phone).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as UserRow) ?? null;
}
