/**
 * Prompt System v4 타입 정의
 */

// ===== 기본 타입 =====

// 토론 모드 ('vs'는 '1v1'과 동일, 외부 호환용)
export type DebateMode = '1v1' | 'vs' | 'roundtable';

// 토론 단계
export type PhaseType = 'opening' | 'debate' | 'closing';

// AI 모델 ID
export type ModelId = 'gemini' | 'grok' | 'claude' | 'deepseek' | 'chatgpt';

// 지원 언어
export type SupportedLanguage = 'ko' | 'en' | 'ja';

// 역할 타입
export type RoleType = 'pro' | 'con' | 'moderator' | 'neutral';

// 내부 모드 (L1/L2 레이어용)
export type InternalMode = 'vs' | 'roundtable';

// ===== Director/Coach 타입 =====

/**
 * Director가 로딩 시 생성하는 JSON 결과물 타입
 */
export interface DirectorOutput {
    role: RoleType;           // 역할
    stance: string;           // 구체적인 입장 (예: "강력한 규제 찬성..." - 상세 설명)
    core_slogan: string;      // UI 표시용 짧은 슬로건 (예: "악법도 법이다")
    angle: string;            // 논점 (예: "경제적 관점보다는 윤리적 관점 강조")
    secret_mission: string;   // 비밀 임무 (전술적 목표)
    win_condition: string;    // 승리 조건
}

/**
 * Coach가 매 턴 생성하는 JSON 결과물 타입
 */
export interface CoachOutput {
    target_weakness: string;        // 상대방의 약점
    tactical_instruction: string;   // 구체적인 공격/방어 지시
    forbidden_keywords?: string[];  // 사용 금지어 (중복 방지)
}

/**
 * 턴 진행 상황 정보
 */
export interface TurnInfo {
    current: number;  // 현재 턴 번호 (1-based)
    total: number;    // 전체 턴 수
}

/**
 * 턴별 기록 (Judge 시스템용)
 */
export interface TurnRecord {
    turnNumber: number;
    participantId: string;
    participantName: string;
    phase: PhaseType;
    content: string;
    directorAssignment?: DirectorOutput;
    coachInstruction?: CoachOutput;
    timestamp: number;
}

// ===== 빌더 옵션 =====

/**
 * 전체 프롬프트 조립에 필요한 옵션
 */
export interface PromptBuildOptions {
    modelId: ModelId;                 // AI 모델 ID
    lang: SupportedLanguage;          // 언어 설정
    mode: DebateMode;                 // 1v1 또는 roundtable
    phase: PhaseType;                 // opening, debate, closing
    directorData?: DirectorOutput;    // 로딩 시 생성된 값
    coachData?: CoachOutput;          // 매 턴 생성된 값
    fallbackContext?: string;         // (Deprecated) 구버전 호환용
    referenceContext?: string;        // v4: 항상 전달되는 참조용 대화 로그
    turnInfo?: TurnInfo;              // 턴 진행 상황
}

// ===== 유틸리티 =====

// 모델명 → 모델ID 매핑
export const MODEL_NAME_TO_ID: Record<string, ModelId> = {
    'Gemini': 'gemini',
    'Grok': 'grok',
    'Claude': 'claude',
    'DeepSeek': 'deepseek',
    'ChatGPT': 'chatgpt',
};
