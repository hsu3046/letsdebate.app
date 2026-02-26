'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <section className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="text-8xl font-bold text-accent mb-4"
                >
                    404
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-title text-2xl text-text-primary mb-2"
                >
                    페이지를 찾을 수 없습니다
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-text-secondary mb-8"
                >
                    요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3 justify-center"
                >
                    <Link href="/">
                        <motion.button
                            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold shadow-[0_4px_20px_rgba(63,238,174,0.3)]"
                            
                            
                        >
                            <Home size={18} />
                            홈으로
                        </motion.button>
                    </Link>

                    <motion.button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-6 py-3 glass rounded-xl font-semibold text-text-secondary"
                        
                        
                    >
                        <ArrowLeft size={18} />
                        뒤로가기
                    </motion.button>
                </motion.div>
            </div>
        </section>
    );
}
