import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '사용방법 | 왈가왈부 - AI와 함께하는 토론 플랫폼',
    description: '왈가왈부 사용법: 주제를 던지고, AI 드림팀을 결성하고, 지적 난타전을 관전하세요. Gemini, ChatGPT, Claude, Grok 4대 AI가 펼치는 토론 서비스입니다.',
    keywords: ['왈가왈부 사용법', 'AI 토론 방법', 'ChatGPT 토론', 'Claude 토론', 'Gemini 토론', 'Grok 토론', 'AI 패널 토론'],
    openGraph: {
        title: '사용방법 | 왈가왈부',
        description: '주제를 던지고, AI 드림팀을 결성하고, 지적 난타전을 관전하세요.',
        type: 'article',
    },
};

export default function HelpLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
