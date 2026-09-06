# 토너먼트 API

## GET /api/models

인증 없이 OpenRouter 공개 `GET https://openrouter.ai/api/v1/models`를 조회한다. 텍스트 입력·출력 모델만 반환하며 배치 전용 모델과 자동 모델 라우터는 제외한다. 업스트림 캐시는 1시간, 요청 제한 시간은 15초다.

응답: `{ models: [{ id, name, contextLength, promptPrice, completionPrice }] }`

가격 필드는 기존 기록·카탈로그 호환을 위해 USD / 토큰 값으로 유지하지만 이용자 화면에는 외부 API 가격을 표시하지 않는다. `OPENROUTER_ALLOWED_MODELS`가 설정되면 지정한 모델만 반환한다. 실제 가용성·정책·요금은 OpenRouter에 따르며, 캐시 시간 동안 변경이 지연될 수 있다. 장애 시 502와 사용자용 오류를 반환하며 모델 목록을 꾸며내지 않는다.

## POST /api/tournament/match

요청 필드:

| 필드 | 조건 |
| --- | --- |
| `topic` | trim 후 2–200자 |
| `context` | 선택, 최대 500자 |
| `a`, `b` | 서로 다른 OpenRouter 모델 ID |
| `judge` | 사용자가 선택한 심판 모델 ID |
| `turnsPerSide` | 2 또는 3 |

서버의 `OPENROUTER_API_KEY`만 사용하며, `apiKey`·`apiKeys` 등 정의되지 않은 요청 필드는 400으로 거부한다. 운영자가 지정한 제공 모델 제한은 두 참가자와 심판 모두에 적용한다. 입력·제공 모델 오류는 400, 서버 키 미설정은 안전한 안내와 503이다. 유효한 요청은 `text/event-stream`으로 다음 이벤트를 보낸다.

- `turn`: id, side(a/b), round
- `delta`: text
- `message`: id, side, round, content — 완료된 발언
- `judging`: 심판 호출 시작
- `verdict`: winner(a/b), scores(a/b, 0–100), reason, highlights(a/b)
- `done`: 경기 정상 종료
- `error`: 안전한 사용자용 message, 판정 없이 종료

10초 간격 heartbeat를 전송하고 `Cache-Control: no-cache, no-store, no-transform`, `X-Accel-Buffering: no`로 스트림 버퍼링과 캐시를 방지한다. 경기 전체 제한은 270초, 개별 모델 응답은 60초, 함수 maxDuration은 300초다. 각 호출의 출력 상한은 4096토큰, 자동 재시도는 0회다. 답변이 비거나 토큰 한도에 잘리면 완료된 발언으로 판정하지 않는다.

심판에게는 모델 ID 대신 A/B 발언만 보낸다. 출력 JSON을 Zod로 검증하고, 승자의 점수가 패자보다 낮으면 판정을 거부한다. 동점은 심판이 반박의 구체성으로 판단하도록 요청한다. 키·원본 업스트림 오류는 로그나 응답에 노출하지 않는다.

## 검증 범위

공개 카탈로그는 실응답 확인. 경기 실행은 모의 provider 및 브라우저 SSE fixture로 정상·오류·중단·진출을 검증했다. 운영용 OpenRouter 키가 아직 제공되지 않아 유료 모델의 실호출은 수행하지 않았다. 배포 환경에서 장시간 SSE 지원 및 maxDuration 적용 여부는 배포 전 확인해야 한다.

참고: [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart), [모델 카탈로그](https://openrouter.ai/models).

## 기존 토론 API

기존 캐릭터·사회자·코치·판정 API도 `src/lib/ai/service.ts`의 서버 OpenRouter 연결을 사용한다. 요청의 개인 키는 읽지 않는다. 서버 연결 미설정 시 모의 토론을 생성하지 않고 503을 반환한다. 기존 Moderation과 Bareun 분석은 선택적 서버 환경변수를 사용한다.

인증 구현 참고: [OpenRouter 공식 인증 문서](https://openrouter.ai/docs/api_reference/authentication).
