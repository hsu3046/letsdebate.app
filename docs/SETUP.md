# 로그인과 API 배포 설정

2026-09-06 기준. 코드와 로컬 검증은 준비되었으며 실제 Supabase 프로젝트 연결, Google OAuth 설정, 유료 AI 호출은 아직 수행하지 않았다.

## 환경 구성

왈가왈부 전용 Supabase 프로젝트를 권장한다. 기존 AIB 계정을 통합하려면 프로젝트를 확정한 뒤 해당 인증 정책을 확인한다. Preview와 Production은 프로젝트와 OpenRouter 키를 분리한다.

| 환경변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 가능한 publishable key |
| `SUPABASE_SECRET_KEY` | 서버 전용 secret key 또는 legacy service_role key |
| `OPENROUTER_API_KEY` | 서버 전용 AI 실행 키 |
| `OPENROUTER_ALLOWED_MODELS` | 참가자·심판으로 허용할 모델 ID를 쉼표로 구분 |
| `AI_EXECUTION_ENABLED` | 기본 `false`, 설정 및 검증 완료 후 `true` |
| `AI_DAILY_MATCH_LIMIT` | 계정당 일일 경기 시작 횟수, 기본 3 |
| `AI_DAILY_ASSIST_LIMIT` | 기존 캐릭터 토론 보조 API의 일일 요청 횟수, 기본 30 |

비밀 키에 `NEXT_PUBLIC_`을 붙이지 않는다. 실제 값은 로컬 `.env.local` 또는 Vercel 환경변수에만 등록하고 커밋·로그에 포함하지 않는다. URL과 publishable key는 공개 가능한 값이다. Vercel 환경변수 변경 후에는 새 배포가 필요하다.

## Supabase와 Google 설정 순서

1. 사용할 프로젝트를 확정하고 위의 Supabase 값 3개를 등록한다.
2. 프로젝트 SQL Editor 또는 팀의 Supabase migration 절차로 `supabase/migrations/202609060001_ai_execution_access.sql`을 한 번 적용한다. 기존 테이블을 삭제하거나 덮어쓰는 스크립트가 아니다. `debate_ai_executions`와 `debate_reserve_execution`이 생성되며 브라우저 역할은 접근할 수 없다.
3. Google Cloud에서 웹 애플리케이션용 OAuth Client를 만들고 동의 화면을 설정한다. 테스트 모드라면 테스트 계정을 등록한다. Google의 승인된 리디렉션 URI는 Supabase Dashboard가 표시하는 `https://<project-ref>.supabase.co/auth/v1/callback`이다.
4. Supabase Authentication → Providers → Google에 Client ID와 Client Secret을 등록한다. Google Client Secret은 Next.js 환경변수나 브라우저에 넣지 않는다.
5. Supabase URL Configuration에서 Site URL을 해당 환경의 앱 주소로 지정한다. Redirect URLs에는 앱의 `/api/auth/callback`과 그 `next` 쿼리를 허용하는 패턴을 등록한다. 예: `http://127.0.0.1:3001/api/auth/callback**`, `https://<정확한-preview-host>/api/auth/callback**`, `https://letsdebate.app/api/auth/callback**`. 로컬에서 `localhost`를 쓰면 해당 호스트도 별도로 등록한다. 운영 프로젝트에 전체 Vercel 도메인 와일드카드를 등록하지 않는다.
6. `/login`에서 실제 Google 로그인 → 원래 대진표로 복귀 → `/account` 이용 내역 → 로그아웃을 확인한다. Supabase 프로젝트/DB 장애에서는 공개 페이지는 열리고 계정 및 유료 실행만 오류를 표시해야 한다.

참고: [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google), [Redirect URL 패턴](https://supabase.com/docs/guides/auth/redirect-urls), [서버 인증 클라이언트](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## OpenRouter 활성화 순서

1. 환경별 키를 만들고 OpenRouter 대시보드에서 예산 한도와 허용 모델을 설정한다. 계정별 일일 횟수만으로 서비스 전체 비용을 제한할 수 없으므로 공급자 측 예산도 함께 사용한다.
2. `OPENROUTER_ALLOWED_MODELS`에 실제 사용할 참가 모델과 심판 ID를 모두 등록한다. 기존 캐릭터 토론도 열 경우 `src/lib/ai/config.ts`에 지정된 모델을 확인한다. 목록이 비어 있으면 공개 모델 탐색만 가능하고 실행은 차단된다.
3. `OPENROUTER_API_KEY`를 등록하고 테스트 환경에서 `AI_EXECUTION_ENABLED=true`로 활성화한다.
4. 로그인 계정으로 퀵 매치 한 경기를 실행한다. 네 발언과 판정, 실제 선택 모델, 이용 횟수 차감, 실행 원장의 generation ID·토큰·비용을 OpenRouter 활동 내역과 대조한다.
5. 같은 실행 키 재전송, 로그아웃 요청, 동시 경기, 일일 한도 초과, 중단·시간 초과를 확인한 후 Production을 활성화한다. 실제 운영 계정 전체에 적용되는 변경은 운영자가 별도로 진행한다.

경기는 시작 시 1회 차감하며 실패·중단도 포함한다. 기본 3회는 4강 토너먼트 한 번 분량이다. 8강은 7경기이므로 하루에 끝내게 하려면 한도를 7 이상으로 정한다. 보조 API 30회는 기존 캐릭터 토론 한 세션 30개가 아니라 개별 요청 30개다. 두 한도는 한국 시간 자정에 갱신된다. 익명 탐색은 제한하지 않으며 유료 실행에는 검증된 계정이 필요하다.

완료 요청의 응답은 서버에 저장해 동일 키 재전송 시 재사용한다. 중단되어 최종 usage를 받지 못한 비용은 `null`로 남긴다. 비용 자동 대사, 서버 기록 보존 기간/삭제 작업, 계정 탈퇴 UI, 기기 간 대진표 동기화는 아직 구현하지 않았다. 공개 운영 전 데이터 보존·삭제 정책을 확정해야 한다. 선택적 OpenAI Moderation과 Bareun의 별도 요금은 이 OpenRouter 원장에 포함되지 않는다.

참고: [OpenRouter 예산·모델 Guardrails](https://openrouter.ai/docs/guides/features/guardrails/overview), [실제 토큰·비용 수집](https://openrouter.ai/docs/cookbook/administration/usage-accounting), [Vercel 환경별 변수](https://vercel.com/docs/environment-variables).

## 로컬 실행과 검증

Node.js 20.19 이상과 npm을 사용한다. `.env.example`을 참고해 `.env.local`을 작성한다. 환경변수 없이도 공개 페이지와 준비 중 화면을 확인할 수 있다.

```sh
npm install
npm run dev
npm test
npx tsc --noEmit
npm run build
```

`npm test`는 Node test runner와 TypeScript를 사용한다. 접근 제어, 실행 중복·한도, SSE 사용량 수집, 토너먼트 상태와 판정을 검증하며 PGlite 임시 PostgreSQL에 migration을 적용해 권한과 예약 함수를 검사한다. 외부 DB를 변경하거나 실제 AI를 호출하지 않는다.

브라우저 테스트는 실행 중인 로컬 서버와 Playwright 런타임이 필요하다. 번들 런타임이면 `NODE_PATH`를 지정한다. `TEST_BASE_URL`로 포트, `TEST_OUTPUT_DIR`로 스크린샷 폴더를 지정할 수 있다.

```sh
npm run test:ui
npm run test:auth-ui
```

첫 테스트는 대진 생성·경기·중단·재시작·진출·기록을 확인한다. 두 번째는 로그인 미설정, 모의 OAuth 복귀, 계정 내역, 로그아웃, 세션 오류 복구와 320–1440px 화면을 확인한다. 브라우저 테스트는 인증과 모델 응답을 대체하므로 실제 OAuth 연결 성공을 보장하지 않는다.

## 공개 활성화 전에 남은 항목

현재 `/legal`의 기존 문구는 계정 미생성과 익명 데이터 보관을 전제로 한다. 실제 로그인과 계정별 서버 저장을 공개하기 전에 수집 항목, 처리 업체, 보관 기간과 삭제 요청 절차를 운영 정책에 맞게 갱신해야 한다. 문구의 법적 적합성을 이 코드 검증에서 확정하지 않았다. 기존 PDF 의존성의 보안 경고와 세부 검증 결과는 `docs/VERIFICATION.md`에 기록했다.
