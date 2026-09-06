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
import FlowSteps from '@/components/FlowSteps';
import { useHydrated } from '@/hooks/useHydrated';

function SetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setup, setSetup, state } = useDebateStore();

    // ?new=true 일 때만 초기화 (메인 → 새 토론 시작하기 클릭 시)
    const isNewDebate = searchParams.get('new') === 'true';

    const [topic, setTopic] = useState(isNewDebate ? '' : (setup.topic || ''));
    const [context, setContext] = useState(isNewDebate ? '' : (setup.context || ''));
    // turnCount state 삭제: debateType에 따라 자동 결정됨
    const [debateType, setDebateType] = useState<'vs' | 'roundtable'>(isNewDebate ? 'vs' : (setup.debateType || 'vs')); // 토론 종류
    const [showTopicAlert, setShowTopicAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // URL에서 new 파라미터 제거 (뒤로가기 시 다시 리셋되지 않도록)
    // 새 토론 시작 시 참가자 선택 상태와 주제도 초기화
    useEffect(() => {
        if (isNewDebate) {
            setSetup({
                topic: '',
                debateType: 'vs',
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
        setSetup({ topic: randomTopic.title });
    };

    // 🎯 토론 길이 자동 설정 (VS=8, Roundtable=15)
    // 렌더링 시점에도 계산하여 Footer 버튼 등에서 사용
    const autoTurnCount = debateType === 'vs' ? 8 : 15;

    const handleNext = () => {
        // 1. Zod 검증 - 주제
        const topicValidation = validateTopic(topic.trim());
        if (!topicValidation.success) {
            setAlertMessage(topicValidation.error || '주제를 입력해 주세요');
            setShowTopicAlert(true);
            return;
        }

        // 2. Zod 검증 - 배경 설명
        const contextValidation = validateContext(context);
        if (!contextValidation.success) {
            setAlertMessage(contextValidation.error || '배경 설명을 조금 줄여 주세요');
            setShowTopicAlert(true);
            return;
        }

        // 3. 키워드 필터 - 주제
        const topicCheck = isContentAllowed(topicValidation.data!);
        if (!topicCheck.allowed) {
            setAlertMessage(topicCheck.reason || '이 주제로는 토론을 진행할 수 없어요');
            setShowTopicAlert(true);
            return;
        }

        // 4. 키워드 필터 - 배경 설명
        if (contextValidation.data) {
            const contextCheck = isContentAllowed(contextValidation.data);
            if (!contextCheck.allowed) {
                setAlertMessage(contextCheck.reason || '이 배경 설명으로는 토론을 진행할 수 없어요');
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
            <section className="legacy-page">
                <div className="max-w-[760px] mx-auto pb-6">
                    <FlowSteps current={1} />
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
                                    placeholder="토론하고 싶은 주제를 적어 주세요"
                                    value={topic}
                                    onChange={(e) => { setTopic(e.target.value); setSetup({ topic: e.target.value }); }}
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
                                    onClick={() => { setDebateType('vs'); setSetup({ debateType: 'vs' }); }}
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
                                        1대1 토론
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-1">같은 주제에 대한 두 AI의 관점을 비교해 보세요</p>
                                </motion.button>
                                <motion.button
                                    onClick={() => { setDebateType('roundtable'); setSetup({ debateType: 'roundtable' }); }}
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
                                    <p className="text-xs text-text-tertiary mt-1">여러 AI가 각자의 관점으로 주제를 함께 논의해요</p>
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
                                먼저 토론 주제를 입력해 주세요
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
    const hydrated = useHydrated();
    // Initialize the editable draft only after the persisted browser setup is available.
    if (!hydrated) return <section className="legacy-page" role="status">설정을 불러오는 중…</section>;
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">불러오는 중…</div>}>
            <SetupContent />
        </Suspense>
    );
}
