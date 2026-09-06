# 왈가왈부 아키텍처

2026-09-06 · AI 디베이트 토너먼트

## 사용자 흐름

`/` 발견 → `/topics` 주제 탐색 → `/tournament/new` 모델·심판 선택 → `/tournament?id=…` 대진표 및 경기 → `/history` 기록

- Next.js 16 App Router, React 19, strict TypeScript.
- 모바일 하단 탐색과 데스크톱 사이드바를 `AppShell`에서 공유한다.
- 루트 `ClientLayout`은 `MotionConfig reducedMotion="user"`를 적용한다. 지속 실행하던 Blob/Lenis/GSAP 배경은 기본 레이아웃에서 사용하지 않는다.
- `/arena`는 기존 캐릭터 토론 전용 독립 뷰포트이며, 신규 토너먼트 엔진과 상태를 공유하지 않는다.

## 토너먼트

| 책임 | 파일 |
| --- | --- |
| 대진 생성, 승자 진출, 타입, 내보내기 | `src/lib/tournament.ts` |
| 검증 가능한 SSE 이벤트·판정 스키마 | `src/lib/tournamentProtocol.ts` |
| 브라우저 영속 상태와 실행 식별자 검증 | `src/store/tournamentStore.ts` |
| 스트림 읽기·중단·완료 처리 | `src/hooks/useMatchRunner.ts` |
| 모델 카탈로그 | `src/app/api/models/route.ts`, `src/hooks/useModelCatalog.ts` |
| OpenRouter 경기 실행 | `src/app/api/tournament/match/route.ts` |
| 서버 AI 연결·제공 모델 정책 | `src/lib/ai/service.ts` |
| 주제 북마크 | `src/store/libraryStore.ts` |

4강은 3경기, 8강은 7경기로 구성한다. 각 경기의 승자가 다음 라운드의 해당 슬롯에 들어간다. 심판 판정이 검증되어야 완료 상태가 되며, 클라이언트의 `tournamentId + matchId + runId`가 일치하는 실행만 상태를 변경한다.

경기 상태는 `pending → running → completed` 또는 `running → interrupted`이다. 중단된 경기는 명시적으로 다시 시작하며, 해당 경기의 발언을 처음부터 생성한다. 이미 완료한 경기와 이전 runId의 늦은 이벤트는 진출 상태를 바꾸지 못한다.

## 실행과 비용

한 경기만 사용자 클릭으로 실행한다. 다음 경기는 자동으로 시작하지 않는다. 퀵 매치는 모델마다 2회, 깊은 토론은 3회 발언하며, 별도 심판 호출이 1회 발생한다. 매 라운드 선발언 순서를 바꾼다. A가 먼저 입장을 정하고 B가 반대 관점을 맡으므로 이는 특정 주제·역할·심판 조건의 결과이지 공인 모델 벤치마크가 아니다.

기존 `@ai-sdk/openai`의 Chat Completions 호환 클라이언트에 OpenRouter base URL을 지정한다. 토너먼트는 선택 모델의 오류에 다른 모델로 폴백하지 않고 자동 재시도도 하지 않는다. 기존 캐릭터 엔진은 별도 동작을 유지한다.

## 인증과 서버 실행 원장

`/login` → 서버 Google OAuth 시작 → Supabase callback → `/api/auth/callback` PKCE 코드 교환 → 원래 화면으로 복귀한다. `@supabase/ssr`와 `@supabase/supabase-js`를 사용한다. 세션 쿠키는 HttpOnly·SameSite=Lax이며 운영 환경에서 Secure를 적용한다. Route Handler에서만 쿠키를 갱신하고 서버 권한은 `auth.getUser()`로 검증한다. 클라이언트에는 사용자 ID·표시 이름만 반환한다.

공개 페이지 SSR은 Auth를 기다리지 않는다. AuthProvider가 `/api/auth/session`을 통해 상태를 확인한다. 인증 검증 전체와 각 Supabase 네트워크 요청은 2.5초로 제한한다. 인증·DB 장애 시 유료 호출을 허용하지 않는다.

모든 AI POST는 `withAIRequest`를 거친다. 같은 Origin, 운영 활성화, 검증된 계정, 입력 크기, 실행 키를 검사하고 서버 admin client로 Postgres 예약 함수를 호출한다. 계정별 advisory transaction lock으로 한도 확인과 실행 예약을 원자적으로 처리한다. 실제 AI 호출 중에는 DB 잠금을 유지하지 않는다. 추가 Redis는 사용하지 않는다.

경기는 계정당 한 번에 1개, 기존 보조 요청은 최대 3개가 가능하며 경기와 보조 요청은 동시에 실행하지 않는다. 일일 횟수는 한국 시간 기준 시작한 요청을 계산하고 실패·중단도 포함한다. 동일 실행 키와 본문으로 완료 요청을 재전송하면 저장된 응답을 반환한다. 다른 본문, 실행 중·실패한 키는 409다. 새로 시작 버튼은 새 실행 키를 만들어 새 횟수를 사용한다.

AsyncLocalStorage로 요청별 취소 신호와 사용량을 묶는다. provider fetch는 스트림 원본 바이트를 전달하면서 OpenRouter generation ID·모델·usage·cost를 수집한다. 응답 완료 후 실행 상태·본문·비용을 저장한다. 최종 비용을 받지 못하면 0 대신 null을 기록한다. 브라우저 역할은 원장/RPC에 직접 접근할 수 없고 `/api/account`는 검증된 계정의 한도와 최근 상태만 반환한다.

## 저장

| localStorage 키 | 내용 |
| --- | --- |
| `walgawalbu-tournaments` | 대진표·참가 모델·심판·완료된 발언·판정 |
| `walgawalbu-library` | 저장한 주제 ID |
| `walgawalbu-current-setup` | 기존 캐릭터 토론 설정·기록 |

API 키는 서버 환경변수 `OPENROUTER_API_KEY`로만 관리한다. 클라이언트는 키를 수집·저장·전송하지 않는다. `ClientLayout`에서 이전 `letsdebate_api_keys` 저장소만 삭제하며 토너먼트·북마크는 보존한다. `/settings`는 `/help`로 리다이렉트한다. 새로고침 때 저장된 `running` 상태는 `interrupted`로 바꾸고, 완료된 발언은 유지한다. 브라우저 저장소를 삭제하면 대진표와 기록도 삭제되므로 Markdown 내보내기를 제공한다. Supabase에는 실행 원장과 중복 응답 재사용용 본문을 저장하며 기기 간 대진표 동기화는 아직 제공하지 않는다.

## 기존 기능

`/setup → /participants → /arena → /stats → /report`는 기존 캐릭터 토론이며 서버의 OpenRouter 연결을 공유한다. 도움말에서 접근할 수 있다. 주제·형식 복원, 중복 시작 방지, 반응형 폭, 공통 UI를 보강했다. 과거 프롬프트·캐릭터 관련 문서는 이 기존 엔진의 참고 자료다.
