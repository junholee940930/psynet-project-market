-- Supabase SQL Editor에서 실행하세요.
create table if not exists negotiations (
  id bigint generated always as identity primary key,
  project_id text not null,
  participant text not null,
  role text not null,
  proposed_equity int not null,
  status text not null default 'proposed', -- proposed | confirmed
  created_at timestamptz not null default now()
);

create index if not exists negotiations_project_id_idx on negotiations (project_id);

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
