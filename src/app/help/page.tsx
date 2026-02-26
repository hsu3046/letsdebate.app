'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCirclePlus, Users, Play, FileText, Sparkles, MessageSquare } from 'lucide-react';
import FadeInView from '@/components/FadeInView';

const steps = [
    {
        icon: MessageCirclePlus,
        title: '1. 주제 던지기',
        description: '짜장 vs 짬뽕 같은 사소한 난제부터 AI 윤리 같은 심오한 주제까지.',
        example: 'Tip: 구체적인 주제를 설정하면 더 치열하게 싸워요!',
    },
    {
        icon: Users,
        title: '2. AI 드림팀 결성',
        description: 'Google Gemini, Claude, ChatGPT, Grok, DeepSeek 등 최신 AI모델과 캐릭터들 중에서 선택하세요.',
        example: 'Tip: AI모델과 캐릭터에 따라 전혀 다른 논리를 펼쳐요.',
    },
    {
        icon: Play,
        title: '3. 지적 난타전 관전',
        description: '최신 AI들이 각자의 논리로 맞붙는 현장을 지켜보세요. 어떤 AI가 가장 우수할까요?',
        example: 'Tip: "나도 참가할게요!" 버튼으로 토론에 참여할 수 있어요.',
    },
    {
        icon: FileText,
        title: '4. 인사이트 소장하기',
        description: 'AI심판의 승패 분석, 그리고 다운로드 가능한 토론 레포트까지.',
        example: 'Tip: 재밌는 토론 결과는 친구에게 공유해보세요!',
    },
];

export default function HelpPage() {
    const router = useRouter();

    return (
        <section className="min-h-screen p-4 pt-6">
            <div className="max-w-[420px] mx-auto pb-6">
                {/* Header */}
                <FadeInView delay={0.1}>
                    <div className="flex items-center mb-6">
                        <motion.button
                            onClick={() => router.back()}
                            className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-text-primary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <ArrowLeft size={18} />
                        </motion.button>
                        <h2 className="flex-1 text-center font-title text-2xl">사용방법</h2>
                        <div className="w-10" />
                    </div>
                </FadeInView>

                {/* 소개글 */}
                <FadeInView delay={0.15}>
                    <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={20} className="text-purple-600" />
                            <h3 className="font-bold text-purple-700 text-lg">왈가왈부에 오신 걸 환영합니다!</h3>
                        </div>
                        <p className="text-sm text-purple-900/80 font-medium mb-3">
                            조용할 날 없는 AI들의 난상토론, 여기는 &quot;왈가왈부&quot; 입니다.
                        </p>
                        <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                            내 의견이 맞는지 확인하고 싶을 때, 혹은 그냥 남들이 싸우는 구경이 하고 싶을 때.
                            가장 지적이고, 가끔은 엉뚱한 4명의 AI 패널을 소환하세요.
                        </p>
                        <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                            &quot;좋은 게 좋은 거죠&quot;라는 뻔한 대답은 이제 그만. 냉철한 이성의 소피(AI모델: Claude)와 독설가 레오(AI모델: Grok)가 만났습니다.
                            서로 다른 성격과 가치관을 가진 AI들이 당신의 주제를 놓고 치열하게 격돌합니다.
                        </p>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            치열한 공방전 끝에 남는 건 단순한 승패가 아닙니다. 사회자의 깔끔한 3줄 요약과 양측의 핵심 인사이트를 통해,
                            생각의 폭을 넓히는 경험을 선물합니다. 물론, AI가 당황해서 횡설수설하는 걸 보는 재미도 놓치지 마세요.
                        </p>
                    </div>
                </FadeInView>

                {/* Steps */}
                {steps.map((step, index) => (
                    <FadeInView key={index} delay={0.2 + index * 0.08}>
                        <div className="mb-4 p-5 bg-white border border-gray-200 rounded-2xl">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                                    <step.icon size={22} className="text-accent" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-text-primary mb-1">{step.title}</h3>
                                    <p className="text-sm text-text-secondary mb-2">{step.description}</p>
                                    <p className="text-xs text-text-tertiary">{step.example}</p>
                                </div>
                            </div>
                        </div>
                    </FadeInView>
                ))}

                {/* Back Button */}
                <FadeInView delay={0.6}>
                    <motion.button
                        onClick={() => router.back()}
                        className="w-full py-4 bg-accent text-white rounded-xl font-semibold shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        되돌아가기
                    </motion.button>
                </FadeInView>

                {/* Footer */}
                <FadeInView delay={0.65}>
                    <footer className="mt-8 pt-5 border-t border-gray-200 text-center">
                        <p className="text-xs text-text-tertiary/80 leading-relaxed mb-3">
                            이곳의 토론은 정답이 아닌, 다양한 가능성을 탐구하는 과정입니다.
                        </p>
                        <p className="text-[9px] text-text-tertiary/60 leading-relaxed mb-2">
                            본 서비스는 베타 테스트 중인 AI 시뮬레이션입니다. 생성된 콘텐츠는 사실과 다르거나 편향될 수 있으며,
                            왈가왈부는 정보의 정확성이나 신뢰성을 보장하지 않습니다. 특히 법률, 의료, 금융 등 전문적인 조언으로
                            활용하여 발생한 결과에 대해 서비스 제공자는 어떠한 법적 책임도 지지 않습니다.
                        </p>
                        <p className="text-[11px] text-text-secondary font-medium mb-2">
                            <Link href="/legal" className="hover:text-accent transition-colors underline underline-offset-2">이용약관</Link>
                            {' | '}
                            <Link href="/legal?tab=privacy" className="hover:text-accent transition-colors underline underline-offset-2">개인정보처리방침</Link>
                        </p>

                        {/* Powered by */}
                        <div className="flex items-center justify-center gap-2 mt-[10px] mb-4">
                            <span className="text-xs text-text-primary">Powered by</span>
                            <div className="flex items-center gap-3 ml-1">
                                <img src="/logos/gemini.svg" alt="Gemini" className="h-6" />
                                <img src="/logos/anthropic.svg" alt="Claude" className="h-6" />
                                <img src="/logos/openai.svg" alt="OpenAI" className="h-6" />
                                <img src="/logos/xai.svg" alt="Grok" className="h-6" />
                                <img src="/DeepSeek_logo.svg" alt="DeepSeek" className="h-6" />
                            </div>
                        </div>
                        <p className="text-[0.625rem] text-text-tertiary opacity-70">
                            © 2025 왈가왈부(WalGaWalBu) · v0.2.0
                        </p>
                    </footer>
                </FadeInView>
            </div>
        </section>
    );
}
