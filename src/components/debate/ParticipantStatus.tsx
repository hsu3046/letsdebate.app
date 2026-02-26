'use client';

import { motion } from 'framer-motion';
import GaugeBar, { MiniGaugeBar } from './GaugeBar';

interface ParticipantStatusProps {
    name: string;
    avatar: string;
    color: string;
    currentGauge: number;
    maxGauge: number;
    isActive?: boolean;
    isSpeaking?: boolean;
    compact?: boolean;
}

export default function ParticipantStatus({
    name,
    avatar,
    color,
    currentGauge,
    maxGauge,
    isActive = false,
    isSpeaking = false,
    compact = false,
}: ParticipantStatusProps) {
    const percentage = Math.round((currentGauge / maxGauge) * 100);

    if (compact) {
        // 컴팩트 모드 (상단 바)
        return (
            <motion.div
                className={`flex flex-col items-center p-2 rounded-xl min-w-[60px] ${isActive ? 'bg-white shadow-md' : 'bg-gray-50'}`}
                animate={{
                    scale: isSpeaking ? 1.05 : 1,
                    boxShadow: isSpeaking ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
                }}
                transition={{ duration: 0.2 }}
            >
                {/* Avatar */}
                <div className="relative mb-1">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${color}20`, border: isActive ? `2px solid ${color}` : 'none' }}
                    >
                        {avatar}
                    </div>
                    {/* Speaking indicator */}
                    {isSpeaking && (
                        <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        />
                    )}
                </div>

                {/* Name (truncated) */}
                <p className="text-[10px] text-text-secondary font-medium truncate max-w-[56px] text-center mb-1">
                    {name.split(' ')[0]}
                </p>

                {/* Mini gauge */}
                <div className="w-full">
                    <MiniGaugeBar current={currentGauge} max={maxGauge} />
                </div>
            </motion.div>
        );
    }

    // 풀 모드 (사이드바/패널)
    return (
        <motion.div
            className={`flex items-center gap-3 p-3 rounded-xl ${isActive ? 'bg-white shadow-md' : 'bg-gray-50'}`}
            animate={{
                scale: isSpeaking ? 1.02 : 1,
            }}
            transition={{ duration: 0.2 }}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${color}20`, border: isActive ? `2px solid ${color}` : 'none' }}
                >
                    {avatar}
                </div>
                {/* Speaking indicator */}
                {isSpeaking && (
                    <motion.div
                        className="absolute -top-1 -left-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                    >
                        <div className="w-2 h-2 bg-white rounded-full" />
                    </motion.div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-text-primary truncate">
                        {name}
                    </p>
                    <span className="text-xs text-text-tertiary">
                        {percentage}%
                    </span>
                </div>
                <GaugeBar current={currentGauge} max={maxGauge} size="sm" animate={false} />
            </div>
        </motion.div>
    );
}

// 참가자 상태 리스트 (상단 바 형태)
export function ParticipantStatusBar({
    participants,
    activeIndex,
    speakingIndex,
}: {
    participants: {
        name: string;
        avatar: string;
        color: string;
        currentGauge: number;
        maxGauge: number;
    }[];
    activeIndex?: number;
    speakingIndex?: number;
}) {
    return (
        <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-hide">
            {participants.map((p, i) => (
                <ParticipantStatus
                    key={i}
                    {...p}
                    isActive={i === activeIndex}
                    isSpeaking={i === speakingIndex}
                    compact
                />
            ))}
        </div>
    );
}
