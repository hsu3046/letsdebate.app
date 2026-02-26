'use client';

import { motion } from 'framer-motion';
import { Circle, AlertTriangle, Battery } from 'lucide-react';

interface GaugeBarProps {
    current: number;
    max: number;
    characterType?: string;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    animate?: boolean;
}

// 게이지 상태 판단
function getGaugeStatus(percentage: number): 'full' | 'normal' | 'low' | 'depleted' {
    if (percentage >= 70) return 'full';
    if (percentage >= 40) return 'normal';
    if (percentage >= 20) return 'low';
    return 'depleted';
}

// 상태별 색상
const STATUS_COLORS = {
    full: {
        bg: '#22c55e', // green-500
        text: 'text-green-600',
        glow: 'rgba(34, 197, 94, 0.3)',
    },
    normal: {
        bg: '#eab308', // yellow-500
        text: 'text-yellow-600',
        glow: 'rgba(234, 179, 8, 0.3)',
    },
    low: {
        bg: '#f97316', // orange-500
        text: 'text-orange-600',
        glow: 'rgba(249, 115, 22, 0.3)',
    },
    depleted: {
        bg: '#ef4444', // red-500
        text: 'text-red-600',
        glow: 'rgba(239, 68, 68, 0.3)',
    },
};

// 상태별 아이콘 컴포넌트
const StatusIcon = ({ status }: { status: 'full' | 'normal' | 'low' | 'depleted' }) => {
    const colorClass = {
        full: 'text-green-500 fill-green-500',
        normal: 'text-yellow-500 fill-yellow-500',
        low: 'text-orange-500 fill-orange-500',
        depleted: 'text-red-500 fill-red-500',
    };
    return <Circle size={10} className={colorClass[status]} />;
};

// 상태별 경고 아이콘
const WarningIcon = ({ status }: { status: 'full' | 'normal' | 'low' | 'depleted' }) => {
    if (status === 'low') return <AlertTriangle size={12} className="text-orange-500" />;
    if (status === 'depleted') return <Battery size={12} className="text-red-500" />;
    return null;
};

export default function GaugeBar({
    current,
    max,
    characterType,
    showLabel = false,
    size = 'md',
    animate = true,
}: GaugeBarProps) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const status = getGaugeStatus(percentage);
    const colors = STATUS_COLORS[status];

    // 사이즈별 높이
    const heights = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    };

    return (
        <div className="w-full">
            {/* Label (optional) */}
            {showLabel && (
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                        <StatusIcon status={status} />
                        <WarningIcon status={status} />
                        {characterType && (
                            <span className="text-xs text-text-tertiary">{characterType}</span>
                        )}
                    </div>
                    <span className={`text-xs font-medium ${colors.text}`}>
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}

            {/* Gauge Bar */}
            <div className={`relative w-full ${heights[size]} bg-gray-200 rounded-full overflow-hidden`}>
                {animate ? (
                    <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{
                            backgroundColor: colors.bg,
                            boxShadow: `0 0 8px ${colors.glow}`,
                        }}
                    />
                ) : (
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${percentage}%`,
                            backgroundColor: colors.bg,
                            boxShadow: `0 0 8px ${colors.glow}`,
                        }}
                    />
                )}

                {/* Low energy warning pulse */}
                {status === 'low' && (
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ backgroundColor: colors.bg }}
                    />
                )}

                {/* Depleted pulsing */}
                {status === 'depleted' && (
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        style={{ backgroundColor: colors.bg }}
                    />
                )}
            </div>
        </div>
    );
}

// 미니 게이지 바 (참가자 리스트용)
export function MiniGaugeBar({ current, max }: { current: number; max: number }) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const status = getGaugeStatus(percentage);
    const colors = STATUS_COLORS[status];

    return (
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ backgroundColor: colors.bg }}
            />
        </div>
    );
}

// 게이지 상태 익스포트
export { getGaugeStatus, STATUS_COLORS, StatusIcon, WarningIcon };
