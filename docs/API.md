# 토너먼트 API

## GET /api/models

인증 없이 OpenRouter 공개 `GET https://openrouter.ai/api/v1/models`를 조회한다. 텍스트 입력·출력 모델만 반환하며 배치 전용 모델과 자동 모델 라우터는 제외한다. 업스트림 캐시는 1시간, 요청 제한 시간은 15초다.

응답: `{ models: [{ id, name, contextLength, promptPrice, completionPrice }] }`

가격 필드는 기존 기록·카탈로그 호환을 위해 USD / 토큰 값으로 유지하지만 이용자 화면에는 외부 API 가격을 표시하지 않는다. `OPENROUTER_ALLOWED_MODELS`가 설정되면 지정한 모델만 반환한다. 실제 가용성·정책·요금은 OpenRouter에 따르며, 캐시 시간 동안 변경이 지연될 수 있다. 장애 시 502와 사용자용 오류를 반환하며 모델 목록을 꾸며내지 않는다.

## POST /api/tournament/match

검증된 로그인 쿠키, 같은 출처의 `Origin`, UUID 형식 `Idempotency-Key`가 필요하다. 실행 키는 한 번의 경기 시작을 식별하며 재전송 시 같은 본문과 키를 사용한다. 새로운 시작에는 새 키를 사용한다. 로그인 미확인은 401, 출처 오류 403, 잘못된 키 400, 64KiB 초과 본문 413, 일일 한도 초과 429, 중복/동시 실행 충돌 409, 인증·원장 장애는 503이다. 검증과 예약에 실패하면 모델을 호출하지 않는다.

`AI_EXECUTION_ENABLED=true`, 서버 키, 비어 있지 않은 모델 허용 목록이 필요하다. 완료된 요청의 동일 키 재전송은 저장된 응답과 `X-Execution-Replay: true`를 반환한다. 새 실행 응답에는 `X-Execution-Id`가 포함된다. 시작한 요청은 이후 입력 검증 실패·중단 여부와 관계없이 한도에 포함된다.

요청 필드:

| 필드 | 조건 |
| --- | --- |
| `topic` | trim 후 2–200자 |
| `context` | 선택, 최대 500자 |
| `a`, `b` | 서로 다른 OpenRouter 모델 ID |
| `judge` | 사용자가 선택한 심판 모델 ID |
| `turnsPerSide` | 2 또는 3 |

서버의 `OPENROUTER_API_KEY`만 사용하며, `apiKey`·`apiKeys` 등 정의되지 않은 요청 필드는 400으로 거부한다. 운영자가 지정한 제공 모델 제한은 두 참가자와 심판 모두에 적용한다. 입력·제공 모델 오류는 400, 실행 설정 미완료는 안전한 안내와 503이다. 유효한 요청은 `text/event-stream`으로 다음 이벤트를 보낸다.

- `turn`: id, side(a/b), round
- `delta`: text
- `message`: id, side, round, content — 완료된 발언
- `judging`: 심판 호출 시작
- `verdict`: winner(a/b), scores(a/b, 0–100), reason, highlights(a/b)
- `done`: 경기 정상 종료
- `error`: 안전한 사용자용 message, 판정 없이 종료

10초 간격 heartbeat를 전송하고 `Cache-Control: private, no-store, no-transform`, `X-Accel-Buffering: no`로 스트림 버퍼링과 캐시를 방지한다. 경기 전체 제한은 270초, 개별 모델 응답은 60초, 함수 maxDuration은 300초다. 각 호출의 출력 상한은 4096토큰, 자동 재시도는 0회다. 답변이 비거나 토큰 한도에 잘리면 완료된 발언으로 판정하지 않는다.

심판에게는 모델 ID 대신 A/B 발언만 보낸다. 출력 JSON을 Zod로 검증하고, 승자의 점수가 패자보다 낮으면 판정을 거부한다. 동점은 심판이 반박의 구체성으로 판단하도록 요청한다. 키·원본 업스트림 오류는 로그나 응답에 노출하지 않는다.

## 검증 범위

공개 카탈로그는 실응답 확인. 경기 실행은 모의 provider 및 브라우저 SSE fixture로 정상·오류·중단·진출을 검증했다. 운영용 OpenRouter 키가 아직 제공되지 않아 유료 모델의 실호출은 수행하지 않았다. 배포 환경에서 장시간 SSE 지원 및 maxDuration 적용 여부는 배포 전 확인해야 한다.

참고: [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart), [모델 카탈로그](https://openrouter.ai/models).

## 기존 토론 API

기존 캐릭터·사회자·코치·판정 API도 `src/lib/ai/service.ts`의 서버 OpenRouter 연결을 사용한다. 요청의 개인 키는 읽지 않는다. 서버 연결 미설정 시 모의 토론을 생성하지 않고 503을 반환한다. 기존 Moderation과 Bareun 분석은 선택적 서버 환경변수를 사용한다.

모든 기존 AI POST에도 서버 인증과 일일 보조 요청 한도를 적용한다. 실행 키를 생략하면 서버가 생성한다. `/api/usage/check`와 `/api/usage/consume`은 로그인 계정의 보조 요청 잔여 횟수를 확인하는 사전 조회다. 실제 차감은 AI 요청 예약에서 수행하며 사전 조회만으로 실행을 승인하지 않는다.

## 로그인과 계정

| 경로 | 동작 |
| --- | --- |
| `POST /api/auth/login` | 같은 Origin 확인 후 `{ next?: string }`으로 Google OAuth URL 생성 |
| `GET /api/auth/callback` | PKCE 코드를 서버 세션으로 교환 후 검증한 로컬 경로로 이동 |
| `GET /api/auth/session` | `{ configured, user: { id, name } \| null }`, 비밀 토큰 미포함 |
| `POST /api/auth/logout` | 같은 Origin 확인 후 현재 세션 로그아웃 |
| `GET /api/account` | 로그인 계정의 match/assist limit·remaining, resetAt, 최근 실행 10건 |

인증/계정 응답은 `private, no-store`이며 사용자 ID는 클라이언트 입력이 아닌 서버에서 검증한 세션으로 결정한다. 계정 응답에는 원본 발언·비용·다른 사용자의 기록이 포함되지 않는다. 프로젝트 미설정 시 session은 `{configured:false,user:null}`, 로그인 시작은 503을 반환한다.

인증 구현 참고: [OpenRouter 공식 인증 문서](https://openrouter.ai/docs/api_reference/authentication).
