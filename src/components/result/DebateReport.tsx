'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Flame, Users, BarChart3, Hash, Swords, Handshake, ThumbsUp, ThumbsDown, Trophy } from 'lucide-react';
import { RIVALRY_COMMENTS, CHEMISTRY_COMMENTS } from '@/lib/characters';
import type { Topic, TeamAssignment, Stance } from '@/lib/types';

interface ParticipantStat {
    name: string;
    avatarImage: string;
    color: string;
    aiModel: string;
    totalChars: number;
    statementCount: number;
    percentage: number;
}

interface Relationship {
    participant1: { name: string; avatarImage: string; aiModel: string };
    participant2: { name: string; avatarImage: string; aiModel: string };
    count: number;
    topic?: string;
}

interface Keyword {
    word: string;
    count: number;
}

interface KeyQuote {
    quote: string;
    speaker: {
        name: string;
        avatarImage: string;
    };
}

interface DebateReportProps {
    participants: ParticipantStat[];
    rivalry: Relationship | null;
    chemistry: Relationship | null;
    keywords: Keyword[];
    // 팀 배정 정보 (신규)
    currentTopic?: Topic;
    teamAssignments?: TeamAssignment[];
    // 오늘의 발언 (핵심 인사이트에서 이동)
    keyQuotes?: KeyQuote[];
    // 투표 기능
    votedParticipant?: string | null;
    onVote?: (participantName: string) => void;
    // AI 평가 데이터
    aiEvaluation?: {
        participants: { name: string; totalScore: number; scores: { logic: number; persuasion: number; adherence: number; flow: number; impact: number } }[];
        mvp: string | null;
    };
    // AI 평가 로딩 상태
    isLoadingEvaluation?: boolean;
}

// 스탠스 라벨 변환 함수
function getStanceLabel(stance: Stance, topic?: Topic): string {
    if (!topic) return '';
    if (topic.type === 'PROS_CONS') {
        return stance === 'PRO' ? '찬성' : stance === 'CON' ? '반대' : '';
    } else if (topic.type === 'A_VS_B' && topic.choices) {
        return stance === 'A' ? topic.choices.a : stance === 'B' ? topic.choices.b : '';
    }
    return '';
}

// 스탠스 색상
function getStanceColor(stance: Stance, topic?: Topic): string {
    if (!topic || topic.type === 'OPEN_ENDED') return 'bg-gray-100 text-gray-600';
    if (topic.type === 'PROS_CONS') {
        return stance === 'PRO' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700';
    }
    return stance === 'A' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700';
}


export default function DebateReport({
    participants,
    rivalry,
    chemistry,
    keywords,
    currentTopic,
    teamAssignments,
    keyQuotes,
    votedParticipant,
    onVote,
    aiEvaluation,
    isLoadingEvaluation,
}: DebateReportProps) {
    // 종합점수 순으로 정렬 (AI 평가 있으면), 없으면 글자수 순
    const sortedByScore = [...participants].sort((a, b) => {
        const scoreA = aiEvaluation?.participants.find(p => p.name === a.name)?.totalScore ?? 0;
        const scoreB = aiEvaluation?.participants.find(p => p.name === b.name)?.totalScore ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.totalChars - a.totalChars; // 점수 같으면 글자수 순
    });

    // AI 평가 순위 계산
    const medals = ['🥇', '🥈', '🥉'];
    const getParticipantRank = (name: string): number => {
        if (!aiEvaluation?.participants) return -1;
        const sorted = [...aiEvaluation.participants].sort((a, b) => b.totalScore - a.totalScore);
        return sorted.findIndex(p => p.name === name);
    };
    const getParticipantScore = (name: string): number | null => {
        const p = aiEvaluation?.participants.find(p => p.name === name);
        return p?.totalScore ?? null;
    };

    const getRivalryComment = (count: number) => {
        for (const c of RIVALRY_COMMENTS) {
            if (count >= c.min) return c.text;
        }
        return '';
    };

    const getChemistryComment = (count: number) => {
        for (const c of CHEMISTRY_COMMENTS) {
            if (count >= c.min) return c.text;
        }
        return '';
    };

    // 5) 키워드 폰트 크기 - 최소 크기 더 작게 (8px~22px)
    const maxCount = Math.max(...keywords.map(k => k.count), 1);
    const minFontSize = 8;
    const maxFontSize = 22;
    const getKeywordFontSize = (count: number) => {
        const ratio = count / maxCount;
        return minFontSize + (maxFontSize - minFontSize) * ratio;
    };

    // 아바타 렌더링 헬퍼
    const renderAvatar = (avatarImage: string, size: number = 48) => {
        if (avatarImage) {
            return (
                <div className={`relative rounded-full overflow-hidden border-2 border-white shadow-md`} style={{ width: size, height: size }}>
                    <Image src={avatarImage} alt="" fill className="object-cover" sizes={`${size}px`} />
                </div>
            );
        }
        return <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👤</div>;
    };

    return (
        <div className="space-y-6">

            {/* 토론 주제 표시 */}
            {currentTopic && (
                <div className="text-center mb-6">
                    <p className="text-lg font-bold text-text-primary">
                        &ldquo;{currentTopic.title}&rdquo;
                    </p>
                </div>
            )}

            {/* 발언 통계 - 가로 막대그래프 + 투표 */}
            <section>
                <div className="flex items-center gap-5 mb-3">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <BarChart3 size={16} className="text-accent" />
                        토론 결과
                    </h3>
                    <p className="text-xs text-text-tertiary flex items-center gap-1.5">
                        <span className="text-red-400">♥</span>
                        가장 인상적이었던 토론자를 선택해주세요
                    </p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">

                    {/* 가로 막대그래프 */}
                    <div className="h-8 rounded-lg overflow-hidden flex">
                        {sortedByScore.map((p) => (
                            <motion.div
                                key={p.name}
                                className="h-full flex items-center justify-center text-white text-xs font-bold"
                                style={{
                                    backgroundColor: p.color,
                                    width: `${p.percentage}%`,
                                    minWidth: p.percentage > 0 ? '24px' : '0'
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${p.percentage}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                {p.percentage >= 8 && `${Math.round(p.percentage)}%`}
                            </motion.div>
                        ))}
                    </div>

                    {/* 투표 섹션 */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="space-y-2">
                            {sortedByScore.map((p) => {
                                const isVoted = votedParticipant === p.name;
                                const rank = getParticipantRank(p.name);
                                const score = getParticipantScore(p.name);

                                return (
                                    <motion.button
                                        key={p.name}
                                        onClick={() => onVote?.(p.name)}
                                        className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs transition-all ${isVoted
                                            ? 'bg-red-50 border-2 border-red-200'
                                            : 'bg-gray-50 border border-transparent hover:border-gray-200'
                                            }`}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {/* 메달 또는 순위 */}
                                        <span className={`w-5 shrink-0 ${rank >= 3 ? 'text-xs text-text-tertiary' : 'text-base'}`}>
                                            {rank >= 0 && rank < 3 ? medals[rank] : rank >= 0 ? `${rank + 1}` : '-'}
                                        </span>
                                        {/* 색상 인디케이터 */}
                                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
                                        {p.avatarImage ? (
                                            <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0">
                                                <Image src={p.avatarImage} alt="" fill className="object-cover" sizes="28px" />
                                            </div>
                                        ) : (
                                            <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">👤</span>
                                        )}
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="font-medium text-text-primary truncate flex items-center gap-1">
                                                {p.name}
                                                {aiEvaluation?.mvp === p.name && (
                                                    <Trophy size={12} className="text-amber-500" />
                                                )}
                                            </span>
                                            <span className="text-[9px] text-text-tertiary truncate">{p.aiModel}</span>
                                        </div>
                                        {/* 종합점수 + 칭호 */}
                                        {score !== null ? (
                                            <div className="flex flex-col items-end ml-auto mr-1">
                                                <span className="text-xs font-bold text-amber-600">{score}점</span>
                                            </div>
                                        ) : isLoadingEvaluation ? (
                                            <div className="flex flex-col items-end ml-auto mr-1">
                                                <span className="text-[10px] text-text-tertiary">점수 계산중</span>
                                            </div>
                                        ) : null}
                                        {/* 발언 통계 - 점수 없을 때도 오른쪽 정렬 */}
                                        <span className={`text-[10px] text-text-tertiary whitespace-nowrap ${score === null ? 'ml-auto' : ''}`}>
                                            {p.totalChars.toLocaleString()}글자 · {p.statementCount}회 · {Math.round(p.percentage)}%
                                        </span>
                                        <span className={`text-lg ${isVoted ? 'text-red-500' : 'text-gray-300'}`}>
                                            {isVoted ? '♥' : '♡'}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                        {votedParticipant && (
                            <motion.p
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-center text-red-500 mt-3 font-medium"
                            >
                                ♥ {votedParticipant}님을 선택했습니다!
                            </motion.p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
