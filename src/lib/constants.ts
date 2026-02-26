// ===== Constants for 왈가왈부 =====

export const STORAGE_KEYS = {
    THEME: 'walgawalbu-theme',
    DEBATES: 'walgawalbu-debates',
    SETUP: 'walgawalbu-current-setup',
} as const;

// 직업 목록
export const JOBS = [
    'AI 전문가', '스타트업 창업가', '대기업 임원', '투자심사역',
    '대학교수', '정책연구원', '프리랜서', '기자',
    '변호사', '의사', '환경운동가', '노동운동가',
    '철학자', '심리상담사', '경제학자', '사회학자'
] as const;

// 나이대 목록
export const AGES = [
    '20대', '30대', '40대', '50대', '60대'
] as const;

// 논증 스타일 정의
export const ARGUMENT_STYLES = [
    { id: 'analyst', name: '냉철한 분석가', desc: '데이터와 논리로 무장' },
    { id: 'humanist', name: '뜨거운 인본주의자', desc: '인간 가치 중심' },
    { id: 'pragmatist', name: '철저한 실용주의자', desc: '현실성과 실행력' },
    { id: 'reformer', name: '급진적 개혁가', desc: '파괴적 혁신 추구' },
    { id: 'conservative', name: '신중한 보수파', desc: '검증된 것을 지킴' },
    { id: 'advocate', name: '악마의 대변인', desc: '허점을 찌르는 비판가' }
] as const;

// Panelist colors for avatars
export const PANELIST_COLORS = [
    { class: 'panelist-1', hex: '#6366f1' },
    { class: 'panelist-2', hex: '#ec4899' },
    { class: 'panelist-3', hex: '#14b8a6' },
    { class: 'panelist-4', hex: '#f59e0b' },
    { class: 'panelist-5', hex: '#8b5cf6' },
    { class: 'panelist-6', hex: '#06b6d4' },
] as const;

export const HUMAN_COLOR = '#22c55e';

// Avatar letters based on index
export const AVATAR_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Phase labels for Korean display
export const PHASE_LABELS: Record<string, string> = {
    intro: '소개',
    topic: '주제발표',
    opening: '오프닝 토크',
    debate: '자유토론',
    closing: '최후변론',
    summary: '정리',
};

// Default setup values
export const DEFAULT_SETUP = {
    topic: '',
    context: '',
    participantCount: 3,
    turnCount: 3, // 배수: 3=짧게, 5=보통, 8=길게 (실제 턴 = 참가자 수 × 배수)
    progressionMode: 'auto' as const,
    participants: [],
    humanParticipation: false,
    humanName: '',
};

// Default debate state
export const DEFAULT_DEBATE_STATE = {
    isRunning: false,
    isPaused: false,
    isFinished: false,
    wasStopped: false,
    currentPhase: 'intro' as const,
    currentTurn: 1,
    debateTurn: 0,
    totalDebateTurns: 5,
    messages: [],
    showModeratorPanel: false,
    waitingForHumanInput: false,
    humanInputType: null,
    currentTopic: undefined,
    teamAssignments: undefined,
};
