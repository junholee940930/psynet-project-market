// project-market app.py의 nl_to_command / process_command 이식.
// 원본과 달리 서버 프로세스 전역 상태(LAST_PROJECT)를 두지 않는다 — 서버리스 인스턴스가
// 여러 방문자의 요청을 재사용해서 처리할 수 있어, 전역 변수를 쓰면 사용자 A의 "직전 프로젝트"
// 문맥이 사용자 B의 요청에 새어들어갈 수 있다. 대신 클라이언트가 lastProjectId를 들고 있다가
// 매 요청마다 넘기고, 응답으로 갱신된 값을 돌려받아 다음 요청에 다시 실어보낸다.
// 로그인도 같은 이유로 서버 세션이 아니라 클라이언트가 들고 있는 {name, phone}을 매 요청마다
// 실어보내는 방식이다 — 비밀번호 없는 자가등록형이라 phone이 곧 계정 식별자.

import { supabase, type NegotiationRow } from "@/lib/supabase";
import { getProject, gradeFor, listProjects, type Project } from "@/lib/projects";
import { extractEmail, extractPhone, findOrCreateUser, getUserByPhone, normalizePhone, type Session } from "@/lib/auth";

export type CommandContext = {
  session: Session | null;
  lastProjectId: string | null;
};

export type CommandResult = {
  output: string;
  lastProjectId: string | null;
  /** undefined = 세션 변화 없음, null = 로그아웃, Session = 로그인/갱신 */
  session?: Session | null;
};

const KNOWN_CMDS = new Set([
  "도움말", "help", "프로필", "스킬", "매칭", "방", "참여", "다중참여", "확정", "개수", "로그인", "로그아웃",
]);

function resolveProjectIdScored(text: string): { id: string | null; score: number } {
  let bestId: string | null = null;
  let bestScore = 0;
  for (const p of listProjects()) {
    const tokens = p.title.split(/[\s/·&\-()]+/).filter((t) => t.length >= 2);
    let score = 0;
    for (const t of tokens) {
      const idx = text.indexOf(t);
      if (idx === -1) continue;
      const before = idx > 0 ? text[idx - 1] : " ";
      const after = idx + t.length < text.length ? text[idx + t.length] : " ";
      if (/[가-힣]/.test(before) || /[가-힣]/.test(after)) continue;
      score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = p.id;
    }
  }
  return { id: bestId, score: bestScore };
}

function pickTarget(text: string, pid: string | null, lastProjectId: string | null): string | null {
  const { id: weakId, score } = resolveProjectIdScored(text);
  if (pid) return pid;
  if (score >= 2) return weakId;
  if (lastProjectId) return lastProjectId;
  return weakId;
}

function projectTitle(pid: string): string {
  return getProject(pid)?.title ?? pid;
}

/** "로그인 이준호 01012345678 junho@x.com" 형태로 정규화. 이름/전화 못 찾으면 null. */
function tryParseLogin(text: string): string | null {
  const phone = extractPhone(text);
  if (!phone) return null;
  const email = extractEmail(text);

  let nameMatch = text.match(/(?:이름은|이름|나는)\s*([가-힣A-Za-z0-9]{2,10})/);
  let name = nameMatch ? nameMatch[1] : null;

  if (!name) {
    // "로그인" "전화번호" "이메일" 등 잡토큰과 전화/이메일 문자열을 지우고 남는 순수 한글 토큰을 이름으로 추정
    let remain = text;
    if (email) remain = remain.replace(email, " ");
    remain = remain.replace(/01[0-9][-\s]?\d{3,4}[-\s]?\d{4}/, " ");
    for (const s of ["로그인", "할래", "할게", "해줘", "번호는", "번호", "전화번호는", "전화번호", "전화", "이야", "이고", "이고요", "이에요", "예요", "야"]) {
      remain = remain.split(s).join(" ");
    }
    const tok = remain.trim().split(/\s+/).find((t) => /^[가-힣]{2,5}$/.test(t));
    name = tok ?? null;
  }

  if (!name) return null;
  return email ? `로그인 ${name} ${phone} ${email}` : `로그인 ${name} ${phone}`;
}

/** 자연어 → 명령 문자열 변환. 매칭 실패 시 null. lastProjectId 갱신값도 함께 반환. */
function nlToCommand(
  line: string,
  lastProjectId: string | null,
  session: Session | null
): { command: string | null; lastProjectId: string | null } {
  const text = line.trim();

  if (["로그아웃", "로그아웃할래", "나갈래", "계정 나가", "로그아웃해줘"].some((k) => text.includes(k))) {
    return { command: "로그아웃", lastProjectId };
  }
  if (text.includes("로그인") || (extractPhone(text) && /이름|나는/.test(text))) {
    const loginCmd = tryParseLogin(text);
    if (loginCmd) return { command: loginCmd, lastProjectId };
  }

  const pidMatch = text.match(/(prj-\d{4}-\d-\d{3})/i);
  const pid = pidMatch ? pidMatch[1].toLowerCase() : null;

  if (["몇개", "몇 개", "몇건", "몇 건", "개수", "갯수", "프로젝트 수", "총 몇"].some((k) => text.includes(k))) {
    return { command: "개수", lastProjectId };
  }

  const multi = [...text.matchAll(/([가-힣A-Za-z]{2,8})\s*(\d{1,3})\s*%/g)];
  if (multi.length >= 2 && ["추가", "참여", "지분", "넣", "등록"].some((k) => text.includes(k))) {
    const target = pickTarget(text, pid, lastProjectId);
    if (target) {
      const pairs = multi.map((m) => `${m[1]}:${m[2]}`).join(",");
      return { command: `다중참여 ${target} ${pairs}`, lastProjectId: target };
    }
  }

  const pctMatch = text.match(/(\d{1,3})\s*%/);
  const pct = pctMatch ? pctMatch[1] : null;

  if (["확정", "합의됐", "다 됐", "끝내자", "마무리"].some((k) => text.includes(k))) {
    const target = pickTarget(text, pid, lastProjectId);
    if (target) return { command: `확정 ${target}`, lastProjectId: target };
  }

  if (
    ["현황", "상태", "협의방", "누구"].some((k) => text.includes(k)) ||
    (pid && ["보여줘", "어때"].some((k) => text.includes(k)))
  ) {
    const target = pickTarget(text, pid, lastProjectId);
    if (target) return { command: `방 ${target}`, lastProjectId: target };
  }

  if (pct && ["참여", "지분", "넣고", "제안", "들어가", "하고싶"].some((k) => text.includes(k))) {
    const target = pickTarget(text, pid, lastProjectId);
    if (target) {
      const nameMatch = text.match(/(?:내\s*이름은|나는)\s*([가-힣A-Za-z0-9]+)/);
      const name = nameMatch ? nameMatch[1] : session?.name ?? "나";
      return { command: `참여 ${target} ${name} 참여자 ${pct}`, lastProjectId: target };
    }
  }

  if (pid) {
    return { command: `방 ${pid}`, lastProjectId: pid };
  }

  if (["스킬은", "스킬을", "스킬 바꿔", "스킬 설정", "내 스킬"].some((k) => text.includes(k))) {
    const found = ["기획", "디자인", "프론트엔드", "백엔드", "데이터분석", "AI/ML", "마케팅", "운영", "영상편집", "번역"].filter(
      (s) => text.includes(s)
    );
    if (found.length) return { command: `스킬 ${found.join(",")}`, lastProjectId };
  }

  if (["내 프로필", "프로필 보여줘", "내 정보"].some((k) => text.includes(k))) {
    return { command: "프로필", lastProjectId };
  }

  if (["찾아줘", "추천", "매칭", "할만한", "있어?", "있나", "뭐가 있", "프로젝트"].some((k) => text.includes(k))) {
    const stop = [
      "찾아줘", "추천해줘", "추천", "매칭해줘", "매칭", "할만한거", "있어?", "있나", "뭐가있어",
      "프로젝트", "좀", "해줘", "알려줘", "보여줘", "?", "관련된", "관련", "분야", "쪽으로", "쪽", "등의", "등",
    ];
    let remain = text;
    for (const s of stop) remain = remain.split(s).join("");
    remain = remain.trim();
    return { command: remain ? `매칭 ${remain}` : "매칭", lastProjectId };
  }

  return { command: null, lastProjectId };
}

async function readNeg(projectId: string): Promise<NegotiationRow[]> {
  const { data, error } = await supabase
    .from("negotiations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`협의 기록 조회 실패: ${error.message}`);
  return data ?? [];
}

function roomLines(rows: NegotiationRow[], title: string): string[] {
  const out: string[] = [];
  if (!rows.length) {
    out.push(`『${title}』 협의 기록 없음. "여기 20% 지분 넣고싶어" 처럼 말해봐.`);
    return out;
  }
  const total = rows.reduce((s, r) => s + r.proposed_equity, 0);
  out.push(`『${title}』 협의 현황:`);
  for (const r of rows) {
    out.push(`  ${r.participant.padEnd(8, " ")} ${r.role.padEnd(6, " ")} ${r.proposed_equity}%  [${r.status}]`);
  }
  out.push(`합계 ${total}%  ${total === 100 ? "✅ 100% 일치" : `⚠ ${100 - total}%p 부족/초과`}`);
  return out;
}

const LOGIN_HELP = '로그인하려면: "로그인 <이름> <전화번호>" 또는 "이름은 이준호, 번호는 010-1234-5678로 로그인해줘"처럼 말해봐.';

export async function processCommand(rawLine: string, ctx: CommandContext): Promise<CommandResult> {
  const line = rawLine.trim();
  if (!line) return { output: "", lastProjectId: ctx.lastProjectId };

  let parts = line.split(/\s+/);
  let cmd = parts[0];
  let lastProjectId = ctx.lastProjectId;

  if (!KNOWN_CMDS.has(cmd)) {
    const converted = nlToCommand(line, ctx.lastProjectId, ctx.session);
    lastProjectId = converted.lastProjectId;
    if (converted.command) {
      parts = converted.command.split(/\s+/);
      cmd = parts[0];
    }
  }

  const out: string[] = [];

  try {
    if (cmd === "도움말" || cmd === "help") {
      out.push('사용법: 프로젝트명을 그대로 말하면 됨. 예) "다크모드 프로젝트 찾아줘" / "거기 20% 지분 넣고싶어" / "확정하자" / 스킬 <a,b,c> / 로그인 <이름> <전화번호>');
    } else if (cmd === "로그인") {
      const name = parts[1];
      const phone = parts[2] ? normalizePhone(parts[2]) : null;
      const email = parts[3] ?? null;
      if (!name || !phone) {
        out.push(`[오류] 이름/전화번호를 못 읽었어. ${LOGIN_HELP}`);
      } else {
        const user = await findOrCreateUser(name, phone, email);
        out.push(`${user.name}님, 로그인 완료. 이제 "AI/ML 프로젝트 찾아줘"처럼 바로 검색해봐.`);
        if (user.skills.length) out.push(`저장된 스킬: ${user.skills.join(", ")}`);
        return { output: out.join("\n"), lastProjectId, session: { name: user.name, phone: user.phone } };
      }
    } else if (cmd === "로그아웃") {
      out.push("로그아웃 됐어.");
      return { output: out.join("\n"), lastProjectId, session: null };
    } else if (cmd === "프로필") {
      if (!ctx.session) {
        out.push(`아직 로그인 안 했어. ${LOGIN_HELP}`);
      } else {
        const user = await getUserByPhone(ctx.session.phone);
        if (!user) {
          out.push(`아직 로그인 안 했어. ${LOGIN_HELP}`);
        } else {
          out.push(`이름: ${user.name}`);
          out.push(`스킬: ${user.skills.join(", ") || "(미설정)"}`);
          out.push(`완료 프로젝트: ${user.completed_projects.join(", ") || "없음"}`);
        }
      }
    } else if (cmd === "스킬" && parts.length >= 2) {
      if (!ctx.session) {
        out.push(`스킬을 저장하려면 먼저 로그인해야 해. ${LOGIN_HELP}`);
      } else {
        const newSkills = parts[1].split(",").map((s) => s.trim()).filter(Boolean);
        const { error } = await supabase
          .from("users")
          .update({ skills: newSkills })
          .eq("phone", ctx.session.phone);
        if (error) throw new Error(error.message);
        out.push(`스킬 저장됨: ${newSkills.join(", ")}`);
      }
    } else if (cmd === "개수") {
      out.push(`등록 프로젝트: 총 ${listProjects().length}건`);
    } else if (cmd === "매칭") {
      const keywordTokens = parts.slice(1);
      const user = ctx.session ? await getUserByPhone(ctx.session.phone) : null;
      const skills = user?.skills ?? [];
      const hasHistory = (user?.completed_projects.length ?? 0) > 0;
      const results = listProjects()
        .filter((p) => keywordTokens.every((t) => p.title.includes(t)))
        .map((p) => {
          const overlap = p.required_skills.filter((s) => skills.includes(s));
          const label = hasHistory ? gradeFor(skills, p.required_skills) : "신규";
          return { p, label, overlap };
        });
      if (!ctx.session) out.push(`(로그인하면 내 스킬 기준으로 등급이 매겨져. ${LOGIN_HELP})`);
      out.push(`매칭 결과 ${results.length}건:`);
      for (const { p, label, overlap } of results.slice(0, 15)) {
        out.push(`  [${label}] ${p.title}`);
        out.push(`       요구:${p.required_skills.join(",") || "-"}  일치:${overlap.join(",") || "없음"}`);
      }
      if (results.length > 15) out.push(`  ...외 ${results.length - 15}건 (검색어로 좁혀봐)`);
      if (results.length === 1) lastProjectId = results[0].p.id;
    } else if (cmd === "방" && parts.length >= 2) {
      const pid = parts[1];
      const project = getProject(pid);
      if (!project) {
        out.push(`알 수 없는 프로젝트: ${pid}`);
      } else {
        const rows = await readNeg(pid);
        out.push(...roomLines(rows, project.title));
        lastProjectId = pid;
      }
    } else if (cmd === "참여" && parts.length >= 5) {
      const [pid, name, role, equity] = [parts[1], parts[2], parts[3], parts[4]];
      const project = getProject(pid);
      if (!project) {
        out.push(`알 수 없는 프로젝트: ${pid}`);
      } else {
        const { error } = await supabase.from("negotiations").insert({
          project_id: pid,
          participant: name,
          role,
          proposed_equity: Number(equity),
          status: "proposed",
        });
        if (error) throw new Error(error.message);
        const rows = await readNeg(pid);
        const total = rows.reduce((s, r) => s + r.proposed_equity, 0);
        out.push(`『${project.title}』에 ${name}(${role}) 지분 ${equity}% 제안 등록됨.`);
        out.push(`현재 합계 ${total}%  ${total === 100 ? "✅ 100% 일치" : `⚠ 100%까지 ${100 - total}%p 남음`}`);
        lastProjectId = pid;
      }
    } else if (cmd === "다중참여" && parts.length >= 3) {
      const pid = parts[1];
      const project = getProject(pid);
      if (!project) {
        out.push(`알 수 없는 프로젝트: ${pid}`);
      } else {
        const pairs = parts[2].split(",").filter((p) => p.includes(":"));
        const added: string[] = [];
        for (const pair of pairs) {
          const [name, equity] = pair.split(":");
          const { error } = await supabase.from("negotiations").insert({
            project_id: pid,
            participant: name,
            role: "참여자",
            proposed_equity: Number(equity),
            status: "proposed",
          });
          if (error) throw new Error(error.message);
          added.push(`${name} ${equity}%`);
        }
        const rows = await readNeg(pid);
        const total = rows.reduce((s, r) => s + r.proposed_equity, 0);
        out.push(`『${project.title}』에 ${added.join(", ")} 등록됨.`);
        out.push(`현재 합계 ${total}%  ${total === 100 ? "✅ 100% 일치" : `⚠ 100%까지 ${100 - total}%p 남음`}`);
        lastProjectId = pid;
      }
    } else if (cmd === "확정" && parts.length >= 2) {
      const pid = parts[1];
      const project = getProject(pid);
      if (!project) {
        out.push(`알 수 없는 프로젝트: ${pid}`);
      } else {
        const rows = await readNeg(pid);
        if (!rows.length) {
          out.push(`『${project.title}』 협의 기록 없음.`);
        } else {
          const total = rows.reduce((s, r) => s + r.proposed_equity, 0);
          if (total !== 100) {
            out.push(`『${project.title}』 합계 ${total}% — 100% 아니면 확정 불가.`);
          } else {
            const { error } = await supabase
              .from("negotiations")
              .update({ status: "confirmed" })
              .eq("project_id", pid);
            if (error) throw new Error(error.message);
            out.push(`『${project.title}』 전원 확정 완료.`);
          }
        }
        lastProjectId = pid;
      }
    } else {
      out.push(`모르는 명령어: ${line}  ('도움말' 입력)`);
    }
  } catch (e) {
    out.push(`[오류] ${e instanceof Error ? e.message : String(e)}`);
  }

  return { output: out.join("\n"), lastProjectId };
}

export type { Project };
