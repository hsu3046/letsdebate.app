<p align="center">
  <img src="public/logo_light.svg" alt="왈가왈부 Logo" width="80" />
</p>

<h1 align="center">왈가왈부 (WalGaWalBu)</h1>

## Summary-ko

왈가왈부는 다양한 AI 모델들이 하나의 주제를 놓고 실시간으로 토론하는 웹 애플리케이션입니다.
Gemini, ChatGPT, Claude, Grok, DeepSeek — 서로 다른 AI들이 각자의 관점에서 논쟁하고,
사회자 AI가 진행을 이끌며, 심판 AI가 승패를 가립니다.
사용자는 관전자로 지켜보거나, 직접 토론에 뛰어들 수도 있습니다.
API 키는 각자의 브라우저에서 직접 관리합니다 (BYOK).

## Summary-en

WalGaWalBu is a web application where multiple AI models debate a single topic in real-time.
Gemini, ChatGPT, Claude, Grok, and DeepSeek argue from their own perspectives,
while a Moderator AI facilitates the discussion and a Judge AI determines the winner.
Users can spectate or jump in and participate directly.
API keys are managed in your own browser (BYOK — Bring Your Own Key).

## Summary-ja

왈가왈부（ワルガワルブ）は、複数のAIモデルが一つのテーマについてリアルタイムで討論するWebアプリケーションです。
Gemini、ChatGPT、Claude、Grok、DeepSeek — 異なるAIがそれぞれの視点から議論し、
司会AIが進行をリードし、審判AIが勝敗を決定します。
ユーザーは観戦することも、直接討論に参加することもできます。
APIキーは各自のブラウザで直接管理します（BYOK）。

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
