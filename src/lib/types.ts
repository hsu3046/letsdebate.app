// ===== Core Types for 왈가왈부 =====

// ===== Character System Types =====

// ===== 토론 주제 타입 =====
export type TopicType = 'PROS_CONS' | 'A_VS_B' | 'OPEN_ENDED';
export type Stance = 'PRO' | 'CON' | 'A' | 'B' | 'NONE';

export interface Topic {
    id: number;
    type: TopicType;
    title: string;
    choices?: { a: string; b: string };  // A_VS_B 전용
    guideline?: string;                  // OPEN_ENDED 전용
}

// 팀 배정 정보
export interface TeamAssignment {
    participantId: string;
    stance: Stance;
    core_slogan?: string;  // UI 표시용 슬로건
}

// ===== 상호작용 타입 (3종류로 단순화) =====
export type InteractionType = 'SUPPORT' | 'OPPOSE' | 'NEUTRAL';

export interface InteractionMeta {
    target: string | null;  // 대상 캐릭터 ID (없으면 null)
    type: InteractionType;
}

export interface AIResponseWithMeta {
    response: string;
    interaction: InteractionMeta;
}

// 상호작용 유형 정의


// 공통 스탯 (모든 캐릭터 동일)
export const DEFAULT_CHARACTER_STATS = {
    maxGauge: 100,
    baseConsumption: 0,        // 기본 소모 삭제
    perCharConsumption: -0.5,  // 글자당 소모 (100자 = -50)
    baseRecovery: 0,           // 기본 회복 삭제 (상호작용 기반)
};

// 상호작용별 체력 변화
export const INTERACTION_STAMINA: Record<InteractionType, { speaker: number; target: number }> = {
    SUPPORT: { speaker: +15, target: +25 },   // 동조: 대상 회복
    OPPOSE: { speaker: -5, target: -25 },     // 반대: 대상 하락
    NEUTRAL: { speaker: 0, target: 0 },       // 중립: 변화 없음
};

export interface CharacterStats {
    maxGauge: number;
    baseConsumption: number;
    perCharConsumption: number;
    baseRecovery: number;
}



// 캐릭터별 사고 과정 (Chain-of-Thought)
export interface ThoughtProcess {
    analyze: string;     // 1단계: 직전 발언 분석
    evaluate: string;    // 2단계: 내 관점에서 판단
    strategize: string;  // 3단계: 반박/동의 전략 수립
    express: string;     // 4단계: 캐릭터 말투로 표현
}

// Character-Model Mapping for 왈가왈부 (types.ts)

// 프롬프트 모듈 타입 (레거시 호환용)
export interface CharacterModules {
    tone: string;
    structure: string;
    argument: string;
    intellect: string;
    interaction: string;
}

export interface CharacterTraits {
    personalityNote: string;
    frequentPhrases: string[];
    professionalTerms: string[];
}

export interface Character {
    id: string;
    name: string;
    avatarImage: string;        // 이미지 파일 경로
    aiModel: string;            // AI 모델명 (Claude, Grok, Gemini, ChatGPT, DeepSeek)
    userDescription?: string;   // 사용자 표시용 소개 (AI 모델 특성)
    stats?: CharacterStats;     // 옵셔널, 없으면 DEFAULT_CHARACTER_STATS 사용
    color: string;              // 캐릭터 테마 색상
    // 캐릭터별 사고 과정 (신규)
    thoughtProcess?: ThoughtProcess;
    // 프롬프트 모듈 설정 (신규)
    promptConfig?: {
        modules: CharacterModules;
        traits: CharacterTraits;
    };
}

// ===== Gauge State for UI =====
export interface GaugeState {
    current: number;
    max: number;
    percentage: number;
    status: 'full' | 'normal' | 'low' | 'depleted';
}

export interface Participant {
    id: string;
    name: string;
    job: string;
    age: string;
    position: 'pro' | 'con' | 'neutral';
    styleId: string;
    styleName: string;
    avatar: string;
    avatarClass: string;
    colorClass: string;
    isHuman?: boolean;
}

export interface DebateSetup {
    topic: string;
    context: string;
    participantCount: number;
    turnCount: number;
    progressionMode: 'auto' | 'manual';
    participants: Participant[];
    humanParticipation: boolean;
    humanName: string;
    selectedCharacterIds?: string[];  // 토론자 선택 페이지의 상태 유지용
    debateType?: 'vs' | 'roundtable';  // 토론 종류
}

export interface DebateMessage {
    id: string;
    author: string;
    content: string;
    isModerator: boolean;
    colorClass: string;
    charCount: number;
    timestamp: number;
    phase?: DebatePhase;
    interaction?: {                   // 상호작용 정보 (표시용)
        type: 'SUPPORT' | 'OPPOSE' | 'NEUTRAL';
        target: string | null;        // 대상 캐릭터 ID
        targetName: string | null;    // 대상 캐릭터 이름
        confidence?: number;          // 분석 신뢰도 (0~1)
        analyzedAt?: number;          // 분석 완료 시간 (중복 방지)
        source?: 'frontend' | 'ai';   // 분석 출처
    };
}

export type DebatePhase = 'intro' | 'topic' | 'opening' | 'debate' | 'closing' | 'summary';

export interface DebateState {
    isRunning: boolean;
    isPaused: boolean;
    isFinished: boolean;
    wasStopped: boolean;
    currentPhase: DebatePhase;
    currentTurn: number;
    debateTurn: number;
    totalDebateTurns: number;
    messages: DebateMessage[];
    showModeratorPanel: boolean;
    waitingForHumanInput: boolean;
    humanInputType: 'opening' | 'debate' | null;
    // 토픽 시스템 (결과 페이지 표시용)
    currentTopic?: Topic;
    teamAssignments?: TeamAssignment[];
    // 백그라운드 분석 결과
    backgroundAnalysis?: {
        keywords: string[];
        highlights: { author: string; quote: string; reason: string }[];
        summary: string;
        lastProcessedIndex: number;
    };
}

export interface DebateHistory {
    id: string;
    topic: string;
    createdAt: number;
    messages: DebateMessage[];
    participants: Participant[];
    wasCompleted: boolean;
    turns: number;
}

// AI Response types
export interface AIResponse {
    content: string;
    participantId?: string;
    phase: DebatePhase;
}

// Dialogue types for debate flow
export interface Dialogue {
    role?: 'moderator';
    participantIndex?: number;
    phase: DebatePhase;
    content: string;
    isHuman?: boolean;
    turnNumber?: number;
}
