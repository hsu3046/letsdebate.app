'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Trophy, Scale, MessageCircle, Lightbulb, Swords, Flame } from 'lucide-react';

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
    aiModel?: string;
}

interface MVPCardProps {
    mvp: ParticipantEvaluation;
    participants: ParticipantEvaluation[];
    isLoading?: boolean;
}

// 5각형 레이더 차트 컴포넌트
function RadarChart({ scores }: { scores: EvaluationScores }) {
    const labels = ['논리도', '흡입력', '수행력', '전략성', '몰입도'];
    const values = [scores.logic, scores.persuasion, scores.adherence, scores.flow, scores.impact];
    const maxValue = 10;
    const centerX = 120;
    const centerY = 110;
    const radius = 70;

    // 5각형 꼭짓점 좌표 계산 (위쪽부터 시계방향)
    const getPoint = (index: number, value: number) => {
        const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
        const r = (value / maxValue) * radius;
        return {
            x: centerX + r * Math.cos(angle),
            y: centerY + r * Math.sin(angle),
        };
    };

    const getFullPoint = (index: number) => getPoint(index, maxValue);

    // 배경 5각형 (가이드라인)
    const backgroundPolygon = Array.from({ length: 5 }, (_, i) => {
        const p = getFullPoint(i);
        return `${p.x},${p.y}`;
    }).join(' ');

    // 데이터 5각형
    const dataPolygon = values.map((v, i) => {
        const p = getPoint(i, v);
        return `${p.x},${p.y}`;
    }).join(' ');

    // 라벨 위치 (차트에 가깝게)
    const labelPoints = Array.from({ length: 5 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const r = radius + 18;
        return {
            x: centerX + r * Math.cos(angle),
            y: centerY + r * Math.sin(angle),
        };
    });

    return (
        <svg viewBox="0 0 240 220" className="w-full max-w-[280px] mx-auto">
            {/* 가이드라인 5각형들 */}
            {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
                <polygon
                    key={i}
                    points={Array.from({ length: 5 }, (_, j) => {
                        const p = getPoint(j, maxValue * scale);
                        return `${p.x},${p.y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                />
            ))}

            {/* 축선 */}
            {Array.from({ length: 5 }, (_, i) => {
                const p = getFullPoint(i);
                return (
                    <line
                        key={i}
                        x1={centerX}
                        y1={centerY}
                        x2={p.x}
                        y2={p.y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                    />
                );
            })}

            {/* 데이터 영역 - Design System Gold */}
            <motion.polygon
                points={dataPolygon}
                fill="rgba(245, 176, 22, 0.15)"
                stroke="#F5B016"
                strokeWidth="1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* 라벨 */}
            {labelPoints.map((p, i) => (
                <text
                    key={i}
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[11px] fill-text-secondary font-medium"
                >
                    {labels[i]}
                </text>
            ))}
        </svg>
    );
}



// 점수 막대 컴포넌트
function ScoreBar({ label, icon: Icon, score, color }: {
    label: string;
    icon: typeof Scale;
    score: number;
    color: string;
}) {
    const percentage = (score / 10) * 100;

    return (
        <div className="flex items-center gap-2">
            <Icon size={14} className={color} />
            <span className="text-xs text-text-secondary w-10">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <span className="text-xs font-semibold text-text-primary w-6 text-right">{score}</span>
        </div>
    );
}

export default function MVPCard({ mvp, participants, isLoading }: MVPCardProps) {

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 shadow-lg">
                <div className="flex items-center justify-center gap-3 py-8">
                    <motion.div
                        className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="text-sm text-amber-700">AI가 토론을 평가하고 있습니다...</span>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm mx-auto relative rounded-3xl p-5 border shadow-[0_8px_32px_rgba(245,176,22,0.08)] flex flex-col gap-4"
            style={{
                background: 'rgba(250, 214, 31, 0.08)',
                borderColor: 'rgba(245, 176, 22, 0.3)',
            }}
        >
            {/* Header - 트로피 아이콘 + 타이틀 */}
            <div className="flex items-center justify-center gap-2">
                <Trophy size={20} style={{ color: '#F5B016' }} />
                <h2 className="font-title text-lg" style={{ color: '#F5B016' }}>이번 토론의 MVP</h2>
            </div>

            {/* Main Content - 가로 배치: 왼쪽 프로필, 오른쪽 레이더차트 */}
            <div className="flex items-center gap-3">
                {/* 왼쪽: 프로필 이미지 + 이름 + 칭호 */}
                <div className="flex flex-col items-center min-w-[100px] ml-4">
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-lg mb-2">
                        {mvp.avatarImage ? (
                            <Image src={mvp.avatarImage} alt={mvp.name} fill className="object-cover" sizes="80px" />
                        ) : (
                            <div className="w-full h-full bg-amber-200 flex items-center justify-center text-3xl font-bold text-amber-700">
                                {mvp.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    {/* 캐릭터 이름 크기 살짝 키움 */}
                    <h3 className="text-xl font-bold text-text-primary leading-tight">{mvp.name}</h3>
                    {mvp.aiModel && (
                        <span className="text-xs text-gray-400 font-medium tracking-wide w-full text-center truncate mt-0.5">
                            {mvp.aiModel}
                        </span>
                    )}
                </div>

                {/* 오른쪽: 레이더 차트 (점수 중앙 표시) */}
                <div className="flex-1 relative">
                    <RadarChart scores={mvp.scores} />
                    {/* 점수 - 차트 중앙 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-lg font-medium" style={{ color: '#F5B016' }}>{mvp.totalScore}</span>
                    </div>
                </div>
            </div>

            {/* 심사평 (Judge's Review) - 카드 내부 하단 */}
            {mvp.review && (
                <div className="mt-1 bg-white/60 rounded-xl p-3 border border-amber-100/50">
                    <h4 className="text-[11px] font-bold text-amber-600/80 mb-0.5 uppercase tracking-wider">선정 이유</h4>
                    <p className="text-sm text-text-secondary leading-relaxed font-medium">
                        &ldquo;{mvp.review}&rdquo;
                    </p>
                </div>
            )}
        </motion.div>
    );
}

// 순위표 컴포넌트
export function RankingList({ participants }: { participants: ParticipantEvaluation[] }) {
    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                종합 순위
            </h3>
            <div className="space-y-2">
                {participants.map((p, idx) => {
                    const percentage = (p.totalScore / 100) * 100; // 100점 만점 기준

                    return (
                        <div key={p.participantId} className="flex items-center gap-3">
                            <span className="text-lg w-6">{medals[idx] || `${idx + 1}`}</span>
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                                {p.avatarImage ? (
                                    <Image src={p.avatarImage} alt={p.name} fill className="object-cover" sizes="32px" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                        {p.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-primary truncate">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, percentage)}%` }}
                                            transition={{ duration: 0.6, delay: idx * 0.1 }}
                                        />
                                    </div>
                                    <span className="text-xs font-semibold text-text-secondary w-8">{p.totalScore}점</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-[10px] text-text-tertiary text-center mt-3 pt-2 border-t border-gray-100">
                점수 = AI 평가 (논리 · 근거 · 설득 · 창의 · 반박)
            </p>
        </div>
    );
}
