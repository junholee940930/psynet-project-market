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

-- 서버(API route)는 service role key로 접근하므로 RLS를 켜도 무방하지만,
-- 이 프로젝트는 서버 경유로만 쓰기/읽기가 일어나므로 기본값(RLS off)으로 둔다.
-- 추후 클라이언트에서 anon key로 직접 접근하게 바뀌면 RLS 정책을 반드시 추가할 것.
