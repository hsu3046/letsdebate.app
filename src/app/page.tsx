'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCirclePlus, ChevronRight, Zap, Info, Clock, Inbox, MessageSquare, Trash2, ChevronDown, HelpCircle, X, Users, Calendar, MessageCircle, MessagesSquare, Bell, Settings } from 'lucide-react';
import { useDebateStore, DebateHistoryItem } from '@/store/debateStore';
import FadeInView from '@/components/FadeInView';
import { CHARACTERS } from '@/lib/characters';
import { getRemainingUsage, DAILY_LIMIT, getResetTimeString } from '@/lib/usageLimit';

export default function HomePage() {
  const { history, removeFromHistory, clearHistory } = useDebateStore();
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<DebateHistoryItem | null>(null);
  const [remainingUsage, setRemainingUsage] = useState(DAILY_LIMIT);
  const [resetTimeString, setResetTimeString] = useState('');

  useEffect(() => {
    // 클라이언트에서만 사용량 로드
    setRemainingUsage(getRemainingUsage());
    setResetTimeString(getResetTimeString());

    // 1분마다 갱신
    const interval = setInterval(() => {
      setRemainingUsage(getRemainingUsage());
      setResetTimeString(getResetTimeString());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      {/* Main Screen */}
      <section className="min-h-screen p-4 pt-3">
        <div className="max-w-[420px] mx-auto pb-6">
          {/* Hero Section */}
          <FadeInView delay={0.1} className="text-center py-4 pb-7">
            <motion.div
              className="w-20 h-20 mx-auto mb-3"
              animate={{
                y: [0, -8, 0],
                rotate: [0, 2, -2, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Image
                src="/logo_light.svg"
                alt="왈가왈부 로고"
                width={80}
                height={80}
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </motion.div>
            <h1 className="font-display text-5xl mb-3 tracking-wide">
              <span className="text-logo-yellow">왈</span>
              <span className="text-logo-red">가</span>
              <span className="text-logo-blue">왈</span>
              <span className="text-logo-green">부</span>
            </h1>
            <p className="text-base text-text-secondary leading-relaxed">
              세상 모든 주제에 딴지 거는 AI들, 그리고 나
            </p>
          </FadeInView>

          {/* Start Button - Prominent */}
          <FadeInView delay={0.2}>
            <Link href="/setup?new=true">
              <motion.div
                className="w-full flex items-center gap-4 p-5 bg-accent rounded-2xl shadow-lg mb-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <MessageCirclePlus size={24} className="text-white" />
                </div>
                <span className="flex-1 font-title text-xl text-white">새 토론 시작하기</span>
                <ChevronRight size={20} className="text-white/70" />
              </motion.div>
            </Link>
          </FadeInView>

          {/* Usage Counter - Clickable */}
          <FadeInView delay={0.3}>
            <motion.button
              onClick={() => setShowUsageModal(true)}
              className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl text-sm text-text-secondary mb-7 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Zap size={14} className={remainingUsage > 0 ? "text-accent" : "text-danger"} />
              <span>오늘 남은 횟수</span>
              <div className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${remainingUsage > 0 ? 'bg-accent text-white' : 'bg-danger text-white'}`}>
                <span>{remainingUsage}</span>/{DAILY_LIMIT}
              </div>
              <Info size={14} className="text-text-tertiary" />
            </motion.button>
          </FadeInView>

          {/* Scroll Hint */}
          <FadeInView delay={0.4} className="flex justify-center mb-6">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-text-tertiary"
            >
              <ChevronDown size={20} />
            </motion.div>
          </FadeInView>

          {/* History Section */}
          <FadeInView delay={0.5} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                  <Clock size={16} />
                  최근 토론
                </h2>
                <span className="text-[10px] text-text-tertiary">
                  (최대 5개까지 개인 디바이스에만 저장됩니다)
                </span>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => { if (confirm('모든 기록을 삭제하시겠습니까?')) clearHistory(); }}
                  className="text-xs text-text-tertiary hover:text-danger transition-colors"
                >
                  전체 삭제
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <Inbox size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-1">아직 토론 기록이 없습니다</p>
                <span className="text-[0.8125rem] opacity-80">새 토론을 시작해보세요</span>
              </div>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 5).map((item) => (
                  <motion.div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl group cursor-pointer"

                    onClick={() => setSelectedHistory(item)}
                  >
                    <div className={`w-10 h-10 ${item.wasStopped ? 'bg-red-100' : 'bg-accent/10'} rounded-lg flex items-center justify-center shrink-0`}>
                      <MessageSquare size={18} className={item.wasStopped ? 'text-red-500' : 'text-accent'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{item.topic}</p>
                      <p className="text-xs text-text-tertiary">{formatDate(item.createdAt)} · {item.participants.length}명 참가</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromHistory(item.id); }}
                      className="w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </FadeInView>

          {/* Footer - Only 2 buttons: Help, Feedback */}
          <FadeInView delay={0.6}>
            <footer className="mt-8 pt-5 border-t border-gray-200">
              <div className="flex justify-center gap-3 mb-4">
                <Link href="/help">
                  <motion.button


                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                  >
                    <HelpCircle size={16} />
                    소개글
                  </motion.button>
                </Link>
                <Link href="/notice">
                  <motion.button


                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                  >
                    <Bell size={16} />
                    알림판
                  </motion.button>
                </Link>
                <Link href="/feedback">
                  <motion.button


                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                  >
                    <MessageSquare size={16} />
                    피드백
                  </motion.button>
                </Link>
                <Link href="/settings">
                  <motion.button


                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                  >
                    <Settings size={16} />
                    설정
                  </motion.button>
                </Link>
              </div>



              <div className="text-center">
                <p className="text-[0.6875rem] text-text-tertiary leading-relaxed mb-2">
                  이곳의 토론은 정답이 아닌, 다양한 가능성을 탐구하는 과정입니다.
                </p>
                <p className="text-[9px] text-text-tertiary/60 leading-relaxed mb-2">
                  본 서비스는 베타 테스트 중인 AI 시뮬레이션입니다. 생성된 콘텐츠는 사실과 다르거나 편향될 수 있으며,
                  왈가왈부는 정보의 정확성이나 신뢰성을 보장하지 않습니다. 특히 법률, 의료, 금융 등 전문적인 조언으로
                  활용하여 발생한 결과에 대해 서비스 제공자는 어떠한 법적 책임도 지지 않습니다.
                </p>
                <p className="text-[11px] text-text-secondary font-medium mb-2">
                  <Link href="/legal" className="hover:text-accent transition-colors underline underline-offset-2">이용약관</Link>
                  {' | '}
                  <Link href="/legal?tab=privacy" className="hover:text-accent transition-colors underline underline-offset-2">개인정보처리방침</Link>
                </p>
                {/* Powered by */}
                <div className="flex items-center justify-center gap-2 mt-[10px] mb-4">
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
              </div>
            </footer>
          </FadeInView>
        </div>
      </section>

      {/* Usage Modal */}
      <AnimatePresence>
        {showUsageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUsageModal(false)}
          >
            <motion.div
              className="w-full max-w-[320px] bg-white rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-primary">무료 이용 안내</h3>
                <button onClick={() => setShowUsageModal(false)} className="text-text-tertiary hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3 text-sm text-text-secondary">
                <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-xl">
                  <Zap size={24} className={remainingUsage > 0 ? "text-accent" : "text-danger"} />
                  <div>
                    <p className="font-semibold text-text-primary">하루 {DAILY_LIMIT}회 무료!</p>
                    <p className="text-xs">{resetTimeString || '매일 자정(KST)에 초기화됩니다'}</p>
                  </div>
                </div>
                <p>현재 남은 횟수: <span className="font-bold text-accent">{remainingUsage}회</span></p>
                <p className="text-xs text-text-tertiary">토론을 시작하는 순간, 1회가 차감됩니다.</p>
              </div>
              <button
                onClick={() => setShowUsageModal(false)}
                className="w-full mt-4 py-3 bg-accent text-white rounded-xl font-semibold"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Detail Modal */}
      <AnimatePresence>
        {selectedHistory && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedHistory(null)}
          >
            <motion.div
              className="w-full max-w-[400px] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 - 날짜 포함, 중앙정렬 */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div className="flex-1" />
                <div className="text-center">
                  <h3 className="text-lg font-bold text-text-primary">토론 기록</h3>
                  <div className="flex items-center justify-center gap-1 text-xs text-text-tertiary mt-0.5">
                    <Calendar size={12} />
                    <span>{formatDate(selectedHistory.createdAt)}</span>
                  </div>
                </div>
                <div className="flex-1 flex justify-end">
                  <button onClick={() => setSelectedHistory(null)} className="text-text-tertiary hover:text-text-primary">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* 콘텐츠 - 스크롤 */}
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
                {/* 토론 주제 */}
                <div className="p-4 bg-gradient-to-r from-accent/10 to-success/10 rounded-xl">
                  <p className="text-xs text-accent font-semibold mb-1 flex items-center gap-1"><MessagesSquare size={12} /> 토론 주제</p>
                  <p className="text-base font-bold text-text-primary leading-snug">{selectedHistory.topic}</p>
                  {selectedHistory.wasStopped && (
                    <p className="text-xs text-red-500 font-medium mt-1">⏹ 중단된 토론</p>
                  )}
                </div>

                {/* 참가자 - 캐릭터 아바타와 함께 */}
                <div>
                  <p className="text-xs text-text-tertiary mb-2 flex items-center gap-1">
                    <Users size={12} />
                    참가자
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedHistory.participants.map((name) => {
                      const char = CHARACTERS.find(c => c.name === name || c.name.includes(name));
                      return (
                        <div key={name} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-full">
                          {char?.avatarImage ? (
                            <div className="w-5 h-5 rounded-full overflow-hidden">
                              <Image src={char.avatarImage} alt={name} width={20} height={20} className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px]">
                              👤
                            </div>
                          )}
                          <span className="text-xs text-text-secondary">{name}</span>
                        </div>
                      );
                    })}
                    {/* 유저 참가 표시 */}
                    {selectedHistory.humanName && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-100 rounded-full">
                        <div className="w-5 h-5 rounded-full overflow-hidden">
                          <Image src="/avatars/user.png" alt={selectedHistory.humanName} width={20} height={20} className="object-cover" />
                        </div>
                        <span className="text-xs text-emerald-700 font-medium">{selectedHistory.humanName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 메타 정보 */}
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <MessageCircle size={12} />
                  <span>{selectedHistory.messageCount}개 발언</span>
                </div>

                {/* 요약 - 전체 표시 */}
                {selectedHistory.summary ? (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-accent font-semibold mb-2">✨ AI 요약</p>
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {selectedHistory.summary
                        .replace(/##\s*/g, '')
                        .replace(/\*\*/g, '')
                        .replace(/\*/g, '• ')
                        .trim()}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <p className="text-sm text-text-tertiary">요약 정보가 없습니다</p>
                  </div>
                )}
              </div>

              {/* 푸터 */}
              <div className="p-5 border-t border-gray-100">
                <button
                  onClick={() => setSelectedHistory(null)}
                  className="w-full py-3 bg-accent text-white rounded-xl font-semibold"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
