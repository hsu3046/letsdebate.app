'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Pause, Play, Square, X, Send, Edit3, Mic, Loader2, ChevronRight, BarChart3, Heart, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { useApiKeyStore } from '@/store/apiKeyStore';
import { useDebateAI } from '@/hooks/useDebateAI';
import { PHASE_LABELS } from '@/lib/constants';
import { getCharacterById } from '@/lib/characters';
import type { DebateMessage, DebatePhase, InteractionMeta, Topic, Stance, TeamAssignment } from '@/lib/types';
import type { TurnRecord, DirectorOutput } from '@/lib/prompts/v4';
import { INTERACTION_STAMINA } from '@/lib/types';
import { RANDOM_TOPICS } from '@/lib/topics';
import { MiniGaugeBar } from '@/components/debate/GaugeBar';
import { useDebateInitialization } from '@/hooks/useDebateInitialization'; // Import Hook
import StatsPanel from '@/components/debate/StatsPanel';
// 레거시 삭제됨: InteractionAnimation, Typewriter (스트리밍으로 대체)
import { sortParticipantsByModelSpeed } from '@/lib/speakingOrder';  // selectNextSpeaker 제거 (Director로 대체)
import { processNewMessage, resetAnalysis, finalizeAnalysis } from '@/lib/backgroundAnalysis';
import { renderBoldText } from '@/lib/formatBold';
import { PRE_DEBATE_TIPS, POST_DEBATE_TIPS } from '@/lib/loadingTips';

const INTERVENTION_TEMPLATES: Record<string, string[]> = {
    '더 깊이': ['잠깐요, 방금 말씀하신 부분이 정말 흥미롭습니다. 이 논점을 조금 더 깊이 파고들어 볼까요?'],
    '다른 관점': ['지금까지 한쪽 시각이 많이 나왔는데요, 혹시 다른 관점에서 바라보시는 분 계신가요?'],
    '주제 이탈': ['잠시만요! 논의가 약간 옆길로 새는 것 같습니다. 원래 주제로 돌아가볼까요?'],
    '찬성 측': ['찬성 쪽에서 추가로 말씀하실 분 계신가요?'],
    '반대 측': ['반대 쪽에서 반박하실 분 계신가요?'],
    '예시 요청': ['실제 사례나 구체적인 예시가 있으면 좋겠네요.'],
    '다음 주제': ['이 주제에 대해 충분히 논의한 것 같습니다. 다음 논점으로 넘어가볼까요?'],
    '마무리': ['이 논점은 여기서 마무리하고 다음 단계로 진행하겠습니다.'],
};

const PANELIST_BG = ['bg-panelist-1', 'bg-panelist-2', 'bg-panelist-3', 'bg-panelist-4', 'bg-panelist-5', 'bg-panelist-6'];
const PANELIST_BORDER = ['border-l-panelist-1', 'border-l-panelist-2', 'border-l-panelist-3', 'border-l-panelist-4', 'border-l-panelist-5', 'border-l-panelist-6'];

// Director stance를 한글로 변환
const getStanceKorean = (stance?: string): string | null => {
    if (!stance) return null;
    const upper = stance.toUpperCase();
    if (upper === 'PRO') return '찬성';
    if (upper === 'CON') return '반대';
    if (upper === 'A' || upper === 'B') return upper;  // A/B는 그대로
    return null;
};


type ModeratorMessageType = 'intro' | 'post_opening' | 'pre_closing' | 'closing';


export type DebateStep =
    | { type: 'moderator'; phase: DebatePhase; moderatorType: ModeratorMessageType; content?: string; isRedebate?: boolean; previousQuestions?: string[] }
    | { type: 'ai'; phase: DebatePhase; participantIndex: number }
    | { type: 'human'; phase: DebatePhase };

interface ParticipantGaugeState {
    id: string;
    name: string;
    avatarImage: string;
    color: string;
    aiModel: string;
    currentGauge: number;
    maxGauge: number;
    baseRecovery: number;
    totalChars: number;
    isRecovering: boolean;
}

export default function ArenaPage() {
    const router = useRouter();
    const { setup, state, setState, addMessage } = useDebateStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    // initializationRef removed (handled in hook)

    const [showModeratorPanel, setShowModeratorPanel] = useState(false);
    const [showStatsPanel, setShowStatsPanel] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showStopConfirm, setShowStopConfirm] = useState(false);

    // 로딩 팁 상태
    const [loadingTip, setLoadingTip] = useState('');
    // isPreparing, loadingStage -> Moved to connect with hook
    const [judgeStage, setJudgeStage] = useState({ step: 1, text: '' });  // Judge 단계용 상태
    const [currentPhase, setCurrentPhase] = useState<DebatePhase>('intro');
    const [stepIndex, setStepIndex] = useState(0);
    // allSteps -> Moved to connect with hook
    const [messages, setMessages] = useState<DebateMessage[]>([]);
    const [showHumanInput, setShowHumanInput] = useState(false);
    const [isHumanInputCollapsed, setIsHumanInputCollapsed] = useState(false);
    const [humanInputText, setHumanInputText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStreamingText, setCurrentStreamingText] = useState('');
    const [currentStreamingAuthor, setCurrentStreamingAuthor] = useState<string | null>(null);
    const [currentDebateTurn, setCurrentDebateTurn] = useState(0);
    // totalDebateTurns -> Moved to connect with hook
    const [thinkingParticipants, setThinkingParticipants] = useState<Set<number>>(new Set()); // 생각 중인 참가자들
    const [activeStreamingParticipantIndex, setActiveStreamingParticipantIndex] = useState<number | null>(null); // 현재 스트리밍 중인 참가자
    const [isHandRaised, setIsHandRaised] = useState(false);  // 거수 상태
    const [turnsWithoutHumanInput, setTurnsWithoutHumanInput] = useState(0);  // 유저 미발언 턴 수

    // 검색 기능 상태
    const [showSearchBox, setShowSearchBox] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<number[]>([]);  // 일치하는 메시지 인덱스
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);  // 검색 실행 여부
    const [showPassError, setShowPassError] = useState(false);  // 오프닝 패스 에러 표시

    // 디버그 패널 (조건부 렌더링)
    const [showDebugPanel, setShowDebugPanel] = useState(false);

    // 클라이언트 사이드 URL 파라미터 확인
    // BYOK: API 키 스토어
    const getApiKeys = useApiKeyStore((state) => state.getApiKeys);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setShowDebugPanel(process.env.NODE_ENV === 'development');
        }
    }, []);

    const [participantGauges, setParticipantGauges] = useState<ParticipantGaugeState[]>(() => {
        // 초기값에서 바로 계산 (첫 렌더링부터 캐릭터 아이콘 표시)
        if (setup.participants.length === 0) return [];
        return setup.participants.map((p) => {
            const char = getCharacterById(p.id);
            const stats = char?.stats || { maxGauge: 100, baseRecovery: 10, baseConsumption: -10, perCharConsumption: -0.1 };
            return {
                id: p.id,
                name: p.name,
                avatarImage: char?.avatarImage || '/avatars/avatar_chloe.jpeg',
                color: char?.color || '#6366f1',
                aiModel: char?.aiModel || 'AI',
                currentGauge: stats.maxGauge,
                maxGauge: stats.maxGauge,
                baseRecovery: stats.baseRecovery,
                totalChars: 0,
                isRecovering: false,
            };
        });
    });
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
    const [focusedMessageIndex, setFocusedMessageIndex] = useState(0);
    const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // 레거시 삭제됨: interactionAnim 상태 (InteractionAnimation 컴포넌트 제거)

    // 토픽 시스템 상태
    // currentTopic, teamAssignments -> Moved to connect with hook

    // 클로징 병렬 프리페치 (opening은 토론 화면에서 순차 생성)
    const closingPromisesRef = useRef<Map<string, Promise<string | null>>>(new Map());
    const openingSummaryRef = useRef<Map<string, string>>(new Map());  // 참가자별 오프닝 핵심 요약
    const prefetchedModeratorRef = useRef<string | null>(null); // 사회자 프리페치 캐시
    const isProcessingStepRef = useRef<boolean>(false); // 스텝 중복 실행 방지

    // Director 전략 (v4)
    // directorStrategiesRef -> Moved to connect with hook

    // Turn 기록 (Judge 시스템용, v4)
    const [turnRecords, setTurnRecords] = useState<TurnRecord[]>([]);

    // Judge 채점 중 상태 (v4)
    const [isJudging, setIsJudging] = useState(false);
    const [showJudgeOverlay, setShowJudgeOverlay] = useState(false);

    // 현재 스트리밍 중인 메시지 ID 트래킹
    const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

    // 본토론 동적 발언자 선택을 위한 상태 (Option B)
    const [lastSpeakerId, setLastSpeakerId] = useState<string | null>(null);
    const [lastInteraction, setLastInteraction] = useState<{ type: string; target: string | null } | null>(null);

    // --- [HOOK] Debate Initialization ---
    const {
        isPreparing,
        loadingStage,
        currentTopic,
        teamAssignments,
        allSteps,
        totalDebateTurns,
        directorStrategies,
        sortedParticipants
    } = useDebateInitialization({
        participants: setup.participants,
        topicTitle: setup.topic,
        humanParticipation: setup.humanParticipation,
        turnCount: setup.turnCount,
        debateType: setup.debateType || 'vs',
        humanName: setup.humanName
    });

    // Update global store when hook returns data
    useEffect(() => {
        if (currentTopic && teamAssignments.length > 0) {
            setState({ currentTopic, teamAssignments });
        }
    }, [currentTopic, teamAssignments, setState]);

    // Start running when preparation finishes
    useEffect(() => {
        if (!isPreparing && allSteps.length > 0) {
            setState({ isRunning: true, isPaused: false, isFinished: false });
        }
    }, [isPreparing, allSteps, setState]);

    const { generateResponse, streamingText, isLoading } = useDebateAI({
        topic: setup.topic,
        topicData: currentTopic || undefined,
        context: setup.context,
        participants: setup.participants,
        teamAssignments: teamAssignments.length > 0 ? teamAssignments : undefined,
        humanName: setup.humanName,
        debateMode: setup.debateType || 'vs',
    });


    // 참가자 게이지 동기화 (participants 변경 시에만)
    useEffect(() => {
        if (setup.participants.length > 0 && participantGauges.length !== setup.participants.length) {
            const gauges = setup.participants.map((p) => {
                const char = getCharacterById(p.id);
                const stats = char?.stats || { maxGauge: 100, baseRecovery: 10, baseConsumption: -10, perCharConsumption: -0.1 };
                return {
                    id: p.id,
                    name: p.name,
                    avatarImage: char?.avatarImage || '/avatars/avatar_chloe.jpeg',
                    color: char?.color || '#6366f1',
                    aiModel: char?.aiModel || 'AI',
                    currentGauge: stats.maxGauge,
                    maxGauge: stats.maxGauge,
                    baseRecovery: stats.baseRecovery,
                    totalChars: 0,
                    isRecovering: false,
                };
            });
            setParticipantGauges(gauges);
        }
    }, [setup.participants, participantGauges.length]);

    // 일본어 문자 필터링 (히라가나, 가타카나 제거)
    const filterJapanese = (text: string): string => {
        // 히라가나: U+3040-U+309F, 가타카나: U+30A0-U+30FF
        return text.replace(/[\u3040-\u309F\u30A0-\u30FF]/g, '');
    };

    // 스트리밍 텍스트 동기화 (useDebateAI의 streamingText → currentStreamingText)
    useEffect(() => {
        if (streamingText && isLoading) {
            setCurrentStreamingText(filterJapanese(streamingText));
        }
    }, [streamingText, isLoading]);

    // 📌 통합 useEffect 제거됨 -> useDebateInitialization 훅으로 대체

    // 게이지 소모 (발언 후)
    const updateGaugeAfterSpeaking = (participantId: string, charCount: number) => {
        setParticipantGauges(prev => prev.map(p => {
            if (p.id !== participantId) return p;
            const char = getCharacterById(participantId);
            if (!char) return p;

            const stats = char.stats || { baseConsumption: -10, perCharConsumption: -0.1 };

            // 턴당 소모 + 글자당 소모
            const baseConsumption = Math.abs(stats.baseConsumption);
            const charConsumption = (charCount / 100) * Math.abs(stats.perCharConsumption);
            const totalConsumption = baseConsumption + charConsumption;
            const newGauge = Math.max(0, p.currentGauge - totalConsumption);

            return { ...p, currentGauge: newGauge, totalChars: p.totalChars + charCount };
        }));
    };

    // 체력 회복 (다른 사람 발언 시) - 기본 회복 제거됨, 상호작용 기반으로 변경
    // 이 함수는 이제 참조용으로만 유지 (상호작용 시 별도 처리)
    const recoverGaugeForOthers = (speakerId: string) => {
        // 기본 회복 삭제됨 - 상호작용 기반 회복/소모는 handleInteractionStamina에서 처리
        // 발언 중이었던 참가자의 isRecovering 상태만 초기화
        setParticipantGauges(prev => prev.map(p => ({ ...p, isRecovering: false })));
    };

    // D+A Auto-Scroll: 문장 완료 시 화면 밖이면 스크롤
    const handleAutoScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        // 화면 하단에서 200px 이상 떨어져 있으면 스크롤 (더 적극적)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
        if (!isNearBottom) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    // 스트리밍 완료 핸들러
    const handleStreamingComplete = useCallback(() => {
        console.log('[Streaming] Message complete');

        // 거수 상태면 유저 입력창 표시
        if (isHandRaised && setup.humanParticipation && currentPhase === 'debate') {
            setTypingMessageId(null);
            setIsGenerating(false);
            setCurrentStreamingAuthor(null);
            setCurrentStreamingText('');
            setThinkingParticipants(new Set());
            setActiveStreamingParticipantIndex(null);
            setShowHumanInput(true);
            handleAutoScroll(); // 다음 AI 생성 전 스크롤
            return;
        }

        // 상태 정리 먼저
        setTypingMessageId(null);
        setIsGenerating(false);
        setCurrentStreamingAuthor(null);
        setCurrentStreamingText('');
        setThinkingParticipants(new Set());
        setActiveStreamingParticipantIndex(null);

        // 다음 AI 생성 시작 전에 스크롤 (다음 AI 로딩 표시 영역으로)
        handleAutoScroll();

        // 2초 딜레이 후 다음 단계로 진행 (발언 사이 여유 시간)
        setTimeout(() => {
            setStepIndex(prev => prev + 1);
            // 스텝 인덱스 증가 후 중복 실행 방지 해제
            isProcessingStepRef.current = false;
        }, 2000);
    }, [isHandRaised, setup.humanParticipation, currentPhase, handleAutoScroll]);

    const processNextStep = useCallback(async () => {
        // 중복 실행 방지
        if (isProcessingStepRef.current) return;
        // typingMessageId가 있으면 아직 타이핑 중이므로 대기
        if (stepIndex >= allSteps.length || isPaused || isGenerating || typingMessageId) return;

        isProcessingStepRef.current = true;

        const step = allSteps[stepIndex];
        setCurrentPhase(step.phase);

        if (step.type === 'moderator') {
            const msgId = `msg-${Date.now()}`;

            // 사회자는 모든 타입에서 API 호출로 생성
            setIsGenerating(true);
            setCurrentStreamingAuthor('사회자');

            // intro인 경우 약간의 딜레이 추가
            if (step.moderatorType === 'intro') {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            let finalContent = '잠시만 기다려주세요...';  // 기본 fallback

            try {
                const participantInfo = setup.participants.map(p => ({
                    name: p.name,
                    aiModel: getCharacterById(p.id)?.aiModel || 'AI'
                }));

                // 타입별 필요 데이터 구성
                const requestBody: Record<string, unknown> = {
                    type: step.moderatorType,
                    topic: setup.topic,
                    participants: participantInfo,
                    humanName: setup.humanName,
                    apiKeys: getApiKeys(), // BYOK
                };

                // intro: 재토론 정보 추가
                if (step.moderatorType === 'intro') {
                    requestBody.isRedebate = step.isRedebate;
                    requestBody.previousQuestions = step.previousQuestions;
                }

                // post_opening: 오프닝 메시지 전달
                if (step.moderatorType === 'post_opening') {
                    const openingMsgs = messages.filter(m =>
                        m.phase === 'opening' && !m.isModerator
                    );
                    requestBody.recentMessages = openingMsgs.map(m => ({
                        author: m.author,
                        content: m.content
                    }));
                }

                // pre_closing: 자유토론 메시지 전달
                if (step.moderatorType === 'pre_closing') {
                    const debateMsgs = messages.filter(m =>
                        m.phase === 'debate' && !m.isModerator
                    );
                    requestBody.recentMessages = debateMsgs.map(m => ({
                        author: m.author,
                        content: m.content
                    }));
                }

                // closing: 전체 메시지 전달
                if (step.moderatorType === 'closing') {
                    requestBody.allMessages = messages.map(m => ({
                        author: m.author,
                        content: m.content,
                        isModerator: m.isModerator
                    }));
                }

                const response = await fetch('/api/moderator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });

                if (response.ok) {
                    const data = await response.json();
                    finalContent = data.content || finalContent;
                }
            } catch (err) {
                console.error('[Moderator] AI generation failed:', err);
            }

            setIsGenerating(false);
            setCurrentStreamingAuthor(null);

            // 메시지 표시
            const msg: DebateMessage = {
                id: msgId,
                author: '사회자',
                content: finalContent,
                isModerator: true,
                colorClass: 'moderator',
                charCount: finalContent.length,
                timestamp: Date.now(),
                phase: step.phase,
            };
            setMessages(prev => [...prev, msg]);
            addMessage(msg);
            setTypingMessageId(msgId);

            const readDelay = Math.min(3000, Math.max(1000, finalContent.length * 8));
            setTimeout(() => {
                handleStreamingComplete();
            }, readDelay);

            // 🎬 pre_closing 시점에 클로징 병렬 프리페치 시작
            if (step.moderatorType === 'pre_closing') {
                const closingPromises = new Map<string, Promise<string | null>>();
                const aiParticipants = setup.participants.filter(p => p.id !== 'human');

                aiParticipants.forEach((participant) => {
                    const participantStance = teamAssignments?.find(a => a.participantId === participant.id)?.stance;
                    const promise = fetch('/api/debate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'closing',
                            participant,
                            topic: setup.topic,
                            topicData: currentTopic,
                            stance: participantStance,
                            previousMessages: messages.slice(-10).map(m => ({ author: m.author, content: m.content })),
                            allParticipantIds: setup.participants.map(p => p.id),
                            openingSummary: openingSummaryRef.current.get(participant.id),
                            debateMode: setup.debateType || 'vs',
                            apiKeys: getApiKeys(), // BYOK
                        }),
                    })
                        .then(res => res.ok ? res.text() : null)
                        .catch(() => null);

                    closingPromises.set(participant.id, promise);
                });

                closingPromisesRef.current = closingPromises;
                console.log(`[SmartPrefetch] Started ${closingPromises.size} closing AI promises`);
            }
        } else if (step.type === 'human') {
            // 거수 방식: 자동으로 입력창 표시하지 않고, 거수한 경우에만 표시
            if (isHandRaised) {
                setShowHumanInput(true);
            } else {
                // 거수하지 않았으면 스킵
                const newCount = turnsWithoutHumanInput + 1;
                setTurnsWithoutHumanInput(newCount);

                // 5턴 이상 미발언 시 사회자가 유저에게 질문
                if (newCount >= 5 && setup.humanParticipation) {
                    const moderatorQuestion: DebateMessage = {
                        id: `msg-${Date.now()}`,
                        author: '사회자',
                        content: `${setup.humanName || '참가자'} 씨, 지금까지 나눈 이야기에 관해서 의견 있으신가요?`,
                        isModerator: true,
                        colorClass: 'moderator',
                        charCount: 50,
                        timestamp: Date.now(),
                        phase: currentPhase,
                    };
                    setMessages(prev => [...prev, moderatorQuestion]);
                    addMessage(moderatorQuestion);
                    // 잠시 딜레이 후 입력창 표시
                    setTimeout(() => {
                        setShowHumanInput(true);
                    }, 1500);
                    setTurnsWithoutHumanInput(0);  // 카운터 리셋
                } else {
                    setStepIndex(prev => prev + 1);
                }
            }

        } else if (step.type === 'ai') {
            // 본토론 동적 발언자 선택 (participantIndex === -1인 경우)
            let participant: typeof setup.participants[number] | undefined;
            let actualParticipantIndex: number;

            if (step.participantIndex === -1) {
                // v2: Round-Robin 방식 발언자 선택 (본토론)
                // 오프닝 마지막 발언자와 다른 캐릭터가 자유토론 시작하도록
                const openingMessages = messages.filter(m => !m.isModerator && m.phase === 'opening');
                const debateMessages = messages.filter(m => !m.isModerator && m.phase === 'debate');

                // 오프닝 마지막 발언자 인덱스 찾기
                const lastOpeningSpeaker = openingMessages.length > 0
                    ? setup.participants.findIndex(p => p.name === openingMessages[openingMessages.length - 1].author)
                    : -1;

                // offset: 마지막 오프닝 발언자 + 1 (다른 사람부터 시작)
                const offset = lastOpeningSpeaker + 1;
                const speakerIndex = (offset + debateMessages.length) % setup.participants.length;

                actualParticipantIndex = speakerIndex;
                participant = setup.participants[actualParticipantIndex];

                // 디버그 로깅
                console.log(`[Pattern v2] Debate - Selected: ${participant?.name} (index: ${speakerIndex}, lastOpening: ${lastOpeningSpeaker}, debateMsgs: ${debateMessages.length})`);
            } else if (step.participantIndex === -2) {
                // v3: 클로징 동적 발언자 선택
                // 자유토론 마지막 발언자와 다른 캐릭터가 클로징 시작하도록
                const debateMessages = messages.filter(m => !m.isModerator && m.phase === 'debate');
                const closingMessages = messages.filter(m => !m.isModerator && m.phase === 'closing');

                // 자유토론 마지막 발언자 인덱스 찾기
                const lastDebateSpeaker = debateMessages.length > 0
                    ? setup.participants.findIndex(p => p.name === debateMessages[debateMessages.length - 1].author)
                    : 0;

                // offset: 마지막 자유토론 발언자 + 1 (다른 사람부터 시작)
                const offset = lastDebateSpeaker + 1;
                const speakerIndex = (offset + closingMessages.length) % setup.participants.length;

                actualParticipantIndex = speakerIndex;
                participant = setup.participants[actualParticipantIndex];

                // 디버그 로깅
                console.log(`[Pattern v2] Closing - Selected: ${participant?.name} (lastDebate: ${lastDebateSpeaker}, closingMsgs: ${closingMessages.length})`);
            } else {
                // 고정 순서 (오프닝 토크)
                actualParticipantIndex = step.participantIndex;
                participant = setup.participants[actualParticipantIndex];
            }

            // participant가 없으면 스킵 (안전장치)
            if (!participant) {
                console.error(`[processNextStep] participant not found at index ${actualParticipantIndex}`);
                setStepIndex(prev => prev + 1);
                return;
            }

            const char = getCharacterById(participant.id);

            // v3: 체력 시스템 제거됨 - 항상 발언 진행

            setIsGenerating(true);
            setCurrentStreamingAuthor(participant.name);
            setCurrentStreamingText('');
            setThinkingParticipants(prev => new Set(prev).add(actualParticipantIndex));
            setActiveStreamingParticipantIndex(actualParticipantIndex);

            try {
                let content: string;
                let interaction: { type: string; target: string | null } | undefined;

                // 1. 오프닝 phase: 직접 생성 (프리페치 제거)
                if (step.phase === 'opening') {
                    // 오프닝: 직접 생성 (Director 전략 포함)
                    const previousMsgs = messages.map(m => ({ author: m.author, content: m.content }));
                    const result = await generateResponse({
                        type: 'opening',
                        participant,
                        previousMessages: previousMsgs,
                        turnNumber: 1,
                        directorStrategy: directorStrategies?.[participant.name],
                    });
                    content = result.content;
                    interaction = result.interaction;
                    console.log(`[Opening] Generated for ${participant.name} with Director strategy:`, !!directorStrategies?.[participant.name]);
                } else if (step.phase === 'closing') {
                    // 클로징: 프리페치된 Promise 사용 (있으면)
                    const cachedClosing = closingPromisesRef.current.get(participant.id);
                    if (cachedClosing) {
                        const prefetchedContent = await cachedClosing;
                        if (prefetchedContent) {
                            content = prefetchedContent;
                            console.log(`[SmartPrefetch] Using prefetched closing for ${participant.name}`);
                        } else {
                            // 프리페치 실패 시 새로 생성
                            const previousMsgs = messages.map(m => ({ author: m.author, content: m.content }));
                            const result = await generateResponse({
                                type: 'closing',
                                participant,
                                previousMessages: previousMsgs,
                                turnNumber: 1,
                                openingSummary: openingSummaryRef.current.get(participant.id),
                                directorStrategy: directorStrategies?.[participant.name],
                            });
                            content = result.content;
                            interaction = result.interaction;
                        }
                    } else {
                        // 프리페치가 없으면 직접 생성
                        const previousMsgs = messages.map(m => ({ author: m.author, content: m.content }));
                        const result = await generateResponse({
                            type: 'closing',
                            participant,
                            previousMessages: previousMsgs,
                            turnNumber: 1,
                            openingSummary: openingSummaryRef.current.get(participant.id),
                            directorStrategy: directorStrategies?.[participant.name],
                        });
                        content = result.content;
                        interaction = result.interaction;
                    }
                } else {
                    // 본론: generateResponse로 새로 생성
                    const previousMsgs = messages.map(m => ({ author: m.author, content: m.content }));
                    const currentTurnNumber = Math.floor(stepIndex / setup.participants.length) + 1;
                    const result = await generateResponse({
                        type: 'debate',
                        participant,
                        previousMessages: previousMsgs,
                        turnNumber: currentTurnNumber,
                        openingSummary: openingSummaryRef.current.get(participant.id),
                        directorStrategy: directorStrategies?.[participant.name],
                        turnInfo: {
                            current: currentDebateTurn,
                            total: totalDebateTurns,
                        },
                    });
                    content = result.content;
                    interaction = result.interaction;
                }

                // 현재 참가자 게이지 조회
                const currentGauge = participantGauges.find(g => g.id === participant.id);

                // 프론트엔드 즉시 분석 제거됨 (v4 Director 시스템으로 대체)
                // const analysisResult = ...

                // 상호작용 정보 생성 (새 형식)
                const interactionInfo = {
                    type: 'NEUTRAL' as const,
                    target: null,
                    targetName: null,
                    confidence: 0,
                    analyzedAt: Date.now(),
                    source: 'frontend' as const,
                };

                const msgId = `msg-${Date.now()}`;
                const msg: DebateMessage = {
                    id: msgId,
                    author: participant.name,
                    content,
                    isModerator: false,
                    colorClass: participant.colorClass,
                    charCount: content.length,
                    timestamp: Date.now(),
                    phase: step.phase,
                    interaction: interactionInfo,
                };
                setMessages(prev => [...prev, msg]);
                addMessage(msg);

                // 🎯 오프닝 발언이면 핵심 요약 생성 (캐릭터 일관성 유지용)
                if (step.phase === 'opening' && content.length > 30) {
                    fetch('/api/summarize-opening', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            participantId: participant.id,
                            participantName: participant.name,
                            content,
                            apiKeys: getApiKeys(), // BYOK
                        }),
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.summary) {
                                openingSummaryRef.current.set(participant.id, data.summary);
                                console.log(`[Opening Summary] ${participant.name}: ${data.summary}`);
                            }
                        })
                        .catch(err => console.warn('[Opening Summary] Failed:', err));
                }

                // 백그라운드 분석 호출 (3개 메시지마다 자동 실행)
                processNewMessage(msg, [...messages, msg], setup.topic, setup.participants);

                // 3. 스트리밍 트래킹 시작
                // 현재 발언자를 "생각 중" 목록에서 제거 (다른 참가자는 유지)
                setThinkingParticipants(prev => {
                    const next = new Set(prev);
                    next.delete(actualParticipantIndex);
                    return next;
                });
                setTypingMessageId(msgId);

                updateGaugeAfterSpeaking(participant.id, content.length);
                recoverGaugeForOthers(participant.id);

                // 4. 본토론 동적 순서를 위한 상태 업데이트 (Option B)
                setLastSpeakerId(participant.id);
                setLastInteraction(interaction || null);

                // 5. Turn 기록 저장 (Judge 시스템용, v4)
                if (step.phase !== 'intro') {
                    const directorAssignment = directorStrategies?.[participant.name];
                    setTurnRecords(prev => [...prev, {
                        turnNumber: step.phase === 'debate' ? currentDebateTurn : 0,
                        participantId: participant.id,
                        participantName: participant.name,
                        phase: step.phase as 'opening' | 'debate' | 'closing',
                        content: content,
                        directorAssignment: directorAssignment ? {
                            role: directorAssignment.role as 'pro' | 'con' | 'moderator' | 'neutral',
                            stance: directorAssignment.stance,
                            core_slogan: directorAssignment.core_slogan || '',
                            angle: directorAssignment.angle,
                            secret_mission: directorAssignment.secret_mission || '',
                            win_condition: directorAssignment.win_condition,
                        } : undefined,
                        timestamp: Date.now(),
                    }]);
                }

                // 상호작용 기반 체력 변경
                if (interaction && interaction.type !== 'NEUTRAL') {
                    const staminaRules = INTERACTION_STAMINA[interaction.type as keyof typeof INTERACTION_STAMINA];

                    // 발화자 체력 변경
                    setParticipantGauges(prev => prev.map(p => {
                        if (p.id === participant.id) {
                            const newGauge = Math.max(0, Math.min(p.maxGauge, p.currentGauge + staminaRules.speaker));
                            return { ...p, currentGauge: newGauge };
                        }
                        return p;
                    }));

                    // 대상자 상태 및 체력 변경
                    if (interaction.target) {
                        // 레거시 삭제됨: setInteractionAnim 애니메이션 트리거

                        setParticipantGauges(prev => prev.map(p => {
                            if (p.id === interaction.target) {
                                const newGauge = Math.max(0, Math.min(p.maxGauge, p.currentGauge + staminaRules.target));
                                const isRecovering = staminaRules.target > 0;
                                return { ...p, currentGauge: newGauge, isRecovering };
                            }
                            return p;
                        }));

                        // 회복 애니메이션 끄기
                        if (staminaRules.target > 0) {
                            setTimeout(() => {
                                setParticipantGauges(prev => prev.map(p => ({ ...p, isRecovering: false })));
                            }, 1000);
                        }
                    }
                }

                // 4. 스트리밍 완료 후 다음 단계 진행
                // 짧은 딜레이 후 다음 단계로 진행 (스트리밍 깨정 시간)
                setTimeout(() => {
                    handleStreamingComplete();
                }, 500);
            } catch (err) {
                console.error('AI generation error:', err);
                const char = getCharacterById(participant.id);
                const fallback = `안녕하세요, ${participant.name}입니다.\n\n이 주제에 대해 제 관점에서 의견을 드리겠습니다.`;
                const msg: DebateMessage = {
                    id: `msg-${Date.now()}`,
                    author: participant.name,
                    content: fallback,
                    isModerator: false,
                    colorClass: participant.colorClass,
                    charCount: fallback.length,
                    timestamp: Date.now(),
                    phase: step.phase,
                };
                setMessages(prev => [...prev, msg]);
                addMessage(msg);
                updateGaugeAfterSpeaking(participant.id, fallback.length);
                recoverGaugeForOthers(participant.id);
                setStepIndex(prev => prev + 1);
            } finally {
                // typingMessageId가 없으면 에러 경로이므로 cleanup (정상 완료는 handleStreamingComplete에서 처리)
                if (!typingMessageId) {
                    setIsGenerating(false);
                    setCurrentStreamingAuthor(null);
                    setCurrentStreamingText('');
                    setThinkingParticipants(new Set());
                }
            }
        }

        if (stepIndex + 1 >= allSteps.length) {
            // 토론 종료 시: Judge 채점 백그라운드 실행 (오버레이 없이)
            // Judge API 호출을 위한 데이터 준비
            const judgeCall = async () => {
                try {
                    // 전체 대화 맥락 생성
                    const historyContext = messages
                        .filter(m => !m.isModerator)
                        .map(m => `[${m.author}]: ${m.content}`)
                        .join('\n\n');

                    // 참가자별 JudgeInput 생성 (AI 참가자만)
                    const players = setup.participants
                        .filter(p => p.id !== 'human')
                        .map(p => {
                            const participantRecords = turnRecords.filter(r => r.participantName === p.name);
                            const fullLog = participantRecords.map(r => r.content).join('\n\n');
                            const directorData = directorStrategies?.[p.name];

                            return {
                                modelId: p.name,
                                fullLog,
                                orders: {
                                    directorStance: directorData?.stance || '',
                                    directorAngle: directorData?.angle || '',
                                    secretMission: directorData?.secret_mission || '',
                                    coachInstructions: participantRecords
                                        .filter(r => r.coachInstruction)
                                        .map(r => r.coachInstruction?.tactical_instruction || ''),
                                    forbiddenWords: participantRecords
                                        .flatMap(r => r.coachInstruction?.forbidden_keywords || []),
                                },
                            };
                        });

                    console.log('[Judge v4] Starting background Judge API call with', players.length, 'participants');

                    const response = await fetch('/api/judge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ historyContext, players, apiKeys: getApiKeys() }),
                    });

                    if (response.ok) {
                        const judgeResults = await response.json();
                        console.log('[Judge v4] Results:', judgeResults);

                        // localStorage에 저장 (Stats 페이지에서 사용)
                        const cacheKey = `debate-judge-${setup.topic.replace(/\s+/g, '-').substring(0, 50)}`;
                        localStorage.setItem(cacheKey, JSON.stringify(judgeResults));
                    } else {
                        console.error('[Judge v4] API call failed');
                    }
                } catch (error) {
                    console.error('[Judge v4] Error:', error);
                } finally {
                    setIsJudging(false);
                }
            };

            // 백그라운드에서 Judge + Analysis 실행
            setIsJudging(true);  // 아직 채점 중임을 표시 (버튼 클릭 시 확인용)
            judgeCall();

            // 백그라운드 분석 병렬 실행
            finalizeAnalysis(messages, setup.topic, setup.participants)
                .then((analysisResult) => {
                    console.log('[BackgroundAnalysis] Final analysis complete:', analysisResult);
                    setState({
                        isFinished: true,
                        backgroundAnalysis: analysisResult,
                    });
                })
                .catch(() => {
                    setState({ isFinished: true });
                });
        }
    }, [stepIndex, allSteps, isPaused, isGenerating, messages, setup, generateResponse, addMessage, setState, isHandRaised, turnsWithoutHumanInput, currentPhase, typingMessageId, teamAssignments, currentTopic]);

    useEffect(() => {
        if (isLoading && streamingText) {
            setCurrentStreamingText(streamingText);
        }
    }, [isLoading, streamingText]);

    useEffect(() => {
        // 로딩 중이거나 타이핑 중이거나 일시정지 상태면 무시
        if (isPreparing || isPaused || isGenerating || showModeratorPanel || showHumanInput || showStatsPanel || typingMessageId) return;
        if (stepIndex >= allSteps.length) return;
        // 이미 처리 중이면 무시
        if (isProcessingStepRef.current) return;

        const step = allSteps[stepIndex];

        if (step?.phase === 'debate') {
            const debateStepsBeforeCurrent = allSteps.slice(0, stepIndex).filter(s => s.phase === 'debate').length;
            setCurrentDebateTurn(debateStepsBeforeCurrent + 1);
        }

        if (step?.type === 'human') {
            setShowHumanInput(true);
            return;
        }

        // 3) 소개→오프닝 토크 딜레이 증가 (intro 다음 opening 단계 진입 시 3초)
        let delay = 2000;
        if (step?.type === 'moderator') {
            delay = step.phase === 'intro' ? 3500 : 1500; // intro 후 3.5초 대기
        }
        const timer = setTimeout(() => processNextStep(), delay);
        return () => clearTimeout(timer);
    }, [stepIndex, isPreparing, isPaused, isGenerating, showModeratorPanel, showHumanInput, showStatsPanel, typingMessageId, allSteps, processNextStep]);

    useEffect(() => {
        // 새 메시지 시 focusedMessageIndex만 업데이트
        // 실제 스크롤은 onAnimationComplete에서 처리
        if (messages.length > 0 && !isPaused) {
            setFocusedMessageIndex(messages.length - 1);
        }
    }, [messages, isPaused]);

    const handleIntervention = (key: string) => {
        const text = INTERVENTION_TEMPLATES[key]?.[0] || key;
        const msg: DebateMessage = {
            id: `msg-${Date.now()}`,
            author: '사회자',
            content: text,
            isModerator: true,
            colorClass: 'moderator',
            charCount: text.length,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, msg]);
        addMessage(msg);
        setShowModeratorPanel(false);
    };

    const handleHumanSubmit = () => {
        if (!humanInputText.trim()) {
            alert('내용을 입력해주세요!');
            return;
        }
        const msg: DebateMessage = {
            id: `msg-${Date.now()}`,
            author: setup.humanName || '나',
            content: humanInputText.trim(),
            isModerator: false,
            colorClass: 'human',
            charCount: humanInputText.length,
            timestamp: Date.now(),
            phase: 'debate',
        };
        setMessages(prev => [...prev, msg]);
        addMessage(msg);
        setHumanInputText('');
        setShowHumanInput(false);
        setIsHandRaised(false);  // 발언 후 거수 해제
        setTurnsWithoutHumanInput(0);  // 미발언 턴 카운터 리셋

        // 현재 step이 human 타입인 경우에만 stepIndex 증가
        // 거수로 삽입된 경우에도 다음 스텝 진행을 위해 isProcessingStepRef 초기화
        const currentStep = allSteps[stepIndex];
        if (currentStep?.type === 'human') {
            setStepIndex(prev => prev + 1);
        }
        // 거수 발언 후에도 다음 스텝이 진행되도록 processing 플래그 초기화
        isProcessingStepRef.current = false;
    };

    // 패스 버튼: 발언 없이 다음 턴으로
    const handleHumanPass = () => {
        setShowHumanInput(false);
        setIsHandRaised(false);
        setTurnsWithoutHumanInput(prev => prev + 1);

        // 사회자 질문 후 패스한 경우 → "아니오. 괜찮습니다." 메시지 생성
        const currentStep = allSteps[stepIndex];
        if (currentPhase === 'debate' && currentStep?.type !== 'human') {
            // 사회자 질문 후 패스 (즉시 거수가 아닌 경우)
            const passMsg: DebateMessage = {
                id: `msg-${Date.now()}`,
                author: setup.humanName || '나',
                content: '아니오. 괜찮습니다.',
                isModerator: false,
                colorClass: 'human',
                charCount: 12,
                timestamp: Date.now(),
                phase: 'debate',
            };
            setMessages(prev => [...prev, passMsg]);
            addMessage(passMsg);
        }

        // 현재 step이 human 타입인 경우에만 stepIndex 증가
        if (currentStep?.type === 'human') {
            setStepIndex(prev => prev + 1);
        }
    };

    // 거수 토글
    const handleRaiseHand = () => {
        if (!isGenerating && !showHumanInput) {
            setIsHandRaised(!isHandRaised);
        }
    };

    const handleStop = () => {
        setIsPaused(true);
        setShowStopConfirm(true);
    };

    const confirmStop = () => {
        setState({ wasStopped: true, isFinished: true });
        router.push('/');
    };

    const cancelStop = () => {
        setShowStopConfirm(false);
        setIsPaused(false);
    };

    // Judge 완료 시 자동 이동 (오버레이 표시 중인 경우)
    useEffect(() => {
        if (showJudgeOverlay && !isJudging) {
            setShowJudgeOverlay(false);
            router.push('/stats');
        }
    }, [showJudgeOverlay, isJudging, router]);

    // Judge 오버레이 2단계 전환
    useEffect(() => {
        if (showJudgeOverlay) {
            // 오버레이 열릴 때 Stage 1로 초기화
            setJudgeStage({ step: 1, text: '' });

            // 1.5초 후 Stage 2로 전환
            const timer = setTimeout(() => {
                setJudgeStage(prev => ({ ...prev, step: 2 }));
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [showJudgeOverlay]);

    // 로딩 팁 로테이션 효과
    useEffect(() => {
        let interval: NodeJS.Timeout;

        const updateTip = (tips: string[]) => {
            setLoadingTip(tips[Math.floor(Math.random() * tips.length)]);
        };

        if (isPreparing) {
            updateTip(PRE_DEBATE_TIPS);
            interval = setInterval(() => updateTip(PRE_DEBATE_TIPS), 3500);
        } else if (showJudgeOverlay) {
            updateTip(POST_DEBATE_TIPS);
            interval = setInterval(() => updateTip(POST_DEBATE_TIPS), 3500);
        }

        return () => clearInterval(interval);
    }, [isPreparing, showJudgeOverlay]);

    // 검색 기능 함수들
    const handleSearch = () => {
        if (!searchQuery.trim()) return;

        // 토론 일시정지
        setIsPaused(true);

        // 검색 실행
        const results: number[] = [];
        messages.forEach((msg, idx) => {
            if (msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
                results.push(idx);
            }
        });

        setSearchResults(results);
        setCurrentSearchIndex(0);
        setHasSearched(true);  // 검색 실행됨 표시

        // 첫 번째 결과로 스크롤
        if (results.length > 0) {
            scrollToMessage(results[0]);
        }
    };

    const scrollToMessage = (index: number) => {
        const element = document.getElementById(`message-${index}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const goToNextResult = () => {
        if (searchResults.length === 0) return;
        const next = (currentSearchIndex + 1) % searchResults.length;
        setCurrentSearchIndex(next);
        scrollToMessage(searchResults[next]);
    };

    const goToPrevResult = () => {
        if (searchResults.length === 0) return;
        const prev = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
        setCurrentSearchIndex(prev);
        scrollToMessage(searchResults[prev]);
    };

    const highlightText = (text: string): React.ReactNode => {
        // 1. Bold 처리 먼저
        const boldRendered = renderBoldText(text);

        // 2. 검색 하이라이트 (검색 중일 때만)
        if (!searchQuery.trim() || searchResults.length === 0) {
            return boldRendered;
        }

        // Bold 처리된 결과에 검색 하이라이트 적용
        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'gi');

        return boldRendered.map((node, i) => {
            if (typeof node === 'string') {
                const parts = node.split(regex);
                return parts.map((part, j) =>
                    regex.test(part)
                        ? <mark key={`${i}-${j}`} className="bg-yellow-300/40 rounded px-0.5">{part}</mark>
                        : part
                );
            }
            return node;
        }).flat();
    };

    // 상단 진행바 progress - 전체 스텝 기준 (intro, opening, debate, closing 모두 포함)
    const progress = allSteps.length > 0 ? Math.min(100, (stepIndex / allSteps.length) * 100) : 0;

    const getColorIndex = (colorClass: string) => {
        const match = colorClass.match(/panelist-(\d)/);
        return match ? parseInt(match[1]) - 1 : 0;
    };

    const currentStep = allSteps[stepIndex];

    // 인간 유저 통계 계산
    const humanTotalChars = messages
        .filter(m => m.colorClass === 'human')
        .reduce((sum, m) => sum + m.charCount, 0);
    const humanSpeechCount = messages.filter(m => m.colorClass === 'human').length;

    const allParticipantsTotalChars = participantGauges.reduce((sum, pg) => sum + pg.totalChars, 0) + humanTotalChars;

    const statsParticipants = participantGauges.map(p => {
        // 해당 참가자의 발언 횟수 계산
        const speechCount = messages.filter(m => m.author === p.name && !m.isModerator).length;

        // 최근 상호작용 히스토리 (해당 참가자가 발동한 것)
        const recentInteractions = messages
            .filter(m => m.author === p.name && m.interaction)
            .slice(-3)
            .map(m => m.interaction!);

        return {
            name: p.name,
            avatarImage: p.avatarImage,
            color: p.color,
            aiModel: p.aiModel,
            totalChars: p.totalChars,
            speechCount,
            percentage: allParticipantsTotalChars > 0 ? (p.totalChars / allParticipantsTotalChars) * 100 : 0,
            currentGauge: p.currentGauge,
            maxGauge: p.maxGauge,
            isHuman: false,
            recentInteractions,
        };
    });

    // 인간 유저를 statsParticipants에 추가 (발언 여부와 관계없이 항상 표시)
    if (setup.humanParticipation) {
        statsParticipants.push({
            name: setup.humanName || '나',
            avatarImage: '/avatars/user.png',
            color: 'var(--human-color)',
            aiModel: 'Human',
            totalChars: humanTotalChars,
            speechCount: humanSpeechCount,
            percentage: allParticipantsTotalChars > 0 ? (humanTotalChars / allParticipantsTotalChars) * 100 : 0,
            currentGauge: 100,
            maxGauge: 100,
            isHuman: true,
            recentInteractions: [],
        });
    }

    // Phase labels 간소화 (intro/topic 합침)
    const simplifiedPhases: DebatePhase[] = ['intro', 'opening', 'debate', 'summary'];

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* 로딩 화면 - 토론 준비 중 */}
            <AnimatePresence>
                {isPreparing && (
                    <motion.div
                        className="fixed inset-0 z-[200] bg-bg-primary flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="relative w-20 h-20 mb-6">
                            <motion.div
                                className="absolute inset-0 border-4 border-primary-purple/30 rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.div
                                className="absolute inset-2 border-4 border-t-primary-purple border-r-transparent border-b-transparent border-l-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.div
                                className="absolute inset-4 border-4 border-primary-purple/60 border-t-transparent rounded-full"
                                animate={{ rotate: -360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            />
                        </div>
                        {/* 진행률 % */}
                        <motion.p
                            className="text-3xl font-bold text-primary-purple mb-4"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            {Math.floor(loadingStage.progress)}%
                        </motion.p>

                        {/* 팁 표시 영역 */}
                        <div className="h-16 flex items-center justify-center max-w-[80%] text-center">
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={loadingTip}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-base font-medium text-text-secondary"
                                >
                                    <span className="text-primary-purple font-bold mr-2">TIP.</span>
                                    {loadingTip}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                        <motion.p
                            className="text-sm text-text-tertiary mt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            잠시만 기다려 주세요
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Header - 토론 주제는 항상 표시 */}
            <div
                className="shrink-0 bg-bg-secondary border-b border-glass-border"
                style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
            >
                <div className="max-w-[420px] mx-auto p-3 pb-2">
                    <p className="text-[0.625rem] font-medium text-text-tertiary uppercase tracking-wide">토론 주제</p>
                    <h2 className="text-base font-semibold text-text-primary mt-0.5 leading-snug">{setup.topic}</h2>
                </div>
            </div>

            {/* Phase Indicator + Participant Gauges - 접을 수 있음 */}
            <div className="shrink-0 bg-bg-secondary/50 border-b border-glass-border relative">
                <AnimatePresence initial={false}>
                    {!isHeaderCollapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            {/* Progress Bar - Phase별 세그먼트 색상 구분 (3단계) */}
                            <div className="max-w-[420px] mx-auto px-3 pt-2 pb-1">
                                <div className="h-[8px] bg-bg-tertiary rounded-full overflow-hidden flex">
                                    {/* 소개~오프닝 (30%) - 연한 보라 */}
                                    <div
                                        className="h-full transition-all duration-300"
                                        style={{
                                            width: '30%',
                                            background: progress >= 30 ? '#a78bfa' : (progress > 0 ? `linear-gradient(90deg, #a78bfa ${(progress / 30) * 100}%, transparent 0%)` : 'transparent')
                                        }}
                                    />
                                    {/* 본격 토론 (60%) - 진한 보라 */}
                                    <div
                                        className="h-full transition-all duration-300 relative overflow-hidden"
                                        style={{
                                            width: '60%',
                                            background: progress >= 90 ? '#8b5cf6' : (progress > 30 ? `linear-gradient(90deg, #8b5cf6 ${((progress - 30) / 60) * 100}%, transparent 0%)` : 'transparent')
                                        }}
                                    >
                                        {/* Shimmer 효과 - 토론 중에만 */}
                                        {currentPhase === 'debate' && !isPaused && (
                                            <motion.div
                                                className="absolute inset-0"
                                                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                                                animate={{ x: ['-100%', '100%'] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                            />
                                        )}
                                    </div>
                                    {/* 클로징 (10%) - 가장 진한 보라 */}
                                    <div
                                        className="h-full transition-all duration-300"
                                        style={{
                                            width: '10%',
                                            background: progress >= 100 ? '#7c3aed' : (progress > 90 ? `linear-gradient(90deg, #7c3aed ${((progress - 90) / 10) * 100}%, transparent 0%)` : 'transparent')
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Participant Gauges - 유연 레이아웃 (인간 유저 포함) */}
                            {participantGauges.length > 0 && (
                                <div className="max-w-[420px] mx-auto py-2 px-3">
                                    <div className="flex gap-1.5">
                                        {participantGauges.map((p, i) => (
                                            <motion.div
                                                key={p.id}
                                                className={`flex-1 flex flex-col items-center p-2 rounded-xl ${(thinkingParticipants.has(i) || activeStreamingParticipantIndex === i) ? 'bg-white shadow-md' : 'bg-gray-50/80'}`}
                                                animate={{ scale: (thinkingParticipants.has(i) || activeStreamingParticipantIndex === i) ? 1.08 : 1 }}
                                            >
                                                <div className="relative mb-1">
                                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2"
                                                        style={{ borderColor: (thinkingParticipants.has(i) || activeStreamingParticipantIndex === i) ? p.color : 'transparent' }}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={p.avatarImage} alt={p.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <AnimatePresence>
                                                        {(thinkingParticipants.has(i) || activeStreamingParticipantIndex === i) && (
                                                            <motion.div
                                                                key={`pulse-${p.id}`}
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                            >
                                                                {/* 외곽 ring 애니메이션 */}
                                                                <motion.div
                                                                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full border-2 border-accent"
                                                                    animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
                                                                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
                                                                />
                                                                {/* 중앙 펄스 점 */}
                                                                <motion.div
                                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent rounded-full shadow-lg"
                                                                    animate={{ scale: [0.9, 1.4, 0.9] }}
                                                                    transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
                                                                />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    {p.isRecovering && (
                                                        <motion.div
                                                            className="absolute -top-1 -left-1"
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: [1, 0], y: -10 }}
                                                            transition={{ duration: 1 }}
                                                        >
                                                            <Zap size={12} className="text-yellow-500" />
                                                        </motion.div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-text-secondary font-medium truncate max-w-full text-center leading-tight">
                                                    {p.name}
                                                </p>
                                                <span className="text-[9px] text-text-tertiary leading-tight">{p.aiModel}</span>
                                            </motion.div>
                                        ))}
                                        {/* 인간 유저 표시 - 터치로 거수 */}
                                        {setup.humanParticipation && (
                                            <motion.div
                                                className={`flex-1 flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all ${isHandRaised ? 'bg-accent/20 border-2 border-accent' : 'bg-gray-50/80'}`}
                                                onClick={handleRaiseHand}

                                            >
                                                <div className="relative mb-1">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src="/avatars/user.png" alt={setup.humanName || '나'} className="w-full h-full object-cover" />
                                                    </div>
                                                    {/* 거수 아이콘 */}
                                                    {isHandRaised && (
                                                        <motion.div
                                                            className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                        >
                                                            <span className="text-xs">✋</span>
                                                        </motion.div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-text-secondary font-medium truncate max-w-full text-center leading-tight">
                                                    {setup.humanName || '나'}
                                                </p>
                                                <span className="text-[9px] text-text-tertiary leading-tight">Human</span>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 접기/펼치기 버튼 */}
                <button
                    onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                    className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center text-text-tertiary hover:text-accent z-10"
                >
                    {isHeaderCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
            </div>

            {/* Current Phase Label (화면 정중앙) */}
            <div className="shrink-0 py-2 flex flex-col items-center justify-center relative">
                {/* Phase 라벨 - 화면 정중앙 */}
                {currentPhase !== 'summary' ? (
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-semibold text-success bg-success/10">
                        <ChevronRight size={14} /><ChevronRight size={14} className="-ml-2" />
                        {currentPhase === 'topic' ? '소개' : PHASE_LABELS[currentPhase]}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-semibold text-accent bg-accent/10">
                        ✓ 토론 완료
                    </span>
                )}

                {/* 일시정지 중 표시 */}
                {isPaused && !state.isFinished && (
                    <span className="text-[10px] text-danger font-medium mt-0.5">일시정지 중</span>
                )}


            </div>

            {/* Messages - 스크롤바 숨김 */}
            <div
                ref={messagesContainerRef}
                className="flex-1 p-4 overflow-y-auto scrollbar-hide"
                data-lenis-prevent
            >
                {messages.map((msg, msgIndex) => {
                    const colorIdx = msg.isModerator ? 0 : getColorIndex(msg.colorClass);
                    const participant = setup.participants.find(p => p.name === msg.author || p.name === msg.author);
                    const char = participant ? getCharacterById(participant.id) : null;

                    return (
                        <motion.div
                            key={msg.id}
                            id={`message-${msgIndex}`}
                            ref={(el) => { messageRefs.current[msgIndex] = el; }}
                            className={`max-w-[420px] mx-auto mb-6 ${searchResults.includes(msgIndex) ? 'ring-2 ring-yellow-300/50 rounded-lg' : ''}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            onAnimationComplete={() => {
                                // 마지막 메시지이고, 재생 중일 때만 스크롤
                                if (msgIndex === messages.length - 1 && !isPaused) {
                                    // 서브 애니메이션 정착 대기 + 즉시 스크롤로 충돌 방지
                                    setTimeout(() => {
                                        const container = messagesContainerRef.current;
                                        const element = messageRefs.current[msgIndex];
                                        if (container && element) {
                                            const containerRect = container.getBoundingClientRect();
                                            const elementRect = element.getBoundingClientRect();
                                            const scrollTarget = container.scrollTop + (elementRect.top - containerRect.top) - 16;
                                            container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'instant' });
                                        }
                                    }, 100);
                                }
                            }}
                        >
                            <div className="flex items-center gap-2.5 mb-2">
                                {/* 사회자 - 가장 먼저 체크 */}
                                {msg.isModerator ? (
                                    <motion.div
                                        className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src="/avatars/avatar_mc.jpeg" alt="사회자" className="w-full h-full object-cover" />
                                    </motion.div>
                                ) : msg.colorClass === 'human' ? (
                                    <motion.div
                                        className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src="/avatars/user.png" alt={msg.author} className="w-full h-full object-cover" />
                                    </motion.div>
                                ) : char?.avatarImage ? (
                                    <motion.div
                                        className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={char.avatarImage} alt={msg.author} className="w-full h-full object-cover" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md ${PANELIST_BG[colorIdx]}`}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    >
                                        {msg.author.charAt(0)}
                                    </motion.div>
                                )}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[0.9375rem] font-bold text-text-primary">{msg.author}</span>
                                        {/* [비활성화] 상호작용 표시 - Interaction 기능 비활성화로 숨김
                                        {msg.interaction && msg.interaction.type !== 'NEUTRAL' && msg.interaction.targetName && (
                                            <span className={`text-sm font-medium ${msg.interaction.type === 'SUPPORT'
                                                ? 'text-blue-600'
                                                : 'text-orange-600'
                                                }`}>
                                                {msg.interaction.type === 'SUPPORT' ? '💗' : '🔥'} {msg.interaction.targetName}
                                            </span>
                                        )}
                                        */}
                                    </div>
                                    {!msg.isModerator && char && (
                                        <span className="text-xs text-text-tertiary">
                                            {char.aiModel}
                                            {(() => {
                                                const assignment = teamAssignments.find(t => t.participantId === setup.participants.find(p => p.name === msg.author)?.id);
                                                const slogan = assignment?.core_slogan;

                                                // Stance 여부와 관계없이 Slogan이 있으면 표시
                                                if (slogan && slogan.trim().length > 0) {
                                                    return (
                                                        <span className="ml-1 text-accent font-medium">
                                                            {slogan}
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}    </span>
                                    )}
                                </div>
                            </div>
                            <div className={`p-4 glass rounded-xl text-[0.9375rem] leading-relaxed text-text-secondary whitespace-pre-line font-debate ${!msg.isModerator && msg.colorClass !== 'human' ? `border-l-4 ${PANELIST_BORDER[colorIdx]}` : msg.colorClass === 'human' ? 'border-l-4 border-l-human' : ''}`}>
                                {typingMessageId === msg.id && currentStreamingText ? (
                                    <span>{currentStreamingText}</span>
                                ) : (
                                    highlightText(msg.content)
                                )}
                            </div>
                        </motion.div>
                    );
                })}

                {isGenerating && currentStreamingAuthor && (() => {
                    // currentStreamingAuthor 기반으로 인덱스 계산
                    const currentAuthorIndex = participantGauges.findIndex(p => p.name === currentStreamingAuthor);
                    const isModerator = currentStreamingAuthor === '사회자';
                    return (
                        <div className="max-w-[420px] mx-auto mb-6 animate-fade-in">
                            <div className="flex items-center gap-2.5 mb-2">
                                {/* 캐릭터 아이콘 - 사회자/참가자 분기 */}
                                {isModerator ? (
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src="/avatars/avatar_mc.jpeg" alt="사회자" className="w-full h-full object-cover" />
                                    </div>
                                ) : currentAuthorIndex >= 0 && participantGauges[currentAuthorIndex]?.avatarImage ? (
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={participantGauges[currentAuthorIndex].avatarImage} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md ${PANELIST_BG[currentAuthorIndex >= 0 ? currentAuthorIndex % 6 : 0]}`}>
                                        {currentStreamingAuthor.charAt(0)}
                                    </div>
                                )}
                                {/* 캐릭터 이름 + AI 모델명 - 즉시 표시 */}
                                <div className="flex flex-col">
                                    <span className="text-[0.9375rem] font-bold text-text-primary">{currentStreamingAuthor}</span>
                                    {!isModerator && currentAuthorIndex >= 0 && participantGauges[currentAuthorIndex]?.aiModel && (
                                        <span className="text-xs text-text-tertiary">
                                            {participantGauges[currentAuthorIndex].aiModel}
                                            {(() => {
                                                const assignment = teamAssignments.find(t => t.participantId === setup.participants.find(p => p.name === currentStreamingAuthor)?.id);
                                                const slogan = assignment?.core_slogan;

                                                // Stance 여부와 관계없이 Slogan이 있으면 표시
                                                if (slogan && slogan.trim().length > 0) {
                                                    return (
                                                        <span className="ml-1 text-accent font-medium">
                                                            {slogan}
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}        </span>
                                    )}
                                </div>
                            </div>
                            {/* 스트리밍 텍스트 실시간 표시 */}
                            <div className={`p-4 glass rounded-xl ${isModerator ? '' : `border-l-4 ${PANELIST_BORDER[currentAuthorIndex >= 0 ? currentAuthorIndex % 6 : 0]}`} text-[0.9375rem] leading-relaxed text-text-secondary whitespace-pre-line font-debate`}>
                                {/* 스트리밍 텍스트가 있고, 필터링 후에도 내용이 있을 때만 표시 */}
                                {(streamingText || currentStreamingText) && (streamingText || currentStreamingText).trim().length > 0 ? (
                                    <span>{streamingText || currentStreamingText}</span>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map((i) => (
                                                <motion.div
                                                    key={i}
                                                    className="w-2 h-2 bg-accent rounded-full"
                                                    animate={{ y: [0, -6, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-sm text-text-tertiary">생각 중...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                <div ref={messagesEndRef} />
            </div>

            {/* Human Input - 접이식 */}
            {showHumanInput && (
                <div className="shrink-0 bg-bg-secondary border-t border-glass-border">
                    <AnimatePresence mode="wait">
                        {isHumanInputCollapsed ? (
                            <motion.div
                                key="collapsed"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 py-2"
                            >
                                <button
                                    onClick={() => setIsHumanInputCollapsed(false)}
                                    className="w-full max-w-[420px] mx-auto flex items-center justify-between py-3 px-4 bg-accent/10 border border-accent/30 rounded-xl text-sm font-medium text-accent hover:bg-accent/20 transition-all"
                                >
                                    <div className="flex items-center gap-2">
                                        <Edit3 size={16} />
                                        <span>{setup.humanName || '나'}님 차례예요! 탭하여 입력</span>
                                    </div>
                                    <ChevronUp size={18} />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="expanded"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="p-4"
                            >
                                <div className="max-w-[420px] mx-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                            <Edit3 size={16} className="text-accent" />
                                            <span>{setup.humanName || '나'}님의 발언</span>
                                            {showPassError && (
                                                <span className="text-xs text-red-500 font-normal ml-1">오프닝 토크는 패스할 수 없습니다</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsHumanInputCollapsed(true)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-accent transition-all"
                                        >
                                            <ChevronDown size={14} /> 접기
                                        </button>
                                    </div>
                                    <textarea
                                        value={humanInputText}
                                        onChange={(e) => setHumanInputText(e.target.value)}
                                        placeholder="의견을 입력하세요..."
                                        maxLength={500}
                                        className="w-full min-h-[80px] p-3 bg-bg-tertiary border border-glass-border rounded-lg text-sm text-text-primary resize-none focus:outline-none focus:border-accent mb-2"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                if (currentPhase === 'opening') {
                                                    setShowPassError(true);
                                                    setTimeout(() => setShowPassError(false), 3000);
                                                } else {
                                                    handleHumanPass();
                                                }
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${currentPhase === 'opening'
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-200 hover:bg-gray-300 text-text-secondary'
                                                }`}
                                        >
                                            패스
                                        </button>
                                        <button
                                            onClick={handleHumanSubmit}
                                            className="flex-[2] flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent-light rounded-lg text-sm font-semibold text-white transition-all"
                                        >
                                            <Send size={16} /> 발언하기
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Search Box with backdrop for outside click */}
            {showSearchBox && (
                <>
                    {/* Backdrop for outside click to close */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setShowSearchBox(false);
                            setSearchQuery('');
                            setSearchResults([]);
                            setHasSearched(false);
                            setIsPaused(false);  // 토론 자동 재개
                        }}
                    />
                    <div className="shrink-0 bg-bg-secondary border-t border-glass-border relative z-50">
                        <div className="max-w-[420px] mx-auto p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Search size={16} className="text-accent" />
                                <span className="text-sm font-semibold text-text-primary">토론 내용 검색</span>
                                {searchResults.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={goToPrevResult}
                                            className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-accent transition-all"
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <span className="text-xs text-text-tertiary">
                                            {currentSearchIndex + 1}/{searchResults.length}
                                        </span>
                                        <button
                                            onClick={goToNextResult}
                                            className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-accent transition-all"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                )}
                                {hasSearched && searchResults.length === 0 && (
                                    <span className="text-xs text-red-500">일치하는 항목 없음</span>
                                )}
                                {/* X 닫기 버튼 - 항상 오른쪽 끝에 배치 */}
                                <button
                                    onClick={() => {
                                        setShowSearchBox(false);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setHasSearched(false);
                                        setIsPaused(false);  // 토론 자동 재개
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-red-500 transition-all ml-auto"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="검색어를 입력하세요..."
                                    className="flex-1 px-3 py-2 bg-bg-tertiary border border-glass-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSearch}
                                    className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium"
                                >
                                    검색
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Moderator Panel */}
            {showModeratorPanel && (
                <div className="shrink-0 p-4 bg-bg-secondary border-t border-glass-border">
                    <div className="max-w-[420px] mx-auto">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                <Mic size={16} className="text-accent" /> 사회자 개입
                            </div>
                            <button
                                onClick={() => setShowModeratorPanel(false)}
                                className="w-7 h-7 flex items-center justify-center bg-bg-tertiary border border-glass-border rounded text-text-tertiary hover:bg-danger hover:border-danger hover:text-white transition-all"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.keys(INTERVENTION_TEMPLATES).map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handleIntervention(key)}
                                    className="px-3 py-2 glass rounded text-xs text-text-secondary hover:border-accent hover:text-accent hover:bg-accent-bg transition-all"
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )
            }

            {/* Controls */}
            <div className="shrink-0 p-4 bg-bg-secondary border-t border-glass-border">
                <div className="max-w-[420px] mx-auto">
                    {!state.isFinished ? (
                        <div className="flex gap-2">
                            <motion.button
                                onClick={() => {
                                    if (showHumanInput) return;
                                    setShowSearchBox(!showSearchBox);
                                    if (showSearchBox) {
                                        setShowSearchBox(false);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setHasSearched(false);
                                        setIsPaused(false);
                                    } else {
                                        setShowSearchBox(true);
                                        setIsPaused(true);
                                    }
                                }}
                                disabled={showHumanInput}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 glass rounded-lg text-sm font-medium transition-all ${showSearchBox ? 'text-accent border-accent' : 'text-text-secondary'} ${showHumanInput ? 'opacity-40 cursor-not-allowed' : ''}`}
                                whileHover={!showHumanInput ? { scale: 1.02 } : {}}
                                whileTap={!showHumanInput ? { scale: 0.97 } : {}}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Search size={18} /> 검색하기
                            </motion.button>
                            <motion.button
                                onClick={() => { setIsPaused(true); setShowStatsPanel(true); }}
                                className="w-12 glass rounded-lg flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <BarChart3 size={18} />
                            </motion.button>
                            <motion.button
                                onClick={() => setIsPaused(!isPaused)}
                                className={`w-12 glass rounded-lg flex items-center justify-center transition-all ${isPaused ? 'text-accent border-accent' : 'text-text-secondary hover:text-accent hover:border-accent'}`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                {isPaused ? <Play size={18} /> : <Pause size={18} />}
                            </motion.button>
                            <motion.button
                                onClick={handleStop}
                                className="w-12 glass rounded-lg flex items-center justify-center text-danger hover:bg-danger hover:text-white hover:border-danger transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Square size={18} />
                            </motion.button>
                        </div>
                    ) : (
                        <motion.button
                            onClick={() => {
                                if (isJudging) {
                                    // Judge가 아직 실행 중이면 오버레이 표시하고 완료 대기
                                    setShowJudgeOverlay(true);
                                    const waitForJudge = setInterval(() => {
                                        // Note: this checks the latest state via closure
                                    }, 100);
                                    // Use effect will handle navigation when isJudging becomes false
                                } else {
                                    // 이미 완료됐으면 바로 이동
                                    router.push('/stats');
                                }
                            }}
                            className="w-full py-4 bg-accent rounded-xl text-[0.9375rem] font-semibold text-white shadow-[0_4px_20px_rgba(63,238,174,0.3)]"
                        >
                            토론 완료
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Stats Panel */}
            <StatsPanel
                isOpen={showStatsPanel}
                onClose={() => { setShowStatsPanel(false); setIsPaused(false); }}
                participants={statsParticipants}
                totalTurns={allSteps.length}
                currentTurn={stepIndex}
                currentPhase={currentPhase}
            />

            {/* Stop Confirmation Modal */}
            <AnimatePresence>
                {showStopConfirm && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={cancelStop}
                    >
                        <motion.div
                            className="w-full max-w-[320px] bg-bg-secondary rounded-2xl p-6 shadow-2xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-text-primary mb-2 text-center">토론 종료</h3>
                            <p className="text-sm text-text-secondary mb-6 text-center">토론을 종료하시겠습니까?</p>
                            <div className="flex gap-3">
                                <button onClick={cancelStop} className="flex-1 py-3 glass rounded-xl text-sm font-semibold text-text-secondary">계속하기</button>
                                <button onClick={confirmStop} className="flex-1 py-3 bg-danger rounded-xl text-sm font-semibold text-white">종료하기</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Judge 채점 오버레이 */}
            <AnimatePresence>
                {showJudgeOverlay && (
                    <motion.div
                        className="fixed inset-0 z-[200] bg-bg-primary flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="relative w-20 h-20 mb-6">
                            <motion.div
                                className="absolute inset-0 border-4 border-amber-400/30 rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.div
                                className="absolute inset-2 border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.div
                                className="absolute inset-4 border-4 border-amber-400/60 border-t-transparent rounded-full"
                                animate={{ rotate: -360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            />
                        </div>
                        <div className="h-20 flex flex-col items-center justify-center max-w-[80%] text-center mt-6">
                            <h3 className="text-lg font-bold text-text-primary mb-3">AI 심판이 채점 중입니다...</h3>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={loadingTip}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-sm font-medium text-text-secondary"
                                >
                                    <span className="text-amber-500 font-bold mr-2">TIP.</span>
                                    {loadingTip}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 레거시 삭제됨: InteractionAnimation */}
        </div >
    );
}
