'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, PauseCircle, MessageSquare, ChevronRight, Home } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { useApiKeyStore } from '@/store/apiKeyStore';
import { getCharacterById } from '@/lib/characters';
import FadeInView from '@/components/FadeInView';
import DebateReport from '@/components/result/DebateReport';
import UserAnalysis, { UserAnalysisPlaceholder } from '@/components/result/UserAnalysis';
import MVPCard from '@/components/result/MVPCard';
import { extractKeywordsAsync } from '@/utils/keywordExtractor';
import { useDebateAI } from '@/hooks/useDebateAI';
import { parseSummary } from '@/utils/summaryParser';

// Judge v4에 맞춘 새로운 타입 정의
interface EvaluationScores {
    logic: number;       // 논리 (30%)
    persuasion: number;  // 설득 (30%)
    adherence: number;   // 이행 (20%)
    flow: number;        // 흐름 (10%)
    impact: number;      // 임팩트 (10%)
}

interface ParticipantEvaluation {
    participantId?: string;
    name: string;
    avatarImage?: string;
    scores: EvaluationScores;
    totalScore: number;
    review?: string;
}

export default function StatsPage() {
    const router = useRouter();
    const { setup, state, addToHistory, updateHistorySummary } = useDebateStore();
    const { generateSummary } = useDebateAI({
        topic: setup.topic,
        participants: setup.participants,
        humanName: setup.humanName,
    });

    const [keywords, setKeywords] = useState<{ word: string; count: number }[]>([]);

    // AI 평가 상태
    const [aiEvaluation, setAiEvaluation] = useState<{
        participants: ParticipantEvaluation[];
        mvp: ParticipantEvaluation | null;
        isLoading: boolean;
    }>({
        participants: [],
        mvp: null,
        isLoading: true,
    });

    // 투표 상태 관리
    const voteKey = `debate-vote-${setup.topic.replace(/\s+/g, '-').substring(0, 50)}`;
    const [votedParticipant, setVotedParticipant] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(voteKey);
    });

    const handleVote = async (participantName: string) => {
        if (votedParticipant === participantName) {
            setVotedParticipant(null);
            localStorage.removeItem(voteKey);
        } else {
            setVotedParticipant(participantName);
            localStorage.setItem(voteKey, participantName);
        }
    };

    // Summary 사전 생성 (Report 페이지를 위해 캐싱)
    const prefetchSummary = async () => {
        const cacheKey = `debate-summary-${setup.topic.replace(/\s+/g, '-').substring(0, 50)}`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;

        // 캐시가 있으면 store에 업데이트하고 종료
        if (cached) {
            try {
                const parsedCache = JSON.parse(cached);
                if (parsedCache.conclusion) {
                    updateHistorySummary(setup.topic, parsedCache.conclusion);
                }
            } catch { /* 파싱 실패 시 무시 */ }
            return;
        }

        try {
            const summaryResult = await generateSummary(state.messages);
            if (summaryResult) {
                const { conclusion, openQuestions } = parseSummary(summaryResult);
                updateHistorySummary(setup.topic, conclusion);
                localStorage.setItem(cacheKey, JSON.stringify({
                    mainConflicts: [],
                    conclusion: conclusion,
                    keyQuotes: [],
                    openQuestions: openQuestions,
                }));
            }
        } catch (error) {
            console.error('Summary prefetch failed:', error);
        }
    };

    // BYOK: API 키 스토어
    const getApiKeys = useApiKeyStore((state) => state.getApiKeys);

    useEffect(() => {
        if (setup.participants.length === 0) {
            router.push('/');
            return;
        }
        addToHistory({
            topic: setup.topic,
            participants: setup.participants.map(p => p.name),
            messageCount: state.messages.length,
            summary: '',
            wasStopped: state.wasStopped,
            humanName: setup.humanParticipation ? (setup.humanName || '나') : undefined,
        });

        // 병렬로 API 호출 (analytics는 MVP 평가 완료 후 호출)
        fetchAIEvaluation();
        prefetchSummary();
    }, []);

    // 키워드 추출
    useEffect(() => {
        const fetchKeywords = async () => {
            const allText = state.messages
                .filter(m => !m.isModerator)
                .map(m => m.content)
                .join(' ');
            const result = await extractKeywordsAsync(allText, setup.humanName || '', setup.topic, 8);
            setKeywords(result);
        };
        if (state.messages.length > 0) {
            fetchKeywords();
        }
    }, [state.messages, setup.humanName, setup.topic]);

    // AI 평가 가져오기 (Judge 결과 우선, fallback: 기존 evaluate API)
    const fetchAIEvaluation = async () => {
        // 1. Judge 결과 캐시 확인 (v4)
        const judgeCacheKey = `debate-judge-${setup.topic.replace(/\s+/g, '-').substring(0, 50)}`;
        if (typeof window !== 'undefined') {
            const judgeCache = localStorage.getItem(judgeCacheKey);
            if (judgeCache) {
                try {
                    const judgeData = JSON.parse(judgeCache);
                    console.log('[Stats] Loading Judge results from cache:', judgeData);

                    // JudgeResult[] -> ParticipantEvaluation[] 변환
                    const participants = judgeData.results.map((r: {
                        modelId: string;
                        finalScore: number;
                        rawScores: { logic: number; persuasion: number; adherence: number; flow: number; impact: number };
                        oneLineReview: string;
                    }) => {
                        const participant = setup.participants.find(p => p.name === r.modelId);
                        const char = participant ? getCharacterById(participant.id) : null;
                        return {
                            name: r.modelId,
                            avatarImage: char?.avatarImage || '/avatars/avatar_chloe.jpeg',
                            totalScore: Math.round(r.finalScore * 10), // 100점 만점으로 변환
                            scores: {
                                logic: r.rawScores.logic,
                                persuasion: r.rawScores.persuasion,
                                adherence: r.rawScores.adherence,
                                flow: r.rawScores.flow,
                                impact: r.rawScores.impact,
                            },
                            review: r.oneLineReview,
                            aiModel: char?.aiModel,
                        };
                    });

                    const sortedParticipants = [...participants].sort((a, b) => b.totalScore - a.totalScore);
                    const mvp = sortedParticipants[0] || null;

                    setAiEvaluation({
                        participants: sortedParticipants,
                        mvp,
                        isLoading: false,
                    });

                    console.log('[Stats] Judge evaluation loaded successfully');
                    return;
                } catch (e) {
                    console.error('[Stats] Failed to parse Judge cache:', e);
                    // Judge 파싱 실패 시 기존 evaluate API로 fallback
                }
            }
        }

        // 2. 기존 캐시 확인 (fallback)
        const cacheKey = `debate-ai-evaluation-${setup.topic.replace(/\s+/g, '-').substring(0, 50)}`;

        try {
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: setup.topic,
                    messages: state.messages.filter(m => !m.isModerator).map(m => ({
                        author: m.author,
                        content: m.content,
                    })),
                    participantNames: setup.participants.map(p => p.name),
                    apiKeys: getApiKeys(), // BYOK
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // avatarImage 매핑: setup.participants에서 캐릭터 정보 가져오기
                // 기존 /api/evaluate 결과를 새 필드명으로 변환
                const enrichedParticipants = data.participants.map((p: {
                    name: string;
                    scores: { argument?: number; persuasion?: number; creativity?: number; rebuttal?: number; passion?: number };
                    totalScore: number;
                    review?: string;
                }) => {
                    const participant = setup.participants.find(sp => sp.name === p.name);
                    const char = participant ? getCharacterById(participant.id) : null;
                    return {
                        ...p,
                        avatarImage: char?.avatarImage || '/avatars/avatar_chloe.jpeg',
                        // 기존 필드 -> 새 필드 변환
                        scores: {
                            logic: p.scores.argument || 5,        // argument -> logic
                            persuasion: p.scores.persuasion || 5,
                            adherence: p.scores.creativity || 5,  // creativity -> adherence (근사값)
                            flow: p.scores.rebuttal || 5,         // rebuttal -> flow (근사값)
                            impact: p.scores.passion || 5,        // passion -> impact (근사값)
                        },
                        review: p.review,
                        aiModel: char?.aiModel,
                    };
                });
                const sortedParticipants = [...enrichedParticipants].sort((a: { totalScore: number }, b: { totalScore: number }) => b.totalScore - a.totalScore);

                const evaluationData = {
                    participants: sortedParticipants,
                    mvp: sortedParticipants[0] || null,
                };

                setAiEvaluation({
                    ...evaluationData,
                    isLoading: false,
                });

                // localStorage에 캐싱
                localStorage.setItem(cacheKey, JSON.stringify(evaluationData));
                console.log('[Stats] AI Evaluation saved to cache');

                // openQuestions를 localStorage에 저장 (report 페이지에서 사용)
                if (data.summary?.openQuestions?.length > 0) {
                    const evalCacheKey = `debate-evaluate-${setup.topic.replace(/\s+/g, '-').substring(0, 50)}`;
                    localStorage.setItem(evalCacheKey, JSON.stringify({
                        openQuestions: data.summary.openQuestions,
                        mainConflict: data.summary.mainConflict,
                    }));
                }

            } else {
                setAiEvaluation(prev => ({ ...prev, isLoading: false }));
            }
        } catch {
            setAiEvaluation(prev => ({ ...prev, isLoading: false }));
        }
    };

    const getParticipantStats = () => {
        const totalCharsAll = state.messages
            .filter(m => !m.isModerator)
            .reduce((sum, m) => sum + m.charCount, 0) || 1;

        const stats = setup.participants.map((p, index) => {
            const char = getCharacterById(p.id);
            const msgs = state.messages.filter(m => m.author === p.name);
            const totalChars = msgs.reduce((s, m) => s + m.charCount, 0);
            const PARTICIPANT_COLORS = ['#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
            const color = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];

            return {
                name: p.name,
                avatarImage: char?.avatarImage || '/avatars/avatar_chloe.jpeg',
                color,
                aiModel: char?.aiModel || 'AI',
                totalChars,
                statementCount: msgs.length,
                percentage: (totalChars / totalCharsAll) * 100,
            };
        });

        if (setup.humanParticipation) {
            const humanMsgs = state.messages.filter(m => m.colorClass === 'human');
            const humanTotalChars = humanMsgs.reduce((s, m) => s + m.charCount, 0);
            stats.push({
                name: setup.humanName || '나',
                avatarImage: '/avatars/avatar_human.png',
                color: '#3FEEAE',
                aiModel: 'Human',
                totalChars: humanTotalChars,
                statementCount: humanMsgs.length,
                percentage: totalCharsAll > 0 ? (humanTotalChars / totalCharsAll) * 100 : 0,
            });
        }

        return stats;
    };

    const analyzeRelationships = () => {
        const participantStats = getParticipantStats();
        if (participantStats.length < 2) return { rivalry: null, chemistry: null };

        const sorted = [...participantStats].sort((a, b) => b.totalChars - a.totalChars);
        const top2 = sorted.slice(0, 2);

        const rivalry = {
            participant1: { name: top2[0].name, avatarImage: top2[0].avatarImage, aiModel: top2[0].aiModel },
            participant2: { name: top2[1].name, avatarImage: top2[1].avatarImage, aiModel: top2[1].aiModel },
            count: 5,
            topic: setup.topic,
        };

        return { rivalry, chemistry: null };
    };

    const getUserAnalysis = () => {
        if (!setup.humanParticipation || !setup.humanName) return null;

        const humanMsgs = state.messages.filter(m => m.author === setup.humanName);
        const totalStatements = humanMsgs.length;
        const totalChars = humanMsgs.reduce((sum, m) => sum + m.charCount, 0);

        const aiStats = setup.participants.map(p => {
            const char = getCharacterById(p.id);
            return {
                name: p.name,
                avatarImage: char?.avatarImage || '/avatars/avatar_chloe.jpeg',
                count: state.messages.filter(m => m.author === p.name).length,
            };
        });
        const mostInteracted = aiStats.sort((a, b) => b.count - a.count)[0];

        let aiFeedback = '';
        const avgCharsPerStatement = totalStatements > 0 ? totalChars / totalStatements : 0;

        if (totalStatements === 0) {
            aiFeedback = '다음에는 더 적극적으로 참여해보세요!';
        } else if (totalStatements <= 2 && totalChars < 100) {
            aiFeedback = '짧지만 핵심을 전달했어요! 다음엔 조금 더 자세한 의견도 좋아요.';
        } else if (totalStatements <= 2 && totalChars >= 100) {
            aiFeedback = '몇 마디 안 했지만 한마디 한마디가 묵직했어요!';
        } else if (totalStatements <= 5 && totalChars < 300) {
            aiFeedback = '꾸준히 참여하셨네요! 조금 더 깊이 있는 의견도 기대할게요.';
        } else if (totalStatements <= 5 && totalChars >= 300) {
            aiFeedback = '적극적으로 토론에 참여해주셨네요! 균형 잡힌 의견이 인상적이었어요.';
        } else {
            aiFeedback = '토론의 핵심 참가자셨네요! AI들도 당신의 의견에 자극받았을 거예요.';
        }

        if (avgCharsPerStatement > 200) {
            aiFeedback += ' 심층적인 의견을 주셨어요!';
        }

        return {
            userName: setup.humanName,
            totalStatements,
            totalChars,
            keywords: ['참여', '의견', '동의'],
            mostInteractedWith: mostInteracted,
            aiFeedback,
        };
    };

    const participantStats = getParticipantStats();
    const { rivalry, chemistry } = analyzeRelationships();
    const userAnalysis = getUserAnalysis();

    return (
        <section className="min-h-screen overflow-y-auto p-4 pt-3 pb-20">
            <div className="max-w-[420px] mx-auto pb-6">
                {/* Header */}
                <FadeInView delay={0.1} className="text-center mb-6">
                    <motion.div
                        className={`w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center ${state.wasStopped ? 'bg-danger' : 'bg-accent'}`}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                        {state.wasStopped ? <PauseCircle size={32} className="text-white" /> : <Trophy size={32} className="text-white" />}
                    </motion.div>
                    <h1 className="font-title text-2xl text-text-primary mb-1">
                        {state.wasStopped ? '토론이 중단되었습니다' : '토론 통계'}
                    </h1>
                    <p className="text-sm text-text-secondary">
                        {state.wasStopped ? '중간까지의 토론 내용을 바탕으로 통계입니다.' : '참가자별 발언 통계와 평가 결과입니다.'}
                    </p>
                </FadeInView>

                {/* 토론 리포트 */}
                <FadeInView delay={0.2} className="mb-6">
                    <DebateReport
                        participants={participantStats}
                        rivalry={rivalry}
                        chemistry={chemistry}
                        keywords={keywords}
                        currentTopic={state.currentTopic}
                        teamAssignments={state.teamAssignments}
                        keyQuotes={[]}
                        votedParticipant={votedParticipant}
                        onVote={handleVote}
                        aiEvaluation={{
                            participants: aiEvaluation.participants.map(p => ({
                                name: p.name,
                                totalScore: p.totalScore,
                                scores: p.scores,
                            })),
                            mvp: aiEvaluation.mvp?.name || null,
                        }}
                        isLoadingEvaluation={aiEvaluation.isLoading}
                    />
                </FadeInView>

                {/* 유저 분석 */}
                <FadeInView delay={0.3} className="mb-6">
                    {userAnalysis ? (
                        <UserAnalysis {...userAnalysis} />
                    ) : (
                        <UserAnalysisPlaceholder />
                    )}
                </FadeInView>

                {/* MVP 카드 */}
                <FadeInView delay={0.35} className="mb-6">
                    {aiEvaluation.isLoading ? (
                        <section>
                            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                                <span className="text-accent">🏆</span>
                                이번 토론의 MVP
                            </h3>
                            <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-100 shadow-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="text-sm text-amber-700">이번 토론의 MVP를 선정하고 있어요...</div>
                                    <div className="flex gap-1.5">
                                        <motion.div className="w-2 h-2 bg-amber-400 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                                        <motion.div className="w-2 h-2 bg-amber-400 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                                        <motion.div className="w-2 h-2 bg-amber-400 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : aiEvaluation.mvp ? (
                        <MVPCard
                            mvp={aiEvaluation.mvp}
                            participants={aiEvaluation.participants}
                            isLoading={false}
                        />
                    ) : null}
                </FadeInView>

                {/* 키워드 */}
                <FadeInView delay={0.4} className="mb-6">
                    <section>
                        <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <MessageSquare size={16} className="text-accent" />
                            자주 등장한 키워드
                        </h3>
                        {keywords.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-wrap items-center justify-center gap-2 bg-gray-50 rounded-2xl p-4"
                            >
                                {(() => {
                                    const maxCount = Math.max(...keywords.slice(0, 8).map(k => k.count));
                                    const minCount = Math.min(...keywords.slice(0, 8).map(k => k.count));
                                    const range = maxCount - minCount || 1;

                                    return keywords.slice(0, 8).map(k => {
                                        const normalized = (k.count - minCount) / range;
                                        const fontSize = normalized > 0.7 ? 'text-lg font-semibold'
                                            : normalized > 0.4 ? 'text-base'
                                                : 'text-sm';

                                        return (
                                            <span
                                                key={k.word}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-accent ${fontSize}`}
                                            >
                                                #{k.word}
                                            </span>
                                        );
                                    });
                                })()}
                            </motion.div>
                        ) : (
                            <div className="flex flex-wrap items-center justify-center gap-2 bg-gray-50 rounded-2xl p-4">
                                <div className="flex items-center gap-2 text-sm text-text-tertiary">
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                                    키워드 분석 중...
                                </div>
                            </div>
                        )}
                    </section>
                </FadeInView>

                {/* 리포트 보기 버튼 */}
                <motion.button
                    onClick={() => router.push('/report')}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-accent rounded-xl text-white font-semibold shadow-lg mb-4"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                    사회자 종합 정리 보기
                    <ChevronRight size={18} />
                </motion.button>
            </div>
        </section>
    );
}
