'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, RefreshCw, Home, MessageSquare, ChevronLeft, Sparkles } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { useDebateAI } from '@/hooks/useDebateAI';
import { getCharacterById } from '@/lib/characters';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import FadeInView from '@/components/FadeInView';
import ModeratorSummary from '@/components/result/ModeratorSummary';
import KeyInsights from '@/components/result/KeyInsights';
import { parseSummary } from '@/utils/summaryParser';

export default function ReportPage() {
    const router = useRouter();
    const { setup, state, resetState, resetSetup, updateHistorySummary } = useDebateStore();

    const [isLoadingAI, setIsLoadingAI] = useState(true);
    const [moderatorSummary, setModeratorSummary] = useState({
        mainConflicts: [] as string[],
        conclusion: '',
    });
    const [keyInsights, setKeyInsights] = useState({
        keyQuotes: [] as { quote: string; speaker: { name: string; avatarImage: string } }[],
        openQuestions: [] as string[],
    });

    // 재토론 확인 모달
    const [showRestartModal, setShowRestartModal] = useState(false);

    const { generateSummary } = useDebateAI({
        topic: setup.topic,
        context: setup.context,
        participants: setup.participants,
        humanName: setup.humanName,
    });

    useEffect(() => {
        if (setup.participants.length === 0) {
            router.push('/');
            return;
        }
        fetchAISummary();
    }, []);

    const fetchAISummary = async () => {
        const cacheKey = `debate-summary-${setup.topic.replace(/\s+/g, '-').substring(0, 50)}`;
        const evaluateCacheKey = `debate-evaluate-${setup.topic.replace(/\s+/g, '-').substring(0, 50)}`;
        let usedCache = false;

        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
        if (cached) {
            try {
                const parsedCache = JSON.parse(cached);
                setModeratorSummary({
                    mainConflicts: parsedCache.mainConflicts || [],
                    conclusion: parsedCache.conclusion || '',
                });
                setKeyInsights({
                    keyQuotes: parsedCache.keyQuotes || [],
                    openQuestions: parsedCache.openQuestions || [],
                });
                usedCache = true;
            } catch { /* 캐시 파싱 실패 시 무시 */ }
        }

        // evaluate 캐시에서 openQuestions 가져오기 (fallback)
        const evaluateCached = typeof window !== 'undefined' ? localStorage.getItem(evaluateCacheKey) : null;
        if (evaluateCached) {
            try {
                const parsedEvaluate = JSON.parse(evaluateCached);
                if (parsedEvaluate.openQuestions?.length > 0) {
                    setKeyInsights(prev => ({
                        ...prev,
                        openQuestions: parsedEvaluate.openQuestions,
                    }));
                }
            } catch { /* 캐시 파싱 실패 시 무시 */ }
        }

        setIsLoadingAI(!usedCache);

        try {
            const summaryResult = await generateSummary(state.messages);

            if (summaryResult) {
                // 요약 결과 파싱 (질문 추출)
                const { conclusion, openQuestions } = parseSummary(summaryResult);

                setModeratorSummary({
                    mainConflicts: [],
                    conclusion: conclusion,
                });

                // 생성된 질문이 있으면 사용, 없으면 기존(캐시) 값 유지
                if (openQuestions.length > 0) {
                    setKeyInsights(prev => ({
                        ...prev,
                        openQuestions: openQuestions,
                    }));
                }

                updateHistorySummary(setup.topic, conclusion.slice(0, 100));

                // 캐시 업데이트
                localStorage.setItem(cacheKey, JSON.stringify({
                    mainConflicts: [],
                    conclusion: conclusion,
                    keyQuotes: [],
                    openQuestions: openQuestions.length > 0 ? openQuestions : keyInsights.openQuestions,
                }));
            }
        } catch (error) {
            console.error('AI 요약 생성 실패:', error);
        } finally {
            setIsLoadingAI(false);
        }
    };

    // handleDownload 함수 (기존 result/page.tsx에서 복사)
    const handleDownload = () => {
        const formatContent = (text: string): string => {
            return text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
        };

        const participantColors = ['#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#f59e0b'];
        const getParticipantColor = (name: string): string => {
            const index = setup.participants.findIndex(p => p.name === name);
            return index >= 0 ? participantColors[index % participantColors.length] : '#6366f1';
        };

        const getShortModelName = (aiModel: string): string => {
            if (aiModel.toLowerCase().includes('gemini')) return 'Gemini';
            if (aiModel.toLowerCase().includes('claude')) return 'Claude';
            if (aiModel.toLowerCase().includes('gpt') || aiModel.toLowerCase().includes('chatgpt')) return 'ChatGPT';
            if (aiModel.toLowerCase().includes('grok')) return 'Grok';
            return aiModel;
        };

        const formattedSummary = formatContent(moderatorSummary.conclusion);

        const messagesHtml = state.messages.map((m) => {
            const participant = setup.participants.find(p => p.name === m.author);
            const char = getCharacterById(participant?.id || '');
            const modelName = char ? getShortModelName(char.aiModel) : 'Gemini';

            if (m.isModerator) {
                return `<div class="message moderator">
                <div class="message-header">
                    <span class="author" style="color: #10b981">사회자</span>
                    <span class="model-name">Gemini</span>
                </div>
                <div class="content">${formatContent(m.content)}</div>
            </div>`;
            } else {
                const color = getParticipantColor(m.author);
                return `<div class="message participant">
                <div class="message-header">
                    <span class="author" style="color: ${color}">${m.author}</span>
                    <span class="model-name">${modelName}</span>
                </div>
                <div class="content">${formatContent(m.content)}</div>
            </div>`;
            }
        }).join('\n');

        const participantsHtml = setup.participants.map(p => {
            const char = getCharacterById(p.id);
            const modelName = char ? getShortModelName(char.aiModel) : 'AI';
            return `<span class="participant-tag">${p.name} <small>(${modelName})</small></span>`;
        }).join('') + (setup.humanParticipation ? `
                <span class="participant-tag human">${setup.humanName || '나'} <small>(Human)</small></span>` : '');

        const now = new Date();
        const dateStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.getHours() >= 12 ? '오후' : '오전'} ${String(now.getHours() % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const icons = {
            messageCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
            users: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            clipboardList: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
            messagesSquare: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>'
        };

        const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>왈가왈부: ${setup.topic}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 50%, #f5f3ff 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { font-size: 1.5rem; color: #1a1a1a; margin-bottom: 8px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .subtitle { color: #666; font-size: 0.875rem; text-align: center; margin-bottom: 24px; }
        .summary { background: white; border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .summary h2 { font-size: 1rem; color: #10b981; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .summary p { font-size: 0.875rem; color: #333; line-height: 1.8; }
        .summary strong { color: #1a1a1a; font-weight: 600; }
        .section-title { font-size: 1rem; color: #6366f1; margin: 24px 0 16px; display: flex; align-items: center; gap: 8px; }
        .messages { display: flex; flex-direction: column; gap: 16px; }
        .message { background: white; border-radius: 16px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f0f0f0; }
        .message.moderator { background: linear-gradient(135deg, #d1fae5, #ccfbf1); border-left: 4px solid #10b981; }
        .message-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
        .author { font-weight: 700; font-size: 0.95rem; }
        .model-name { font-size: 0.75rem; color: #9ca3af; font-weight: 400; }
        .content { font-size: 0.9rem; color: #333; line-height: 1.9; white-space: pre-wrap; }
        .content strong { color: #1a1a1a; font-weight: 600; }
        .participants { background: white; border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .participants h2 { font-size: 1rem; color: #6366f1; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .participant-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .participant-tag { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #f3f4f6; border-radius: 20px; font-size: 0.875rem; color: #374151; }
        .participant-tag small { color: #9ca3af; font-size: 0.75rem; }
        .participant-tag.human { background: #d1fae5; color: #047857; }
        footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
        .footer-main { font-size: 0.875rem; font-weight: 600; color: #666; margin-bottom: 8px; }
        .footer-disclaimer { font-size: 0.75rem; color: #999; line-height: 1.6; margin-bottom: 8px; }
        .footer-copyright { font-size: 0.7rem; color: #bbb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${icons.messageCircle} ${setup.topic}</h1>
        <p class="subtitle">${dateStr} · ${setup.participants.length + (setup.humanParticipation ? 1 : 0)}명 참여 · ${state.messages.length}개 발언</p>
        
        
        <div class="participants">
            <h2>${icons.users} 참가자</h2>
            <div class="participant-list">
                ${participantsHtml}
                
            </div>
        </div>
        
        <div class="summary">
            <h2>${icons.clipboardList} 사회자 정리</h2>
            <p>${formattedSummary}</p>
        </div>
        
        <h2 class="section-title">${icons.messagesSquare} 토론 기록</h2>
        <div class="messages">
            ${messagesHtml}
        </div>
        
        <footer>
            <p class="footer-main">왈가왈부 - AI 토론 시뮬레이터</p>
            <p class="footer-disclaimer">본 서비스는 베타 테스트 중인 AI 시뮬레이션입니다. 생성된 콘텐츠는 사실과 다르거나 편향될 수 있으며, 왈가왈부는 정보의 정확성이나 신뢰성을 보장하지 않습니다. 특히 법률, 의료, 금융 등 전문적인 조언으로 활용하여 발생한 결과에 대해 서비스 제공자는 어떠한 법적 책임도 지지 않습니다.</p>
            <p class="footer-copyright">© 2025 왈가왈부(WalGaWalBu). All rights reserved.</p>
        </footer>
    </div>
</body>
</html>`;

        // XSS 방지를 위한 HTML sanitization
        const sanitizedHtml = sanitizeHtml(htmlContent);

        const blob = new Blob([sanitizedHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTopic = setup.topic.replace(/[\\/:*?"<>|]/g, '_').substring(0, 30);
        const fileDateStr = new Date().toISOString().split('T')[0];
        a.download = `왈가왈부_${safeTopic}_${fileDateStr}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        const summaryText = moderatorSummary.conclusion
            ? `📢 ${moderatorSummary.conclusion.slice(0, 150)}${moderatorSummary.conclusion.length > 150 ? '...' : ''}`
            : '';
        const shareText = `🎤 왈가왈부에서 "${setup.topic}" 주제로 AI 토론을 진행했습니다!\n\n${summaryText}\n\n👉 나도 AI 토론 해보기`;
        const shareUrl = 'https://walgawalbu.vercel.app';

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `왈가왈부: ${setup.topic}`,
                    text: shareText,
                    url: shareUrl
                });
            }
            catch { /* 취소 시 무시 */ }
        } else {
            try {
                await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                alert('공유 내용이 클립보드에 복사되었습니다!');
            } catch {
                alert('공유하기를 지원하지 않는 브라우저입니다.');
            }
        }
    };

    return (
        <>
            <section className="min-h-screen overflow-y-auto p-4 pt-3 pb-20">
                <div className="max-w-[420px] mx-auto pb-6">
                    {/* 뒤로가기 버튼 */}
                    <motion.button
                        onClick={() => router.push('/stats')}
                        className="flex items-center gap-1 text-sm text-text-secondary mb-4 hover:text-accent transition-colors"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        <ChevronLeft size={16} />
                        토론 통계로 돌아가기
                    </motion.button>

                    {/* Header */}
                    <FadeInView delay={0.1} className="text-center mb-6">
                        <motion.div
                            className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-accent"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                            <Sparkles size={32} className="text-white" />
                        </motion.div>
                        <h1 className="font-title text-2xl text-text-primary mb-1">
                            사회자 종합 정리
                        </h1>
                        <p className="text-sm text-text-secondary">
                            오늘의 토론을 AI 사회자가 정리해 드립니다.
                        </p>
                    </FadeInView>

                    {/* 사회자 정리 */}
                    <FadeInView delay={0.2} className="mb-6">
                        <ModeratorSummary
                            mainConflicts={moderatorSummary.mainConflicts}
                            conclusion={moderatorSummary.conclusion}
                            isLoading={isLoadingAI}
                            topic={setup.topic}
                        />
                    </FadeInView>

                    {/* 인사이트 */}
                    <FadeInView delay={0.3} className="mb-6">
                        <KeyInsights
                            openQuestions={keyInsights.openQuestions}
                            isLoading={isLoadingAI}
                        />
                    </FadeInView>

                    {/* 액션 버튼 */}
                    <FadeInView delay={0.4}>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <motion.button
                                onClick={handleShare}
                                className="flex items-center justify-center gap-2 py-3 glass rounded-xl text-sm font-medium text-text-secondary"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Share2 size={16} /> 공유하기
                            </motion.button>
                            <motion.button
                                onClick={isLoadingAI ? () => alert('요약 생성 중입니다. 잠시만 기다려주세요!') : handleDownload}
                                className={`flex items-center justify-center gap-2 py-3 glass rounded-xl text-sm font-medium ${isLoadingAI ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-text-secondary'}`}
                                whileHover={!isLoadingAI ? { scale: 1.03 } : {}}
                                whileTap={!isLoadingAI ? { scale: 0.97 } : {}}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Download size={16} /> {isLoadingAI ? '생성 중...' : '다운로드'}
                            </motion.button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <motion.button
                                onClick={() => setShowRestartModal(true)}
                                className="flex items-center justify-center gap-2 py-3 glass rounded-xl text-sm font-medium text-text-secondary"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <RefreshCw size={16} /> 재토론
                            </motion.button>
                            <motion.button
                                onClick={() => { resetState(); resetSetup(); router.push('/'); }}
                                className="flex items-center justify-center gap-2 py-3 glass rounded-xl text-sm font-medium text-text-secondary"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Home size={16} /> 홈으로
                            </motion.button>
                        </div>
                    </FadeInView>

                    {/* 피드백 */}
                    <FadeInView delay={0.5}>
                        <div className="text-center py-3">
                            <p className="text-sm text-text-tertiary mb-2">이 토론은 어떠셨나요?</p>
                            <motion.button
                                onClick={() => router.push('/feedback')}
                                className="inline-flex items-center gap-1 text-sm text-accent"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <MessageSquare size={14} /> 피드백 보내기
                            </motion.button>
                        </div>
                    </FadeInView>

                    {/* Footer */}
                    <FadeInView delay={0.6}>
                        <footer className="mt-8 pt-6 px-4 border-t border-glass-border text-center">
                            <p className="text-[0.6875rem] text-text-tertiary leading-relaxed mb-2">
                                이곳의 토론은 정답이 아닌, 다양한 가능성을 탐구하는 과정입니다.
                            </p>
                            <p className="text-[10px] text-text-tertiary/60 leading-relaxed max-w-[320px] mx-auto mb-2">
                                본 서비스는 베타 테스트 중인 AI 시뮬레이션입니다. 생성된 콘텐츠는 사실과 다르거나 편향될 수 있으며,
                                왈가왈부는 정보의 정확성이나 신뢰성을 보장하지 않습니다.
                            </p>
                            <p className="text-[11px] text-text-secondary font-medium mb-3">
                                <Link href="/legal" className="hover:text-accent transition-colors underline underline-offset-2">이용약관</Link>
                                {' | '}
                                <Link href="/legal?tab=privacy" className="hover:text-accent transition-colors underline underline-offset-2">개인정보처리방침</Link>
                            </p>
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <span className="text-xs text-text-primary">Powered by</span>
                                <div className="flex items-center gap-3 ml-1">
                                    <img src="/logos/gemini.svg" alt="Gemini" className="h-6" />
                                    <img src="/logos/anthropic.svg" alt="Claude" className="h-6" />
                                    <img src="/logos/openai.svg" alt="OpenAI" className="h-6" />
                                    <img src="/logos/xai.svg" alt="Grok" className="h-6" />
                                    <img src="/DeepSeek_logo.svg" alt="DeepSeek" className="h-6" />
                                </div>
                            </div>
                            <p className="text-[0.625rem] text-text-tertiary opacity-70">
                                © 2025 왈가왈부(WalGaWalBu) · v0.2.0
                            </p>
                        </footer>
                    </FadeInView>
                </div>
            </section>

            {/* 재토론 확인 모달 */}
            <AnimatePresence>
                {showRestartModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setShowRestartModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <RefreshCw size={24} className="text-accent" />
                                </div>
                                <h3 className="text-lg font-bold text-text-primary mb-2">재토론 하시겠습니까?</h3>
                                <p className="text-sm text-text-tertiary">
                                    같은 주제와 참가자로 새로운 토론을 시작합니다.
                                    <br />이전 토론의 결론을 일부분 반영합니다.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <motion.button
                                    onClick={() => setShowRestartModal(false)}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium text-text-secondary bg-gray-100 hover:bg-gray-200 transition-colors"
                                    whileTap={{ scale: 0.98 }}
                                >
                                    취소
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        localStorage.setItem('previousDebateSummary', JSON.stringify({
                                            topic: setup.topic,
                                            conclusion: moderatorSummary.conclusion,
                                            mainConflicts: moderatorSummary.mainConflicts,
                                            openQuestions: keyInsights.openQuestions,
                                        }));
                                        resetState();
                                        router.push('/arena');
                                    }}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-accent hover:bg-accent/90 transition-colors"
                                    whileTap={{ scale: 0.98 }}
                                >
                                    재토론 시작
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
