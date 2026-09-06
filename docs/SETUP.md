# 로컬 실행과 검증

Node.js 20.19 이상과 npm을 사용한다.

```sh
npm install
npm run dev
```

운영자는 `.env.example`을 참고해 `.env.local`에 `OPENROUTER_API_KEY`를 설정한다. 이용자용 키 입력 화면은 없다. 토너먼트와 기존 캐릭터 토론은 이 서버 연결을 공유한다. `NEXT_PUBLIC_` 접두사를 붙이지 않으며, 실제 키를 커밋하지 않는다.

선택적으로 `OPENROUTER_ALLOWED_MODELS`에 쉼표로 구분한 모델 ID를 설정하면 카탈로그와 실행을 제한할 수 있다. 비워두면 공개 텍스트 모델을 제공한다. 기존 캐릭터 토론도 사용할 경우 `src/lib/ai/config.ts`의 캐릭터·진행자·fallback 모델도 포함해야 한다.

서버 키 없이도 주제 탐색·모델 선택·대진표 생성이 가능하다. 실제 경기 요청에는 503과 서비스 준비 중 안내를 반환한다. 운영 키를 변경한 뒤 서버를 재시작한다. 기존 OpenAI Moderation과 Bareun 기능은 별도의 선택적 서버 키를 사용한다.

브라우저에서 `http://localhost:3000`을 연다.

## 검증 명령

```sh
npm test
npx tsc --noEmit
npm run build
```

`npm test`는 기존 TypeScript 컴파일러와 Node의 test runner를 사용한다. 별도 테스트 패키지를 설치하지 않는다. 대진 생성·승자 진출·중복/늦은 판정·내보내기·스트림 프로토콜·OpenRouter 오류 응답을 검증한다.

브라우저 테스트는 사용 가능한 Playwright 런타임과 실행 중인 로컬 서버가 필요하다.

```sh
npm run test:ui
```

Playwright가 번들 런타임에 있으면 `NODE_PATH`로 해당 node_modules 경로를 지정한다. 다른 포트는 `TEST_BASE_URL`, 스크린샷 경로는 `TEST_OUTPUT_DIR`로 지정한다. 기본 출력은 `/tmp/letsdebate-qa`다. 모델과 경기 API는 테스트 응답으로 대체하므로 유료 API를 호출하지 않는다. 테스트는 이전 키 저장소 제거, 키 없는 경기 요청, 준비 중 오류와 재시작을 검증한다. 모의 키는 격리된 테스트에만 사용한다.

## 실제 키를 받은 뒤 확인할 항목

1. 운영용 OpenRouter 키를 서버 환경변수에 설정하고 비용이 낮은 텍스트 모델 4개와 심판을 선택한다.
2. 퀵 매치 한 경기를 실행해 네 발언과 판정을 확인한다.
3. 선택한 모델 ID가 OpenRouter 활동 내역에 기록되는지 확인한다.
4. 모델별 지연·최대 토큰·잔액·권한에 따른 이용자용 재시도 안내와 운영자 활동 내역을 확인한다.

현재는 실키를 받지 않아 이 유료 실호출 단계는 수행하지 않았다.
