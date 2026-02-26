'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Loader2, ClipboardList, Mic } from 'lucide-react';

interface ModeratorSummaryProps {
    mainConflicts: string[];
    conclusion: string;
    isLoading?: boolean;
    topic?: string;  // 토론 주제
}

// 6) 마크다운 리치 텍스트를 JSX로 변환
const renderRichText = (text: string) => {
    // 정리: 줄바꿈 정규화
    let cleaned = text.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n');

    // 잘못된 마크다운 패턴 정규화 (예: *제목** → **제목**)
    cleaned = cleaned.replace(/\*([^*\n]+)\*\*/g, '**$1**');
    cleaned = cleaned.replace(/\*\*([^*\n]+)\*/g, '**$1**');
    // 단독 * 제거 (bold가 아닌 경우만)
    cleaned = cleaned.replace(/(?<!\*)\*(?!\*)/g, '');

    // 라인별로 분리
    const lines = cleaned.split('\n');

    return lines.map((line, lineIndex) => {
        // 빈 줄은 br로
        if (line.trim() === '') {
            return <br key={lineIndex} />;
        }

        // 제목/섹션 감지: *제목*, **제목** 패턴 등
        const sectionPatterns = [
            /^\*\*(.+?)\*\*$/,           // **제목**
            /^\*([^*]+)\*$/,             // *제목*
            /^##\s*(.+)$/,               // ## 제목
            /^(\d+)\)\s*(.+)$/,          // 1) 제목
            /^\*\*(\d+)\.\s*(.+?)\*\*$/, // **1. 제목**
        ];

        for (const pattern of sectionPatterns) {
            const match = line.trim().match(pattern);
            if (match) {
                // 제목 텍스트에서 모든 * 제거
                const title = (match[2] || match[1]).replace(/\*/g, '').trim();
                const prefix = match[2] ? `${match[1]}. ` : '';
                return (
                    <p key={lineIndex} className="font-bold text-text-primary mt-4 mb-2 text-sm">
                        {prefix}{title}
                    </p>
                );
            }
        }

        // **bold** 처리 함수
        const processBold = (text: string): React.ReactNode[] => {
            const parts: React.ReactNode[] = [];
            const boldRegex = /\*\*(.+?)\*\*/g;
            let lastIndex = 0;
            let match;

            while ((match = boldRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(text.slice(lastIndex, match.index));
                }
                parts.push(<strong key={`bold-${lineIndex}-${match.index}`} className="font-semibold text-text-primary">{match[1]}</strong>);
                lastIndex = boldRegex.lastIndex;
            }

            if (lastIndex < text.length) {
                parts.push(text.slice(lastIndex));
            }

            return parts.length > 0 ? parts : [text];
        };

        // 리스트 아이템 감지 (- item 또는 * item)
        const listMatch = line.match(/^\s*[-*•]\s*[-]?\s*(.+)$/);
        if (listMatch) {
            // 리스트 내용에서 앞의 "-" 제거하고 bold 처리
            const content = listMatch[1].replace(/^-\s*/, '').trim();
            return (
                <div key={lineIndex} className="flex items-start gap-2 ml-2 my-1">
                    <span className="text-accent mt-0.5 shrink-0">•</span>
                    <span className="text-sm leading-relaxed">{processBold(content)}</span>
                </div>
            );
        }

        return (
            <span key={lineIndex} className="block my-0.5">
                {processBold(line)}
            </span>
        );
    });
};

export default function ModeratorSummary({
    mainConflicts,
    conclusion,
    isLoading = false,
    topic,
}: ModeratorSummaryProps) {
    if (isLoading) {
        return <ModeratorSummaryLoading />;
    }

    return (
        <div className="space-y-4">
            {/* Section Header - 사회자 아이콘 포함 */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <ClipboardList size={18} className="text-emerald-600" />
                            사회자 종합 정리
                        </h2>
                        <p className="text-sm text-text-secondary mt-0.5">
                            오늘 토론의 핵심을 정리했어요
                        </p>
                    </div>
                    {/* 사회자 아이콘 - 오른쪽 끝 */}
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                        <Image src="/avatars/avatar_mc.jpeg" alt="사회자" fill className="object-cover" sizes="48px" />
                    </div>
                </div>
            </div>

            {/* 토론 주제 - 핵심 쟁점 바로 위에 표시 */}
            {topic && (
                <h3 className="text-lg font-bold text-text-primary pt-2">
                    "{topic}"
                </h3>
            )}

            {/* 주요 대립점 - mainConflicts가 있을 때만 표시 */}
            {mainConflicts.length > 0 && (
                <section>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
                    >
                        <p className="text-sm text-text-secondary mb-4">
                            오늘 토론에서는 크게 <span className="font-bold text-text-primary">{mainConflicts.length}가지</span> 관점이 충돌했습니다.
                        </p>

                        <div className="space-y-3">
                            {mainConflicts.map((conflict, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + i * 0.1 }}
                                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                                >
                                    <span className="flex-shrink-0 w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-xs font-bold text-accent">
                                        {i + 1}
                                    </span>
                                    <p className="text-sm text-text-primary font-medium leading-relaxed">
                                        {conflict}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </section>
            )}
            {/* 6) Conclusion - 리치 텍스트 렌더링 */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="pt-4"
            >
                <div className="text-sm text-text-secondary leading-relaxed">
                    {renderRichText(conclusion)}
                </div>
            </motion.div>
        </div>
    );
}

// 로딩 상태
export function ModeratorSummaryLoading() {
    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardList size={20} className="text-emerald-600" />
                    사회자 종합 정리
                </h2>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm"
            >
                <div className="flex flex-col items-center justify-center gap-3">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <Loader2 size={32} className="text-accent" />
                    </motion.div>
                    <p className="text-sm text-text-tertiary">
                        핵심 대립점을 분석하고 있어요...
                    </p>
                    <div className="flex gap-1 mt-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 bg-accent rounded-full"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
