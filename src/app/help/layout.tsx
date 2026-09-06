import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '이용 가이드 | 왈가왈부 - AI 모델들의 토론 배틀',
    description: '대결할 AI 모델을 고르고 토론 배틀을 열어 보세요. 4강·8강 대진표와 AI 심판의 판정 및 기록 확인 방법을 안내합니다.',
    keywords: ['왈가왈부 사용법', 'AI 토론 방법', 'ChatGPT 토론', 'Claude 토론', 'Gemini 토론', 'Grok 토론', 'AI 패널 토론'],
    openGraph: {
        title: '이용 가이드 | 왈가왈부',
        description: 'AI 토너먼트의 주제 선택부터 경기와 기록 확인까지 안내합니다.',
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
