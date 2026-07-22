# PROJECT MARKET (mitocreate.ai)

PSYNET 내부 프로젝트 매칭 플랫폼. Next.js 15(App Router) + TypeScript + Supabase(Postgres). Vercel(`psynet-project-market`)에 배포, 도메인 `mitocreate.ai`. GitHub 저장소 `junholee940930/psynet-project-market`는 **public** — 실명·비공개 데이터는 절대 git에 커밋하지 말 것 (DB에만 저장).

원래 사내에서 쓰던 Python 로컬 도구(`app.py`, 파일 기반 저장)를 서버리스 배포 가능한 형태로 이식하면서 시작됐고, 이후 여러 차례 기능이 추가/단순화됨.

## 핵심 기능 3가지

1. **프로젝트 마켓** — 자연어 터미널 UI로 프로젝트 검색 → 신청 → PM 수락/거절. 지분 협의 기능은 제거됨(단순 신청/수락만).
2. **관리자 대시보드** (`/admin`) — 비밀번호 보호. 전체 유저 목록 + 프로젝트별 신청 현황 + 미토크리에이트 초대코드 발급.
3. **미토크리에이트** — 실명제 랜덤 1:1 매칭 채팅. `/start` 터미널 화면 안에 완전히 통합돼 있음(별도 페이지 없음).

## 데이터 소스: 정적 카탈로그 vs Supabase

- **`data/projects.json`** — 프로젝트 카탈로그(제목/PM/필요스킬/상태). **빌드타임 정적 파일**이라 런타임에 못 바꿈. PM 이름은 마스킹(성+`**`)돼서 들어감(공개 repo라서).
  - 원천 데이터: 사내 스프레드시트(엑셀)를 사람이 붙여넣어줌 → 보안/내부행정 프로젝트 제외하고 스크립트로 재생성. 재생성 스크립트는 매번 애드혹으로 짜서 씀(엑셀 파일 경로가 바뀌므로 고정 스크립트 없음).
  - `scripts/migrate-projects.mjs` — 예전에 `source-data/projects/*.md`(gitignored, 로컬에만 있음) 기준으로 생성하던 원래 스크립트. 지금은 엑셀 기준으로 재생성했지만 참고용으로 남겨둠.
- **`project_pm_map`** (Supabase, 비공개 테이블) — 실명 PM 매핑. "내 프로젝트에 누가 신청했어?" 같은 PM 자가관리 기능에서 로그인한 사람 실명과 대조하는 용도로만 서버 코드에서 조회. **화면에 그대로 노출 금지.** `scripts/seed-pm-map.mjs`는 예전 source-data 기준 시드 스크립트 — 지금은 엑셀에서 직접 읽어 업서트하는 애드혹 스크립트를 매번 새로 씀.

## 인증 모델

- **일반 로그인**: 비밀번호 없음. 이름+전화번호만으로 자가등록(`users` 테이블, phone이 유니크 키). `lib/auth.ts`.
- **관리자(`/admin`)**: 비밀번호 하나(`ADMIN_PASSWORD` env, 현재 `psynet1234`)로 보호. sha256 해시를 httpOnly 쿠키(`pm_admin`)에 저장. `lib/adminAuth.ts`.
- **미토크리에이트 외부인**: 초대코드로만 가입(`invites` 테이블, 관리자가 `/admin`에서 발급). 가입 시 `users.is_external = true`. 외부인 최대 10명 한정(`lib/connect.ts`의 `MAX_EXTERNAL_USERS`).

## 미토크리에이트 상세

**컨셉**: 실명제 폐쇄형 랜덤 매칭 채팅. 기존 프로젝트 마켓 유저 전원이 시드 멤버, 외부인은 초대코드로만 진입(초반 10명). "다크웹처럼 폐쇄"라는 건 유저가 익명이라는 뜻이 아니라 — 가입 방식(추천/초대)이 폐쇄적이라는 뜻. 내부는 100% 실명.

**UX 원칙**: 별도 페이지/버튼 없음. `/start`(터미널) 화면 안에서 전부 진행됨 — `components/Terminal.tsx`가 command 모드와 connect 모드를 다 처리하는 상태머신.
- 로그인하면 백그라운드에서 조용히 매칭 대기 시작(공지 없음, 매칭되면 그때 배너로 알림).
- 타이틀바 밑에 "대기 중 N명 · 대화 중인 방 N개" 상시 표시 (표시값에 더미 +5 보정 — `DISPLAY_WAITING_PADDING`. 실제 큐에는 더미 안 넣음, 화면에만 더함).
- 매칭되면 프롬프트가 상대 이름으로 바뀜(`하은❯`). 대화는 폴링 기반(1.5초 간격, 실시간 소켓 아님).
- `"종료"` 입력 → 방 종료 + 메시지 영구 삭제(신고/차단 기능 없음, 이게 유일한 안전장치는 호감표시뿐).
- `"호감"` 입력 → 호감표시. 맞호감이면 그 자리에서 프로젝트 제목 입력받아 즉시 생성(PM+참여자 확정, 신청/승인 절차 없음). 이 프로젝트는 `connect_projects` 테이블에 들어가고 **`data/projects.json` 카탈로그와는 별개** — 검색/매칭에 안 뜸.
- `"시뮬레이션"` 입력 → 실제 대기열 안 거치고 봇(sim-0001~5, 이름: 민준/서연/도윤/하은/지호)과 즉시 매칭. 봇은 메시지 보내면 0.4~1.1초 뒤 캔드 답장 자동 전송, 호감표시하면 항상 맞호감 — 테스트/체험용.

**매칭 로직**: `connect_match_or_queue` Postgres 함수(`supabase/schema.sql`)로 원자적 처리 — `FOR UPDATE SKIP LOCKED`로 동시 요청 레이스 방지.

**대기열 유령 방지**: 대기 중 탭 닫기/페이지 이탈 시 `beforeunload` + `sendBeacon`(또는 fallback fetch keepalive)으로 `/api/connect/leave` 호출해서 큐에서 자동 이탈. (이거 안 해서 실제 사고 난 적 있음 — 아래 "알려진 이슈" 참고.)

### 관련 테이블 (`supabase/schema.sql`)

| 테이블 | 용도 |
|---|---|
| `invites` | 초대코드, 1회성, 14일 만료 |
| `connect_queue` | 매칭 대기열 (phone PK) |
| `connect_rooms` | 매칭된 방. 종료돼도 row는 남음(누구랑 매칭됐었는지는 필요) |
| `connect_messages` | 채팅 메시지. 방 종료 시 전부 delete |
| `connect_likes` | 호감표시 |
| `connect_projects` | 미토크리에이트에서 생성된 프로젝트 (정적 카탈로그와 별개) |

## 로컬 개발 시 반드시 주의할 것

**`.env.local`의 Supabase는 프로덕션과 동일한 DB다.** 로컬 dev 서버로 미토크리에이트 매칭을 테스트하면 **실제 유저(특히 이준호 계정)와 매칭될 수 있다** — 이미 여러 번 실제로 벌어진 사고임. 매칭/큐 관련 기능을 테스트할 땐:
1. 테스트 전에 `curl .../api/connect/stats`로 실제 대기 인원(더미 5 제외한 값)부터 확인
2. 가능하면 `/api/connect/simulate`(봇 매칭)로 테스트 — 실제 큐를 안 건드림
3. 실제 큐를 거치는 테스트를 했다면 테스트 계정과 생성된 room/message/like/project를 전부 정리
4. 혹시 실유저와 매칭됐다면 즉시 정리하고 사용자에게 알릴 것

## 배포

- `git add` (파일 명시적으로 지정 — `agency-agents-main/`, `project-market-landing_2.html` 등 무관한 미커밋 파일들이 워킹디렉토리에 계속 있음, 절대 한꺼번에 add 금지)
- `npx vercel --prod --yes`
- Windows Git Bash에서 커밋 메시지에 `/`로 시작하는 경로 비슷한 문자열(`/start` 등) 쓰면 MSYS가 Windows 경로로 자동변환해서 메시지가 깨짐 — `MSYS_NO_PATHCONV=1 git commit ...`로 방지
- `git push`는 Windows Credential Manager가 비대화형 세션에서 멈출 수 있어서 보통 생략 — Vercel 배포만으로 프로덕션 반영됨. 사용자가 나중에 직접 push 필요.
- Node/npm이 PATH에 없는 환경 → `export PATH="/c/Program Files/nodejs:$PATH"` 붙여서 실행
- 로컬 dev 서버는 `.claude/launch.json` 대신 그냥 `nohup npm run dev > /tmp/dev.log 2>&1 &`로 띄우고 끝나면 `netstat`로 PID 찾아서 `taskkill //PID <n> //F` — `preview_start` 도구는 한글 경로 때문에 자주 깨짐(cmd.exe 인코딩 문제).

## 알려진 이슈 / 앞으로 고려할 것

- 미토크리에이트에서 생성된 프로젝트(`connect_projects`)가 메인 카탈로그(`/projects`, "매칭" 명령)에 안 뜸 — 통합하려면 `lib/projects.ts`를 정적 JSON 전용에서 DB 병합 구조로 바꿔야 함(꽤 큰 리팩터).
- `data/projects.json` 재생성이 애드혹 스크립트 기반이라 재현 가능한 파이프라인이 없음 — 다음에 엑셀 새로 받으면 다시 스크립트 짜야 함.
