'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Check, User, HelpCircle, MessageSquare, Shuffle, Heart, Bell, Settings } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { CHARACTERS } from '@/lib/characters';
import FadeInView from '@/components/FadeInView';
import { consumeServerUsage, DAILY_LIMIT } from '@/lib/usageLimit';
import { useApiKeyStore } from '@/store/apiKeyStore';

// MBTI 배지 색상
const MBTI_COLORS: Record<string, string> = {
    'INFJ': '#8b5cf6',
    'ENTP': '#ef4444',
    'ENFP': '#ec4899',
    'ENTJ': '#f59e0b',
};

// 이름에서 호칭 제거하는 함수
const getShortName = (fullName: string) => fullName.split(' ')[0];

// 임시 비표시 캐릭터 (chloe, greg, jenny)
const HIDDEN_CHARACTERS = ['chloe', 'greg', 'jenny'];
const AVAILABLE_CHARACTERS = CHARACTERS.filter(c => !HIDDEN_CHARACTERS.includes(c.id));

export default function ParticipantsPage() {
    const router = useRouter();
    const { setup, setSetup } = useDebateStore();

    // 토론 종류에 따른 설정
    const debateType = setup.debateType || 'vs';
    const isRoundtable = debateType === 'roundtable';

    const [currentIndex, setCurrentIndex] = useState(0);
    // 라운드테이블이면 전체 선택, VS면 스토어 복원
    const [selectedCharacters, setSelectedCharacters] = useState<string[]>(
        isRoundtable
            ? AVAILABLE_CHARACTERS.map(c => c.id)  // 라운드테이블: 5명 전체 선택
            : (setup.selectedCharacterIds || [])
    );
    const [humanParticipation, setHumanParticipation] = useState(setup.humanParticipation || false);
    const [humanName, setHumanName] = useState(setup.humanName || '');


    // 상태 변경 시 스토어에 저장 (뒤로가기/소개글/피드백에서 돌아왔을 때 유지)
    useEffect(() => {
        setSetup({
            selectedCharacterIds: selectedCharacters,
            humanParticipation,
            humanName,
        });
    }, [selectedCharacters, humanParticipation, humanName, setSetup]);

    const currentCharacter = AVAILABLE_CHARACTERS[currentIndex];
    const isSelected = selectedCharacters.includes(currentCharacter.id);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? AVAILABLE_CHARACTERS.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === AVAILABLE_CHARACTERS.length - 1 ? 0 : prev + 1));
    };

    // VS 모드: 사람 포함 시 AI 1명, AI만일 때 2명
    // 라운드테이블: 무조건 5명 고정
    const maxAI = isRoundtable ? 5 : (humanParticipation ? 1 : 2);
    const minAI = isRoundtable ? 5 : (humanParticipation ? 1 : 2);

    const toggleSelect = () => {
        if (isRoundtable) return;  // 라운드테이블은 선택 불가
        if (isSelected) {
            setSelectedCharacters((prev) => prev.filter((id) => id !== currentCharacter.id));
        } else if (selectedCharacters.length < maxAI) {
            setSelectedCharacters((prev) => [...prev, currentCharacter.id]);
        }
    };

    const handleStart = async () => {
        if (selectedCharacters.length < minAI) {
            alert(humanParticipation ? '최소 1명의 AI 토론자를 선택해주세요!' : '최소 2명의 토론자를 선택해주세요!');
            return;
        }

        // BYOK: API 키 검증
        const hasMinimumKey = useApiKeyStore.getState().hasMinimumKey();
        if (!hasMinimumKey) {
            const goToSettings = confirm('API 키가 설정되지 않았습니다.\n설정 페이지에서 최소 Google AI 키를 입력해주세요.\n\n설정 페이지로 이동할까요?');
            if (goToSettings) {
                router.push('/settings');
            }
            return;
        }

        // 서버 API로 사용량 차감 시도 (실패 시 localStorage 폴백)
        const canProceed = await consumeServerUsage();
        if (!canProceed) {
            alert(`오늘의 무료 사용 횟수(${DAILY_LIMIT}회)를 모두 사용했습니다.\n자정(KST) 이후에 다시 이용해주세요!`);
            return;
        }

        const participants = selectedCharacters.map((id, index) => {
            const char = CHARACTERS.find((c) => c.id === id)!;
            const colorClasses = ['bg-panelist-1', 'bg-panelist-2', 'bg-panelist-3', 'bg-panelist-4', 'bg-panelist-5', 'bg-panelist-6'];
            return {
                id: char.id,
                name: char.name,
                job: char.aiModel,
                age: '',
                position: 'neutral' as const,
                styleId: char.id,
                styleName: char.aiModel,
                avatar: char.avatarImage,
                avatarClass: '',
                colorClass: colorClasses[index % colorClasses.length],
            };
        });

        setSetup({
            participants,
            humanParticipation,
            humanName: humanParticipation ? humanName : undefined,
        });

        router.push('/arena');
    };

    const handleRandomSelect = () => {
        if (isRoundtable) return; // 라운드테이블은 랜덤 선택 불가

        const currentSet = new Set(selectedCharacters);
        let newSelection: string[] = [];
        let attempts = 0;

        // 현재 선택과 완전히 같지 않은 조합이 나올 때까지 최대 5번 시도
        // (느낌상 매번 새로운 조합을 주기 위해)
        do {
            // Fisher-Yates Shuffle
            const shuffled = [...AVAILABLE_CHARACTERS];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            newSelection = shuffled.slice(0, maxAI).map((c) => c.id);
            attempts++;

            // AI가 1명인 경우(사람 참가) 등 선택 수가 적을 때는
            // 아예 겹치지 않는 멤버를 우선적으로 찾도록 개선할 수도 있음

        } while (
            attempts < 5 &&
            newSelection.length === selectedCharacters.length &&
            newSelection.every(id => currentSet.has(id))
        );

        setSelectedCharacters(newSelection);
    };

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
        const swipeThreshold = 50;
        if (info.offset.x > swipeThreshold) {
            handlePrev();
        } else if (info.offset.x < -swipeThreshold) {
            handleNext();
        }
    };

    // 캐릭터별 투표 횟수 집계 (localStorage에서)
    const [voteCountMap, setVoteCountMap] = useState<Record<string, number>>({});

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const counts: Record<string, number> = {};

        // localStorage의 모든 투표 기록 스캔
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('debate-vote-')) {
                const votedName = localStorage.getItem(key);
                if (votedName) {
                    // 캐릭터 이름으로 ID 찾기
                    const char = CHARACTERS.find(c => c.name === votedName || c.name.split(' ')[0] === votedName);
                    if (char) {
                        counts[char.id] = (counts[char.id] || 0) + 1;
                    }
                }
            }
        }

        setVoteCountMap(counts);
    }, []);
    return (
        <>
            <section className="min-h-screen p-4 pt-6">
                <div className="max-w-[420px] mx-auto pb-6">
                    {/* Header */}
                    <FadeInView delay={0.1}>
                        <div className="flex items-center mb-6">
                            <Link href="/setup">
                                <motion.div
                                    className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-text-primary"


                                >
                                    <ArrowLeft size={18} />
                                </motion.div>
                            </Link>
                            <h2 className="flex-1 text-center font-title text-2xl">토론자 고르기</h2>
                            <div className="w-10" />
                        </div>
                    </FadeInView>

                    {/* Character Carousel */}
                    <FadeInView delay={0.2}>
                        <div className="relative mb-6">
                            {/* Navigation Arrows */}
                            <button
                                onClick={handlePrev}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:border-accent transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:border-accent transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>

                            {/* Character Card */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentCharacter.id}
                                    initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="mx-12"
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.2}
                                    onDragEnd={handleDragEnd}
                                >
                                    <motion.div
                                        className={`relative bg-white rounded-2xl p-5 shadow-lg border-2 transition-all ${isSelected ? 'border-accent' : 'border-gray-200'}`}
                                        onClick={toggleSelect}
                                        style={{ cursor: isRoundtable ? 'default' : 'pointer' }}
                                    >
                                        {/* Selected Badge */}
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-3 -right-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-lg"
                                            >
                                                <Check size={16} className="text-white" />
                                            </motion.div>
                                        )}


                                        {/* Vote Count Badge */}
                                        {voteCountMap[currentCharacter.id] > 0 && (
                                            <div className={`absolute -top-2 ${isSelected ? 'right-8' : '-right-2'} flex items-center gap-0.5 px-2 py-1 bg-red-100 rounded-full shadow-md`}>
                                                <Heart size={12} className="text-red-500 fill-red-500" />
                                                <span className="text-xs font-bold text-red-600">{voteCountMap[currentCharacter.id]}</span>
                                            </div>
                                        )}

                                        {/* Character Image */}
                                        <div className="relative w-36 h-36 mx-auto mb-4 rounded-2xl overflow-hidden shadow-md">
                                            <Image
                                                src={currentCharacter.avatarImage}
                                                alt={getShortName(currentCharacter.name)}
                                                fill
                                                priority
                                                className="object-cover"
                                                sizes="144px"
                                            />
                                        </div>

                                        {/* Character Name */}
                                        <h3 className="text-xl font-bold text-center text-text-primary mb-1">
                                            {getShortName(currentCharacter.name)}
                                        </h3>

                                        {/* Job - AI Model */}
                                        <p
                                            className="text-sm text-center mb-3 font-bold"
                                            style={{ color: currentCharacter.color }}
                                        >
                                            AI Model: {currentCharacter.aiModel}
                                        </p>

                                        {/* AI Model Logo */}
                                        <div className="flex justify-center mb-4">
                                            <img
                                                src={
                                                    currentCharacter.aiModel === 'Gemini' ? '/logos/gemini.svg' :
                                                        currentCharacter.aiModel === 'Claude' ? '/logos/anthropic.svg' :
                                                            currentCharacter.aiModel === 'ChatGPT' ? '/logos/openai.svg' :
                                                                currentCharacter.aiModel === 'Grok' ? '/logos/xai.svg' :
                                                                    currentCharacter.aiModel === 'DeepSeek' ? '/DeepSeek_logo.svg' :
                                                                        '/logos/gemini.svg'
                                                }
                                                alt={currentCharacter.aiModel}
                                                className="h-6"
                                            />
                                        </div>

                                        {/* 캐릭터 설명 */}
                                        <div className="pt-3 border-t border-gray-100">
                                            <p className="text-[11px] text-text-tertiary leading-relaxed text-center line-clamp-3">
                                                {currentCharacter.userDescription}
                                            </p>
                                        </div>

                                        {/* Tap hint */}
                                        <p className="text-xs text-center text-text-tertiary mt-4 opacity-60">
                                            {isRoundtable
                                                ? '라운드테이블은 5명 전원 참가'
                                                : `탭하여 ${isSelected ? '선택 해제' : '선택'}`}
                                        </p>
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Pagination Dots */}
                            <div className="flex justify-center gap-1.5 mt-4">
                                {AVAILABLE_CHARACTERS.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-accent w-6' : 'bg-gray-300'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </FadeInView>

                    {/* Selected Characters */}
                    <FadeInView delay={0.3}>
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-text-secondary">
                                    선택된 토론자 ({selectedCharacters.length}/{maxAI})
                                    {isRoundtable && <span className="ml-2 text-xs font-normal" style={{ color: '#059669' }}>(고정)</span>}
                                </h3>
                                {!isRoundtable && (
                                    <motion.button
                                        onClick={handleRandomSelect}
                                        className="flex items-center gap-1 text-xs hover:underline"
                                        style={{ color: '#059669' }}
                                        whileHover={{ scale: 1.08 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                    >
                                        <Shuffle size={14} />
                                        랜덤 선택
                                    </motion.button>
                                )}
                            </div>
                            {/* 선택된 토론자 - 3개/줄 그리드 레이아웃 */}
                            <div className="grid grid-cols-3 gap-1.5 min-h-[60px]">
                                {selectedCharacters.length === 0 ? (
                                    <p className="col-span-3 text-sm text-text-tertiary">캐릭터를 선택해주세요 (최소 {minAI}명)</p>
                                ) : (
                                    selectedCharacters.map((id) => {
                                        const char = CHARACTERS.find((c) => c.id === id)!;
                                        return (
                                            <motion.div
                                                key={id}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                className="flex items-center gap-1.5 px-2 py-1.5 bg-white border border-gray-200 rounded-lg"
                                            >
                                                <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0">
                                                    <Image
                                                        src={char.avatarImage}
                                                        alt={getShortName(char.name)}
                                                        fill
                                                        className="object-cover"
                                                        sizes="32px"
                                                    />
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-xs font-semibold leading-tight truncate">{getShortName(char.name)}</span>
                                                    <span className="text-[9px] text-text-tertiary truncate">{char.aiModel}</span>
                                                </div>
                                                {!isRoundtable && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCharacters((prev) => prev.filter((i) => i !== id));
                                                        }}
                                                        className="ml-1 text-text-tertiary hover:text-danger text-lg"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </FadeInView>

                    {/* Human Participation Toggle */}
                    <FadeInView delay={0.4}>
                        <div className="mb-6">
                            <motion.div
                                onClick={() => {
                                    const newValue = !humanParticipation;
                                    // VS 모드: 사람 참가 시 AI 최대 1명이므로, 2명이면 1명으로 축소
                                    if (!isRoundtable && newValue && selectedCharacters.length > 1) {
                                        setSelectedCharacters(prev => prev.slice(0, 1));
                                    }
                                    setHumanParticipation(newValue);
                                }}
                                className={`flex items-center gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all ${humanParticipation ? 'border-accent' : 'border-gray-200'}`}

                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${humanParticipation ? 'bg-accent' : 'bg-gray-100'}`}>
                                    <User size={20} className={humanParticipation ? 'text-white' : 'text-text-tertiary'} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-text-primary">나도 참가할게요!</p>
                                    <p className="text-xs text-text-tertiary">토론에 직접 참여합니다</p>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-all ${humanParticipation ? 'bg-accent' : 'bg-gray-200'}`}>
                                    <motion.div
                                        className="w-5 h-5 bg-white rounded-full shadow mt-1"
                                        animate={{ x: humanParticipation ? 24 : 4 }}
                                    />
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {humanParticipation && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <input
                                            type="text"
                                            value={humanName}
                                            onChange={(e) => setHumanName(e.target.value)}
                                            maxLength={10}
                                            placeholder="닉네임을 입력하세요 (최대 10자)"
                                            className="w-full mt-3 p-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </FadeInView>

                    {/* Start Button */}
                    <FadeInView delay={0.5}>
                        <motion.button
                            onClick={handleStart}
                            disabled={selectedCharacters.length < minAI}
                            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white shadow-lg transition-all ${selectedCharacters.length >= minAI ? 'bg-accent' : 'bg-gray-300 cursor-not-allowed'}`}
                            whileHover={selectedCharacters.length >= minAI ? { scale: 1.02 } : {}}
                            whileTap={selectedCharacters.length >= minAI ? { scale: 0.97 } : {}}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            토론 시작
                            <ArrowRight size={18} />
                        </motion.button>
                    </FadeInView>

                    {/* Footer - Help & Feedback */}
                    <FadeInView delay={0.6}>
                        <footer className="mt-8 pt-5 border-t border-gray-200">
                            <div className="flex justify-center gap-3 mb-4">
                                <Link href="/help">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                                    >
                                        <HelpCircle size={16} />
                                        소개글
                                    </motion.button>
                                </Link>
                                <Link href="/notice">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                                    >
                                        <Bell size={16} />
                                        알림판
                                    </motion.button>
                                </Link>
                                <Link href="/feedback">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                                    >
                                        <MessageSquare size={16} />
                                        피드백
                                    </motion.button>
                                </Link>
                                <Link href="/settings">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-text-secondary hover:border-accent transition-all"
                                    >
                                        <Settings size={16} />
                                        설정
                                    </motion.button>
                                </Link>
                            </div>


                            <p className="text-xs text-text-tertiary/80 text-center leading-relaxed mb-3">
                                이곳의 토론은 정답이 아닌, 다양한 가능성을 탐구하는 과정입니다.
                            </p>
                            <p className="text-[9px] text-text-tertiary/60 text-center leading-relaxed mb-2">
                                본 서비스는 베타 테스트 중인 AI 시뮬레이션입니다. 생성된 콘텐츠는 사실과 다르거나 편향될 수 있으며,
                                왈가왈부는 정보의 정확성이나 신뢰성을 보장하지 않습니다. 특히 법률, 의료, 금융 등 전문적인 조언으로
                                활용하여 발생한 결과에 대해 서비스 제공자는 어떠한 법적 책임도 지지 않습니다.
                            </p>
                            <p className="text-[11px] text-text-secondary font-medium text-center mb-2">
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
                            <p className="text-[0.625rem] text-text-tertiary text-center opacity-70">
                                © 2025 왈가왈부(WalGaWalBu) · v0.2.0
                            </p>
                        </footer>
                    </FadeInView>
                </div>
            </section>
        </>
    );
}
