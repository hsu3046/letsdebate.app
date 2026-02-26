'use client';

import { motion } from 'framer-motion';
import { User, FileText, MessageCircle, Hash, Lightbulb, Eye } from 'lucide-react';

interface UserAnalysisProps {
    userName: string;
    totalStatements: number;
    totalChars: number;
    keywords: string[];
    mostInteractedWith: {
        name: string;
        avatarImage: string;
        count: number;
    } | null;
    aiFeedback: string;
}

export default function UserAnalysis({
    userName,
    totalStatements,
    totalChars,
    keywords,
    mostInteractedWith,
    aiFeedback,
}: UserAnalysisProps) {
    return (
        <div className="space-y-5">

            {/* 📝 나의 발언 요약 */}
            <section>
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" />
                    나의 발언 요약
                </h3>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
                >
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-2xl font-bold text-accent">{totalStatements}</p>
                            <p className="text-xs text-text-tertiary">총 발언 횟수</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-2xl font-bold text-accent">{totalChars.toLocaleString()}</p>
                            <p className="text-xs text-text-tertiary">총 글자 수</p>
                        </div>
                    </div>

                    {/* 주요 키워드 */}
                    {keywords.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-text-secondary mb-2 flex items-center gap-1">
                                <Hash size={12} />
                                주로 사용한 키워드:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {keywords.map((k) => (
                                    <span
                                        key={k}
                                        className="px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium"
                                    >
                                        #{k}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 가장 많이 상호작용한 상대 */}
                    {mostInteractedWith && (
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <MessageCircle size={18} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-text-primary">
                                    가장 많이 상호작용한 상대
                                </p>
                                <p className="text-xs text-text-secondary">
                                    {mostInteractedWith.name} ({mostInteractedWith.count}회 언급)
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            </section>

            {/* 💡 AI 피드백 */}
            <section>
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Lightbulb size={16} className="text-yellow-500" />
                    AI 피드백
                </h3>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-accent/5 to-purple-50 rounded-xl p-4 border border-accent/20"
                >
                    <p className="text-sm text-text-primary leading-relaxed">
                        "{aiFeedback}"
                    </p>
                </motion.div>
            </section>
        </div>
    );
}

// 사용자 미참여 시 표시할 플레이스홀더 (삭제됨 - Phase 7)
export function UserAnalysisPlaceholder() {
    return null;
}
