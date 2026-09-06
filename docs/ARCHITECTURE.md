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

기존 `@ai-sdk/openai`의 Chat Completions 호환 클라이언트에 OpenRouter base URL을 지정한다. 신규 패키지는 추가하지 않았다. 선택 모델의 오류에 다른 모델로 폴백하지 않는다. 자동 재시도도 하지 않아 예상치 못한 추가 비용과 모델 혼동을 줄인다.

## 저장

| localStorage 키 | 내용 |
| --- | --- |
| `walgawalbu-tournaments` | 대진표·참가 모델·심판·완료된 발언·판정 |
| `walgawalbu-library` | 저장한 주제 ID |
| `walgawalbu-current-setup` | 기존 캐릭터 토론 설정·기록 |

API 키는 서버 환경변수 `OPENROUTER_API_KEY`로만 관리한다. 클라이언트는 키를 수집·저장·전송하지 않는다. `ClientLayout`에서 이전 `letsdebate_api_keys` 저장소만 삭제하며 토너먼트·북마크는 보존한다. `/settings`는 `/help`로 리다이렉트한다. 새로고침 때 저장된 `running` 상태는 `interrupted`로 바꾸고, 완료된 발언은 유지한다. 브라우저 저장소를 삭제하면 기록도 삭제되므로 Markdown 내보내기를 제공한다. 계정 동기화나 클라우드 저장은 구현 범위에 포함하지 않는다.

## 기존 기능

`/setup → /participants → /arena → /stats → /report`는 기존 캐릭터 토론이며 서버의 OpenRouter 연결을 공유한다. 도움말에서 접근할 수 있다. 주제·형식 복원, 중복 시작 방지, 반응형 폭, 공통 UI를 보강했다. 과거 프롬프트·캐릭터 관련 문서는 이 기존 엔진의 참고 자료다.
