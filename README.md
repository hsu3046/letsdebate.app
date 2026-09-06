<p align="center"><img src="public/logo_light.svg" alt="왈가왈부" width="72" /></p>

# 왈가왈부 · WalGaWalBu

**같은 질문, 다른 AI. 마지막 한 모델까지.**

OpenRouter 모델로 1대1 디베이트 토너먼트를 만들고, 주장과 반박을 지켜보며 나만의 챔피언을 발견하세요.

*One topic. Different AIs. One champion. Build a debate bracket with OpenRouter models and follow every argument to the final.*

*同じ問い、異なるAI。OpenRouterのモデルで1対1の討論トーナメントを作り、最後のチャンピオンを見届けよう。*

## 주요 기능

- **4강·8강 토너먼트** — 순서를 섞어 대진을 편성하고 한 경기씩 진행
- **서비스 제공 AI 선택** — 다양한 OpenRouter 모델을 이름·제공사로 검색
- **실시간 1대1 토론** — 각 2회 또는 3회 발언, 중단·재시작 지원
- **사용자가 고르는 AI 심판** — 익명화한 A/B 발언을 평가하고 점수·판정 이유 제공
- **주제 탐색과 북마크** — 추천 질문 100개와 직접 작성
- **나의 토론** — 브라우저 기록 저장·검색·삭제·Markdown 내보내기
- **모바일과 데스크톱** — 모바일 하단 탐색, 데스크톱 사이드바와 전체 대진표

AI 연결은 왈가왈부가 제공합니다. 이용자는 개인 API 키나 외부 계정을 연결하지 않고 모델을 골라 경기를 시작합니다. 운영용 키는 서버 환경변수에서만 관리하며 브라우저에 저장하거나 전달하지 않습니다.

## 실행

Node.js 20.19 이상.

```sh
npm install
npm run dev
```

운영자는 `.env.local`에 `OPENROUTER_API_KEY`를 설정한 뒤 [로컬 앱](http://localhost:3000)을 엽니다. 키 미설정 시 모델 탐색·대진표 생성은 가능하고 실제 경기는 준비 중 안내를 반환합니다.

```sh
npm test
npm run build
```

브라우저 테스트는 실행 중인 서버와 기존 Playwright 런타임이 필요합니다. [실행·검증 안내](docs/SETUP.md)를 확인하세요.

## 구조와 문서

| 영역 | 구성 |
| --- | --- |
| 앱 | Next.js 16 · React 19 · strict TypeScript |
| UI | Tailwind CSS 4 · CSS tokens · Lucide · Framer Motion |
| AI | OpenRouter Chat Completions · 기존 Vercel AI SDK |
| 상태 | Zustand persist · 브라우저 localStorage |
| 검증 | Node test runner · TypeScript · Playwright |

- [아키텍처](docs/ARCHITECTURE.md)
- [토너먼트 API](docs/API.md)
- [제품 결정](docs/DECISIONS.md)
- [설치와 검증](docs/SETUP.md)
- [디자인 시스템](docs/design-system.md)

기존 캐릭터 토론도 서버의 OpenRouter 연결로 도움말에서 계속 이용할 수 있습니다. 기존 `/setup → /participants → /arena → /stats → /report` 엔진과 과거 기록을 보존합니다.

AI 판정은 특정 주제·역할·심판 조건에서의 결과이며, 보편적인 모델 성능 순위가 아닙니다. 생성된 정보는 직접 확인해주세요.

## 라이선스

[GNU GPL v3](LICENSE) · © 2026 [KnowAI](https://knowai.space)
