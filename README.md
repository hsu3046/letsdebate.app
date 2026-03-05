<p align="center">
  <img src="public/logo_light.svg" alt="왈가왈부 Logo" width="80" />
</p>

<h1 align="center">왈가왈부 (WalGaWalBu)</h1>

## Summary-ko

> *"만약 세계 최고의 AI들이 한자리에 모여 토론한다면?"*

Gemini, ChatGPT, Claude, Grok, DeepSeek — 다섯 개의 AI가 하나의 주제를 놓고 격돌합니다.
감독 AI가 전략을 짜고, 코치 AI가 전술을 속삭이며, 사회자 AI가 불꽃 튀는 현장을 이끕니다.
토론이 끝나면 심판 AI가 냉정한 판정을 내립니다.

그냥 구경만? 아닙니다.
당신도 직접 마이크를 잡고 AI들 사이에 뛰어들 수 있어요! 🎤
## Summary-en

> *"What if the world's most powerful AIs sat down to debate — and you could join them?"*

Gemini, ChatGPT, Claude, Grok, and DeepSeek clash over a single topic in real-time.
A Director AI assigns strategies, a Coach AI whispers tactics, and a Moderator AI keeps the sparks flying.
When the dust settles, a Judge AI delivers the verdict.

But you're not just a spectator.
Grab the mic and jump into the ring alongside the AIs! 🎤

## Summary-ja

> *「もし世界最強のAIたちが一堂に会して討論したら？」*

Gemini、ChatGPT、Claude、Grok、DeepSeek — 5つのAIが一つのテーマを巡り激突します。
監督AIが戦略を練り、コーチAIが戦術をささやき、司会AIが火花散る議論をリードします。
討論が終われば、審判AIが冷徹なジャッジを下します。

ただの観客？ いいえ。
あなたもマイクを握り、AIたちの中に飛び込めてみましょう！ 🎤
---

## Features

- 🤖 **Multi-AI Debate** — 5 different AI providers argue from unique perspectives
- 🎭 **AI Roles** — Director, Coach, Moderator, and Judge orchestrate the debate
- 👤 **Human Participation** — Jump in and debate alongside the AIs
- ⚔️ **VS & Roundtable Modes** — 1v1 or multi-party discussions
- 📊 **Analytics & Reports** — Visualized debate results with AI-generated summaries
- 🔑 **BYOK** — Bring Your Own API Key, stored only in your browser
- 📱 **Mobile-First** — Responsive design optimized for all devices

## Tech Stack

| Category | Technology |
|:---|:---|
| **Framework** | Next.js 16 (App Router) |
| **Styling** | Tailwind CSS 4 |
| **Animation** | Framer Motion |
| **State** | Zustand (with persist) |
| **AI SDK** | Vercel AI SDK |
| **AI Providers** | Google Gemini, OpenAI, Anthropic, xAI, DeepSeek |
| **Morphology** | Bareun.ai (Korean NLP) |

## Getting Started

### Prerequisites

- Node.js 18+
- At least a Google AI API key ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/hsu3046/letsdebate.app.git
cd letsdebate.app

# Install dependencies
npm install

# Start development server
npm run dev
```

### API Key Setup

**No `.env.local` needed for AI keys.** This project uses the BYOK (Bring Your Own Key) model:

1. Open the app at `http://localhost:3000`
2. Go to **Settings** (⚙️ in the footer)
3. Enter your API keys — at minimum, a **Google AI** key is required
4. Keys are stored in your browser's `localStorage` only

> **Optional**: For self-hosted deployments, you can set `BAREUN_API_KEY` in `.env.local` for Korean morphological analysis. See [`.env.example`](.env.example) for details.

### Build

```bash
npm run build
npm run start
```

## Architecture

```
src/
├── app/              # Next.js App Router pages & API routes
│   ├── api/          # AI endpoints (debate, judge, coach, etc.)
│   ├── arena/        # Main debate arena
│   ├── settings/     # API key management (BYOK)
│   └── ...
├── components/       # Reusable UI components
├── hooks/            # Custom hooks (useDebateAI, etc.)
├── lib/
│   ├── ai/           # Provider config & model mapping
│   ├── prompts/      # Prompt system (v4)
│   └── ...
└── store/            # Zustand stores (debate, apiKeys)
```

### AI Role System

| Role | Purpose | Model |
|------|---------|-------|
| **Director** | Assigns stances & strategies | Gemini |
| **Coach** | Provides tactical guidance per turn | Gemini |
| **Moderator** | Facilitates flow & asks questions | Gemini |
| **Judge** | Scores and determines the winner | Gemini |
| **Debaters** | Argue their positions | ChatGPT, Claude, Grok, DeepSeek, Gemini |

## Deployment

Optimized for **Vercel**:

```bash
npx vercel
```

Set `BAREUN_API_KEY` in your Vercel environment variables for Korean NLP support.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with 💚 by <a href="https://github.com/hsu3046">WalGaWalBu Team</a>
</p>
