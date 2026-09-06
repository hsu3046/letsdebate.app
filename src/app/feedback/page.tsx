'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, MessageSquare, Star, CheckCircle, AlertCircle } from 'lucide-react';

export default function FeedbackPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // 터치 스와이프를 위한 상태
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - touchStartX;
        const threshold = 30;

        if (Math.abs(diff) >= threshold) {
            if (diff > 0) {
                // 오른쪽 스와이프 → 별점 증가
                setRating(prev => Math.min(5, (prev || 0) + 1));
            } else {
                // 왼쪽 스와이프 → 별점 감소
                setRating(prev => Math.max(1, (prev || 1) - 1));
            }
            setTouchStartX(currentX); // 연속 스와이프 지원
        }
    };

    const handleTouchEnd = () => {
        setTouchStartX(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            alert('보내실 의견을 입력해 주세요');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('https://formspree.io/f/xgvgndwq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email || '(미입력)',
                    message,
                    rating: rating || '(미선택)',
                    timestamp: new Date().toISOString(),
                }),
            });

            if (response.ok) {
                setSubmitStatus('success');
                setEmail('');
                setMessage('');
                setRating(null);
            } else {
                setSubmitStatus('error');
            }
        } catch {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitStatus === 'success') {
        return (
            <section className="legacy-page">
                <div className="max-w-[760px] mx-auto pb-6 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-success/10 flex items-center justify-center">
                        <CheckCircle size={40} className="text-success" />
                    </div>
                    <h1 className="font-title text-2xl text-text-primary mb-3">
                        의견을 보내 주셔서 고마워요
                    </h1>
                    <p className="text-sm text-text-secondary mb-8">
                        보내 주신 의견이 잘 도착했어요<br />
                        더 편하고 즐거운 토론을 만드는 데 참고할게요
                    </p>
                    <motion.button
                        onClick={() => router.push('/')}
                        className="w-full py-3.5 bg-accent hover:bg-accent-light rounded-lg text-[0.9375rem] font-semibold text-white transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        홈으로 돌아가기
                    </motion.button>
                </div>
            </section>
        );
    }

    return (
        <section className="legacy-page animate-fade-in">
            <div className="max-w-[760px] mx-auto pb-6">
                {/* Header */}
                <div className="flex items-center mb-6 pt-2">
                    <motion.button
                        onClick={() => router.back()}
                        className="w-10 h-10 glass rounded-lg flex items-center justify-center text-text-primary hover:border-accent transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        <ArrowLeft size={18} />
                    </motion.button>
                    <h2 className="flex-1 text-center font-title text-3xl">의견 보내기</h2>
                    <div className="w-10" />
                </div>

                {/* Description */}
                <div className="glass rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
                        <MessageSquare size={18} className="text-accent" />
                        여러분의 의견을 듣고 싶어요
                    </div>
                    <p className="text-sm text-text-secondary">
                        불편했던 점이나 바라는 기능을 알려 주세요.
                        왈가왈부를 사용한 소감도 좋아요.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Rating */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 text-sm font-semibold mb-2.5 text-text-primary">
                            <Star size={16} className="text-accent" />
                            만족도
                            <span className="text-[0.6875rem] font-medium text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">선택</span>
                        </label>
                        <div
                            className="flex gap-2 justify-center"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`w-12 h-12 rounded-lg transition-all ${rating && rating >= star
                                        ? 'bg-warning text-white'
                                        : 'glass text-text-tertiary hover:text-warning hover:border-warning'
                                        }`}
                                >
                                    <Star size={24} className="mx-auto" fill={rating && rating >= star ? 'currentColor' : 'none'} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 text-sm font-semibold mb-2.5 text-text-primary">
                            이메일
                            <span className="text-[0.6875rem] font-medium text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">선택</span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="답변을 받을 이메일을 입력해 주세요"
                            className="w-full p-3 glass rounded-lg text-[0.9375rem] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>

                    {/* Message */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 text-sm font-semibold mb-2.5 text-text-primary">
                            <MessageSquare size={16} className="text-accent" />
                            보내실 의견
                            <span className="text-[0.6875rem] font-medium text-danger">필수</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="오류 제보나 기능 제안 등 자유롭게 적어 주세요"
                            maxLength={1000}
                            className="w-full min-h-[160px] p-3 glass rounded-lg text-[0.9375rem] text-text-primary placeholder:text-text-tertiary resize-y focus:outline-none focus:border-accent transition-colors"
                        />
                        <div className="flex justify-end mt-1 text-xs text-text-tertiary">
                            {message.length}/1000
                        </div>
                    </div>

                    {/* Error Message */}
                    {submitStatus === 'error' && (
                        <div className="flex items-center gap-2 p-3 mb-4 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                            <AlertCircle size={18} />
                            의견을 보내지 못했어요. 잠시 후 다시 시도해 주세요.
                        </div>
                    )}

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={isSubmitting || !message.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent hover:bg-accent-light rounded-lg text-[0.9375rem] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={!isSubmitting && message.trim() ? { scale: 1.02 } : {}}
                        whileTap={!isSubmitting && message.trim() ? { scale: 0.97 } : {}}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        {isSubmitting ? (
                            <>보내는 중…</>
                        ) : (
                            <>
                                <Send size={18} />
                                의견 보내기
                            </>
                        )}
                    </motion.button>
                </form>

                {/* Footer */}

            </div>
        </section>
    );
}
