'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Edit3, FileText, MessageCircle, AlertTriangle, HelpCircle, MessageSquare, Shuffle, X, Bell, Swords, UsersRound, Settings } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { isContentAllowed } from '@/lib/topicFilter';
import { validateTopic, validateContext } from '@/lib/inputValidation';
import { RANDOM_TOPICS, getRandomTopic } from '@/lib/topics';
import type { Topic } from '@/lib/types';
import FadeInView from '@/components/FadeInView';

function SetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setup, setSetup, state } = useDebateStore();

    // ?new=true 일 때만 초기화 (메인 → 새 토론 시작하기 클릭 시)
    const isNewDebate = searchParams.get('new') === 'true';

    const [topic, setTopic] = useState(isNewDebate ? '' : (setup.topic || ''));
    const [context, setContext] = useState(isNewDebate ? '' : (setup.context || ''));
    // turnCount state 삭제: debateType에 따라 자동 결정됨
    const [debateType, setDebateType] = useState<'vs' | 'roundtable'>('vs'); // 토론 종류
    const [showTopicAlert, setShowTopicAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // URL에서 new 파라미터 제거 (뒤로가기 시 다시 리셋되지 않도록)
    // 새 토론 시작 시 참가자 선택 상태와 주제도 초기화
    useEffect(() => {
        if (isNewDebate) {
            setSetup({
                topic: '',
                context: '',
                turnCount: 8, // 기본값(VS모드 기준)
                selectedCharacterIds: [],
                humanParticipation: false,
                humanName: '',
            });
            router.replace('/setup', { scroll: false });
        }
    }, [isNewDebate, router, setSetup]);

    const handleRandomTopic = () => {
        const randomTopic = getRandomTopic();
        setTopic(randomTopic.title);
    };

    // 🎯 토론 길이 자동 설정 (VS=8, Roundtable=15)
    // 렌더링 시점에도 계산하여 Footer 버튼 등에서 사용
    const autoTurnCount = debateType === 'vs' ? 8 : 15;

    const handleNext = () => {
        // 1. Zod 검증 - 주제
        const topicValidation = validateTopic(topic);
        if (!topicValidation.success) {
            setAlertMessage(topicValidation.error || '주제를 입력해주세요.');
            setShowTopicAlert(true);
            return;
        }

        // 2. Zod 검증 - 배경 설명
        const contextValidation = validateContext(context);
        if (!contextValidation.success) {
            setAlertMessage(contextValidation.error || '배경 설명이 너무 깁니다.');
            setShowTopicAlert(true);
            return;
        }

        // 3. 키워드 필터 - 주제
        const topicCheck = isContentAllowed(topicValidation.data!);
        if (!topicCheck.allowed) {
            setAlertMessage(topicCheck.reason || '이 주제는 토론할 수 없습니다.');
            setShowTopicAlert(true);
            return;
        }

        // 4. 키워드 필터 - 배경 설명
        if (contextValidation.data) {
            const contextCheck = isContentAllowed(contextValidation.data);
            if (!contextCheck.allowed) {
                setAlertMessage(contextCheck.reason || '이 배경 설명은 허용되지 않습니다.');
                setShowTopicAlert(true);
                return;
            }
        }

        setSetup({
            topic: topicValidation.data!,
            context: contextValidation.data || '',
            turnCount: autoTurnCount,
            progressionMode: 'auto',
            debateType,
        });
        router.push('/participants');
    };

    return (
        <>
            <section className="min-h-screen p-4 pt-16">
                <div className="max-w-[420px] mx-auto pb-6">
                    {/* Header */}
                    <FadeInView delay={0.1}>
                        <div className="flex items-center mb-6 pt-2">
                            <Link href="/">
                                <motion.div
                                    className="w-10 h-10 glass rounded-lg flex items-center justify-center text-text-primary"


                                >
                                    <ArrowLeft size={18} />
                                </motion.div>
                            </Link>
                            <h2 className="flex-1 text-center font-title text-3xl">토론 주제 정하기</h2>
                            <div className="w-10" />
                        </div>
                    </FadeInView>

                    {/* Topic Input */}
                    <FadeInView delay={0.2}>
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2.5">
                                <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                    <Edit3 size={16} className="text-accent" />
                                    토론 주제
                                </label>
                                {/* 1. 랜덤 주제 버튼 */}
                                <motion.button
                                    onClick={handleRandomTopic}
                                    className="flex items-center gap-1 text-xs hover:underline"
                                    style={{ color: '#059669' }}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                >
                                    <Shuffle size={14} />
                                    랜덤 주제
                                </motion.button>
                            </div>
                            <motion.div
                                className="glass rounded-xl overflow-hidden"
                                whileFocus={{ borderColor: 'var(--accent)' }}
                            >
                                <textarea
                                    className="w-full min-h-[88px] p-4 bg-transparent border-none font-sans text-[0.9375rem] text-text-primary resize-y leading-relaxed placeholder:text-text-tertiary focus:outline-none"
                                    maxLength={200}
                                    placeholder="토론하고 싶은 주제를 입력하세요..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                                <div className="flex justify-between items-center px-4 py-2 bg-bg-tertiary text-xs">
                                    <span></span>
                                    <span className="text-text-tertiary">{topic.length}/200</span>
                                </div>
                            </motion.div>
                        </div>
                    </FadeInView>

                    {/* Context Input - HIDDEN */}
                    {/* <FadeInView delay={0.3}>
                        <div className="mb-6">
                            <label className="flex items-center gap-2 text-sm font-semibold mb-2.5 text-text-primary">
                                <FileText size={16} className="text-accent" />
                                배경 설명
                                <span className="text-[0.6875rem] font-medium text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">선택</span>
                            </label>
                            <motion.div className="glass rounded-xl overflow-hidden">
                                <textarea
                                    className="w-full min-h-[88px] p-4 bg-transparent border-none font-sans text-[0.9375rem] text-text-primary resize-y leading-relaxed placeholder:text-text-tertiary focus:outline-none"
                                    maxLength={500}
                                    placeholder="최신 뉴스나 특정 상황을 AI에게 알려주세요..."
                                    value={context}
                                    onChange={(e) => setContext(e.target.value)}
                                />
                                <div className="flex justify-between items-center px-4 py-2 bg-bg-tertiary text-[10px]">
                                    <span className="flex items-center gap-1 text-orange-500">
                                        <AlertTriangle size={11} />
                                        AI는 입력 정보를 사실로 간주하며, 정확성 책임은 사용자에게 있습니다.
                                    </span>
                                    <span className="text-text-tertiary">{context.length}/500</span>
                                </div>
                            </motion.div>
                        </div>
                    </FadeInView> */}

                    {/* Debate Type Selector */}
                    <FadeInView delay={0.3}>
                        <div className="mb-6">
                            <label className="flex items-center gap-2 text-sm font-semibold mb-2.5 text-text-primary">
                                <FileText size={16} className="text-accent" />
                                토론 종류
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <motion.button
                                    onClick={() => setDebateType('vs')}
                                    className={`p-4 rounded-xl border-2 transition-all ${debateType === 'vs'
                                        ? 'border-accent bg-accent/10'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="flex justify-center mb-2">
                                        <Swords size={28} className={debateType === 'vs' ? 'text-accent' : 'text-text-tertiary'} />
                                    </div>
                                    <div className={`font-semibold ${debateType === 'vs' ? 'text-accent' : 'text-text-primary'}`}>
                                        VS 모드
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-1">같은 질문, 다른 해석. AI 모델의 고유한 관점 차이를 1:1로 비교하세요.</p>
                                </motion.button>
                                <motion.button
                                    onClick={() => setDebateType('roundtable')}
                                    className={`p-4 rounded-xl border-2 transition-all ${debateType === 'roundtable'
                                        ? 'border-accent bg-accent/10'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="flex justify-center mb-2">
                                        <UsersRound size={28} className={debateType === 'roundtable' ? 'text-accent' : 'text-text-tertiary'} />
                                    </div>
                                    <div className={`font-semibold ${debateType === 'roundtable' ? 'text-accent' : 'text-text-primary'}`}>
                                        라운드테이블
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-1">서로 다른 강점을 가진 AI 모델들이 함께 최상의 결론을 도출합니다.</p>
                                </motion.button>
                            </div>
                        </div>
                    </FadeInView>

                    {/* Next Button */}
                    <FadeInView delay={0.4}>
                        <motion.button
                            className="w-full flex items-center justify-center gap-2 py-4 px-5 bg-accent rounded-xl font-sans text-[0.9375rem] font-semibold text-white shadow-[0_4px_20px_rgba(63,238,174,0.3)]"
                            onClick={handleNext}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            토론자 고르기
                            <ArrowRight size={18} />
                        </motion.button>
                    </FadeInView>

                    {/* Footer - Help & Feedback */}
                    <FadeInView delay={0.5}>
                        <footer className="mt-8 pt-5 border-t border-gray-200">
                            <div className="flex justify-center gap-3 mb-4">
                                <motion.button
                                    onClick={() => {
                                        // 현재 입력값을 store에 저장하고 이동
                                        setSetup({ topic: topic.trim(), context: context.trim(), turnCount: autoTurnCount });
                                        router.push('/help');
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                                >
                                    <HelpCircle size={16} />
                                    소개글
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setSetup({ topic: topic.trim(), context: context.trim(), turnCount: autoTurnCount });
                                        router.push('/notice');
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                                >
                                    <Bell size={16} />
                                    알림판
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        // 현재 입력값을 store에 저장하고 이동
                                        setSetup({ topic: topic.trim(), context: context.trim(), turnCount: autoTurnCount });
                                        router.push('/feedback');
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                                >
                                    <MessageSquare size={16} />
                                    피드백
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setSetup({ topic: topic.trim(), context: context.trim(), turnCount: autoTurnCount });
                                        router.push('/settings');
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                                >
                                    <Settings size={16} />
                                    설정
                                </motion.button>
                            </div>


                            <p className="text-xs text-text-tertiary/80 text-center leading-relaxed mb-3">
                                이곳의 토론은 정답이 아닌, 다양한 가능성을 탐구하는 과정입니다.
                            </p>
                            <p className="text-[9px] text-text-tertiary/60 text-center leading-relaxed mb-2">
                                본 서비스는 베타 테스트 중인 AI 시뮬레이션입니다. 생성된 콘텐츠는 사실과 다르거나 편향될 수 있으며,
                                왈가왈부는 정보의 정확성이나 신뢰성을 보장하지 않습니다. 특히 법률, 의료, 금융 등 전문적인 조언으로
                                활용하여 발생한 결과에 대해 서비스 제공자는 어떠한 법적 책임도 지지 않습니다.
                            </p>
                            <p className="text-[11px] text-text-secondary font-medium text-center mb-2">
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

                            <p className="text-[0.625rem] text-text-tertiary text-center opacity-70">
                                © 2025 왈가왈부(WalGaWalBu) · v0.2.0
                            </p>
                        </footer>
                    </FadeInView>
                </div>
            </section>

            {/* 커스텀 알림 모달 */}
            {showTopicAlert && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowTopicAlert(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* X 버튼 */}
                        <button
                            onClick={() => setShowTopicAlert(false)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center">
                                <Edit3 size={28} className="text-accent" />
                            </div>
                            <h3 className="font-bold text-lg text-text-primary mb-3">
                                먼저 토론 주제를 입력해주세요.
                            </h3>
                            <p className="text-sm text-text-secondary whitespace-pre-line mb-6">
                                {alertMessage}
                            </p>
                            <motion.button
                                onClick={() => {
                                    handleRandomTopic();
                                    setShowTopicAlert(false);
                                }}
                                className="w-full py-3 bg-accent text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Shuffle size={18} />
                                랜덤 주제 추천받기
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </>
    );
}

export default function SetupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
            <SetupContent />
        </Suspense>
    );
}
