'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Loader2, Lightbulb, Quote, HelpCircle } from 'lucide-react';

interface KeyInsightsProps {
    openQuestions: string[];
    isLoading?: boolean;
}


export default function KeyInsights({
    openQuestions,
    isLoading = false,
}: KeyInsightsProps) {
    if (isLoading) {
        return <KeyInsightsLoading />;
    }

    return (
        <div className="space-y-5">
            {/* 더 생각해볼 질문 */}
            <section>
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <HelpCircle size={16} className="text-blue-500" />
                    더 생각해볼 질문
                </h3>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-100"
                >
                    <div className="space-y-3">
                        {openQuestions.map((q, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span className="text-accent font-bold">•</span>
                                <p className="text-sm text-text-primary leading-relaxed">
                                    {q}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </section>
        </div>
    );
}

// 로딩 상태
export function KeyInsightsLoading() {
    return (
        <div className="space-y-5">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Lightbulb size={20} className="text-amber-600" />
                    이번 토론에서 배울 점
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
                        <Loader2 size={32} className="text-amber-500" />
                    </motion.div>
                    <p className="text-sm text-text-tertiary">
                        기억에 남을 발언을 찾고 있어요...
                    </p>
                    <div className="flex gap-1 mt-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 bg-amber-400 rounded-full"
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
