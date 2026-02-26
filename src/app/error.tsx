'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <section className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md text-center">
                <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 mx-auto mb-6 bg-danger/10 rounded-2xl flex items-center justify-center"
                >
                    <AlertTriangle size={40} className="text-danger" />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-title text-2xl text-text-primary mb-2"
                >
                    앗, 문제가 발생했어요
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-text-secondary mb-8"
                >
                    예상치 못한 오류가 발생했습니다.
                    <br />잠시 후 다시 시도해주세요.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3 justify-center"
                >
                    <motion.button
                        onClick={reset}
                        className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold shadow-[0_4px_20px_rgba(63,238,174,0.3)]"
                        
                        
                    >
                        <RefreshCw size={18} />
                        다시 시도
                    </motion.button>

                    <Link href="/">
                        <motion.button
                            className="flex items-center gap-2 px-6 py-3 glass rounded-xl font-semibold text-text-secondary"
                            
                            
                        >
                            <Home size={18} />
                            홈으로
                        </motion.button>
                    </Link>
                </motion.div>

                {/* 에러 메시지는 사용자 혼란을 방지하기 위해 표시하지 않음
                {process.env.NODE_ENV === 'development' && error.message && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 p-4 bg-bg-tertiary rounded-lg text-left"
                    >
                        <p className="text-xs text-text-tertiary font-mono break-all">
                            {error.message}
                        </p>
                    </motion.div>
                )}
                */}
            </div>
        </section>
    );
}
