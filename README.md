<p align="center">
  <img src="public/logo_light.svg" alt="왈가왈부 Logo" width="80" />
</p>

## Tagline-en

Which AI suits you best? Which one argues like a champ?
The easiest way to find out — make them debate each other.
From chatty Gemini to snarky Grok, watch AIs with real personality go head-to-head.

## Tagline-ko

어떤 AI가 나랑 가장 잘 맞을까? 어떤 AI가 가장 말빨이 좋을까?
가장 쉽게 알아보는 방법은 서로 1:1로 말싸움을 붙여보는 거죠!
말 많은 제미나이부터 깐죽거리는 그록까지. 개성 넘치는 AI들의 토론을 들어보세요.

## Tagline-ja

どのAIが自分に一番合う？ どのAIが一番弁が立つ？
手っ取り早く知る方法は、1対1で口喧嘩させてみること！
おしゃべりなGeminiから皮肉屋のGrokまで。個性豊かなAIたちの討論を覗いてみよう。

---

## Summary-en

> *"Which AI actually argues best? Stop guessing — let them prove it."*

You use ChatGPT, Gemini, and Claude every day. But have you ever wondered which one actually holds up in an argument? Forget benchmarks — just let them fight it out. WalGaWalBu throws five AIs into a debate ring, each with its own personality: chatty Gemini, straight-A student Claude, jack-of-all-trades ChatGPT, snarky Grok, and maverick DeepSeek. A Director AI assigns strategies, a Coach whispers tactics, and a Moderator keeps the sparks flying. When the dust settles, a Judge AI scores every argument. And you're not just watching — grab the mic and jump in yourself.

## Summary-ko

> *"어떤 AI가 진짜 말을 잘할까? 궁금하면 직접 붙여봐."*

ChatGPT, Gemini, Claude — 매일 쓰면서도, 어떤 AI가 나랑 잘 맞는지 궁금한 적 없으셨나요? 벤치마크 점수로는 절대 알 수 없는 것들이 있습니다. 왈가왈부는 다섯 개의 AI를 하나의 링 위에 올립니다. 말 많은 제미나이, 모범생 클로드, 팔방미인 ChatGPT, 깐죽대는 그록, 이단아 딥시크 — 각자의 개성으로 토론에 임합니다. 감독 AI가 전략을 짜고, 코치 AI가 전술을 속삭이며, 사회자 AI가 불꽃 튀는 현장을 이끕니다. 토론이 끝나면 심판 AI가 냉정한 판정을 내리죠. 그리고 당신도 직접 마이크를 잡고 AI들 사이에 뛰어들 수 있어요!

## Summary-ja

> *「どのAIが本当に議論が上手い？ 気になるなら、直接ぶつけてみよう。」*

ChatGPT、Gemini、Claude — 毎日使っているけれど、どのAIが自分と相性がいいのか考えたことはありますか？ ベンチマークじゃ絶対わからないことがあります。WalGaWalBuは5つのAIをリングに上げます。おしゃべりなGemini、優等生のClaude、八面六臂のChatGPT、皮肉屋のGrok、異端児DeepSeek — それぞれの個性で討論に挑みます。監督AIが戦略を練り、コーチAIが戦術をささやき、司会AIが火花散る議論をリードします。討論が終われば、審判AIが冷徹なジャッジを下します。そしてあなたもマイクを握って飛び込めます！

---

## ✨ What It Does

- **Pit 5 AIs against each other** — Gemini, ChatGPT, Claude, Grok, and DeepSeek argue from unique perspectives on any topic
- **Run a full debate production** — Director, Coach, Moderator, and Judge AIs orchestrate every round automatically
- **Jump into the ring yourself** — Grab the mic and debate alongside (or against) the AIs
- **Choose your format** — VS mode for 1v1 showdowns, Roundtable mode for multi-party discussions
- **Get scored and analyzed** — AI Judge delivers verdicts with visualized analytics and debate reports
- **Bring your own keys** — BYOK model keeps your API keys in your browser only, never on our servers
- **Use on any device** — Mobile-first responsive design that works everywhere

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (Strict) |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion · GSAP |
| State | Zustand 5 (with persist) |
| AI Integration | Vercel AI SDK |
| AI Providers | Google Gemini · OpenAI · Anthropic · xAI · DeepSeek |
| NLP | Bareun.ai (Korean morphological analysis) |
| Charts | Recharts |
| 3D | React Three Fiber · Drei |
| Deploy | Vercel |

---

## 📦 Installation

### Prerequisites

- Node.js 18+
- At least a Google AI API key ([Get one here](https://aistudio.google.com/apikey))

### Setup

```bash
git clone https://github.com/hsu3046/letsdebate.app.git
cd letsdebate.app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### API Key Setup

**No `.env.local` needed for AI keys.** This project uses the BYOK (Bring Your Own Key) model:

1. Open the app at `http://localhost:3000`
2. Go to **Settings** (⚙️ in the footer)
3. Enter your API keys — at minimum, a **Google AI** key is required
4. Keys are stored in your browser's `localStorage` only

> **Optional**: For self-hosted deployments, set `BAREUN_API_KEY` in `.env.local` for Korean morphological analysis. See [`.env.example`](.env.example) for details.

### Build

```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # AI endpoints (debate, judge, coach, moderator, etc.)
│   ├── arena/            # Main debate arena
│   ├── settings/         # API key management (BYOK)
│   ├── report/           # Debate result reports
│   ├── stats/            # Usage statistics
│   ├── feedback/         # User feedback
│   └── help/             # Help & guide pages
├── components/           # Reusable UI components
│   ├── debate/           # Debate-specific components
│   ├── result/           # Result visualization components
│   └── ui/               # Base UI primitives
├── hooks/                # Custom hooks (useDebateAI, useDebateInitialization)
├── lib/
│   ├── ai/               # Provider config & model mapping
│   ├── prompts/          # Prompt system (v4) — 8-layer architecture
│   ├── keywordExtractor/  # Keyword extraction utilities
│   └── ...               # Debate logic, topic filter, usage limits, etc.
├── store/                # Zustand stores (debate, apiKeys)
├── styles/               # Global styles
└── utils/                # Shared utilities
```

### AI Role System

| Role | Purpose | Model |
|------|---------|-------|
| **Director** | Assigns stances & strategies | Gemini |
| **Coach** | Provides tactical guidance per turn | Gemini |
| **Moderator** | Facilitates flow & asks questions | Gemini |
| **Judge** | Scores and determines the winner | Gemini |
| **Debaters** | Argue their positions | ChatGPT, Claude, Grok, DeepSeek, Gemini |

---

## 🗺 Roadmap

- [ ] Real-time voice debate mode
- [ ] Debate replay & sharing
- [ ] Community topic suggestions
- [ ] Multi-language UI (English, Japanese)
- [ ] Tournament bracket mode

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat(scope): add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html).

---

*Built by [KnowAI](https://knowai.space) · © 2026 KnowAI*
