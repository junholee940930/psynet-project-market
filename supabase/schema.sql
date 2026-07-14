-- Supabase SQL Editor에서 실행하세요.

-- [deprecated] 지분 협의 기능 제거로 더 이상 코드에서 쓰지 않음. 데이터 보존을 위해
-- DROP은 하지 않았음 — 정말 필요 없으면 Supabase 대시보드에서 수동으로 지울 것.
create table if not exists negotiations (
  id bigint generated always as identity primary key,
  project_id text not null,
  participant text not null,
  role text not null,
  proposed_equity int not null,
  status text not null default 'proposed',
  created_at timestamptz not null default now()
);

-- 프로젝트 신청. 지분율 없음 — "관심있음/참여할래" 의사표시 + PM 수락/거절만 관리.
create table if not exists applications (
  id bigint generated always as identity primary key,
  project_id text not null,
  applicant text not null,
  role text not null default '참여자',
  message text,
  status text not null default 'pending', -- pending | accepted | rejected
  created_at timestamptz not null default now()
);

create index if not exists applications_project_id_idx on applications (project_id);

-- PM 실명 매핑(비공개). "내 프로젝트에 누가 신청했어?" 조회할 때 로그인한 이름과
-- 대조하는 용도로만 서버 코드에서 조회함 — 절대 공개 API/화면에 그대로 노출하지 말 것
-- (data/projects.json에는 마스킹된 pm만 들어감). 저장소가 public GitHub라 git에는
-- 실명을 못 넣어서 DB에만 둠 — scripts/seed-pm-map.mjs로 채움.
create table if not exists project_pm_map (
  project_id text primary key,
  pm_full_name text not null
);

-- 비밀번호 없는 자가등록형 로그인. phone이 유일 식별자 — 같은 번호로 다시 "로그인"하면
-- 그 계정으로 로그인, 처음 보는 번호면 새 계정 생성. name은 로그인할 때마다 최신값으로 갱신.
-- 인증(SMS 등) 없음 — 이름+전화번호만 알면 그 사람 행세로 로그인 가능한 수준의 낮은 보안.
create table if not exists users (
  id bigint generated always as identity primary key,
  phone text not null unique,
  name text not null,
  email text,
  skills text[] not null default '{}',
  completed_projects text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

-- 서버(API route)는 service role key로 접근하므로 RLS를 켜도 무방하지만,
-- 이 프로젝트는 서버 경유로만 쓰기/읽기가 일어나므로 기본값(RLS off)으로 둔다.
-- 추후 클라이언트에서 anon key로 직접 접근하게 바뀌면 RLS 정책을 반드시 추가할 것.
