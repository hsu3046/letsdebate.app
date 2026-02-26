'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3 } from 'lucide-react';

// 참가자 통계 인터페이스
interface ParticipantStat {
    name: string;
    avatarImage: string;
    color: string;
    aiModel: string;
    totalChars: number;
    speechCount: number;
    percentage: number;
    currentGauge: number;
    maxGauge: number;
    isHuman?: boolean;
    recentInteractions?: {
        type: 'SUPPORT' | 'OPPOSE' | 'NEUTRAL';
        target: string | null;
        targetName: string | null;
        confidence?: number;
        analyzedAt?: number;
        source?: 'frontend' | 'ai';
    }[];
}

interface StatsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    participants: ParticipantStat[];
    totalTurns: number;
    currentTurn: number;
    currentPhase: string;
}

// 참가자별 막대 색상
const PARTICIPANT_COLORS = [
    '#8b5cf6', // purple
    '#ef4444', // red
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
];

// 상호작용 아이콘
const INTERACTION_ICONS: Record<string, string> = {
    SUPPORT: '❤️',
    OPPOSE: '🔥',
};

export default function StatsPanel({
    isOpen,
    onClose,
    participants,
    totalTurns,
    currentTurn,
    currentPhase,
}: StatsPanelProps) {
    const progressPercent = totalTurns > 0 ? Math.min(100, Math.round((currentTurn / totalTurns) * 100)) : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={onClose}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85vh] overflow-hidden"
                    >
                        {/* Handle */}
                        <div className="sticky top-0 bg-white pt-3 pb-2 px-4 border-b border-gray-100">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3" />
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <BarChart3 size={20} className="text-accent" />
                                    토론 진행상태
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-primary"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-xs text-text-tertiary mt-1">
                                진행률 {progressPercent}%
                            </p>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-4 py-4 space-y-4">

                            {/* 발언 비율 수평 스택 막대 */}
                            <div className="h-8 rounded-full overflow-hidden flex bg-gray-100">
                                {participants.map((p, i) => (
                                    <motion.div
                                        key={p.name}
                                        className="h-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{
                                            backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
                                        }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${p.percentage}%` }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                    >
                                        {p.percentage >= 8 && `${Math.round(p.percentage)}%`}
                                    </motion.div>
                                ))}
                            </div>

                            {/* 참가자별 상세 정보 - 2줄 레이아웃 */}
                            <section className="space-y-4">
                                {participants.map((p, i) => (
                                    <div key={p.name} className="space-y-2">
                                        {/* 첫 번째 줄: 색상점 + 아바타 + 이름/모델 + 상호작용 + 통계 */}
                                        <div className="flex items-center gap-2">
                                            {/* 색상 점 */}
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length] }}
                                            />

                                            {/* 아바타 */}
                                            {p.avatarImage ? (
                                                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
                                                    <Image src={p.avatarImage} alt="" fill className="object-cover" sizes="36px" />
                                                </div>
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold shrink-0">
                                                    {p.name.charAt(0)}
                                                </div>
                                            )}

                                            {/* 이름 + AI모델 */}
                                            <div className="shrink-0 min-w-[50px]">
                                                <p className="text-sm font-bold text-text-primary leading-tight">{p.name}</p>
                                                <p className="text-[10px] text-text-tertiary">{p.aiModel}</p>
                                            </div>

                                            {/* [비활성화] 상호작용 표시 - Interaction 기능 비활성화로 숨김
                                                {p.recentInteractions && p.recentInteractions.length > 0 && (() => {
                                                    const lastInteraction = p.recentInteractions.slice(-1)[0];
                                                    // NEUTRAL이거나 대상이 없으면 표시 안 함
                                                    if (lastInteraction.type === 'NEUTRAL' || !lastInteraction.targetName) return null;
                                                    return (
                                                        <div className="flex-1 min-w-0">
                                                            <span
                                                                className={`text-xs font-medium truncate ${lastInteraction.type === 'SUPPORT'
                                                                    ? 'text-blue-600'
                                                                    : 'text-orange-600'
                                                                    }`}
                                                            >
                                                                {INTERACTION_ICONS[lastInteraction.type]}{lastInteraction.targetName}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                                */}

                                            {/* 통계: 비율 / 글자수 / 발언수 */}
                                            <div className="shrink-0 text-xs text-text-secondary text-right ml-auto">
                                                {Math.round(p.percentage)}% ({p.totalChars.toLocaleString()}자) · {p.speechCount}회
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </section>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// 통계 패널 열기 버튼
export function StatsPanelButton({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-md text-sm font-medium text-text-primary"


        >
            <BarChart3 size={16} className="text-accent" />
            통계
        </motion.button>
    );
}
