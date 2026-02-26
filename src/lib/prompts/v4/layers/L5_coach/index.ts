// src/lib/prompts/v4/layers/L5_coach/index.ts

import type { CoachOutput, TurnInfo } from '../../types';

// ===== PLAYER PROFILES =====
const PLAYER_PROFILES = {
  grok: "Rebellious, Sarcastic, Anti-Woke. Loves mocking hypocrisy.",
  claude: "Ethical, Nuanced, Philosophical. Focuses on human values & safety.",
  deepseek: "Cold, Logical, Code-centric. Obsessed with data & structural flaws.",
  gemini: "Adaptive, Storyteller. Connects diverse dots into a narrative.",
  chatgpt: "Professional, Structured. Uses standard balanced arguments."
};

// ===== COACH SYSTEM PROMPT GENERATOR =====

/**
 * [Coach System Prompt Generator]
 * Coach AI에게 "이번 턴에 우리 선수가 뭘 해야 할지" 지시를 요청하는 프롬프트.
 */
export function buildCoachSystemPrompt(
  params: {
    playerModel: string;      // 현재 발언할 AI 모델 (예: 'grok')
    playerRole: string;       // Director가 정해준 역할 (예: 'pro')
    opponentModel: string;    // 직전 발언자 (예: 'claude')
    topic: string;            // 주제
    historySummary: string;   // 직전 2~3턴 대화 내용 (전체 로그 X, 비용 절감)
    phase: 'opening' | 'debate' | 'closing';
    mode: '1v1' | 'roundtable';
    turnInfo?: TurnInfo;      // 턴 진행 상황
  }
): string {

  const { playerModel, playerRole, opponentModel, topic, historySummary, phase, mode, turnInfo } = params;

  // 1. 선수 프로필 가져오기
  const playerKey = Object.keys(PLAYER_PROFILES).find(k => playerModel.includes(k)) || 'chatgpt';
  const playerStyle = PLAYER_PROFILES[playerKey as keyof typeof PLAYER_PROFILES];

  // 2. 턴 진행 상황 분석
  let progressInfo = "Progress: Unknown";
  let stageStrategy = "";
  if (turnInfo && turnInfo.total > 0) {
    const progress = turnInfo.current / turnInfo.total;
    progressInfo = `Progress: Turn ${turnInfo.current}/${turnInfo.total}`;

    if (progress <= 0.33) {
      stageStrategy = "⚡ EARLY STAGE: Establish dominance. Plant key arguments. Probe opponent's weak points.";
    } else if (progress <= 0.66) {
      stageStrategy = "🔥 MID STAGE: Intensify attacks. Counter-punch hard. Build momentum.";
    } else {
      stageStrategy = "🏁 LATE STAGE: Deliver knockout blows. Summarize winning points. No new topics.";
    }
  }

  // 3. 단계별 전략 (Phase Strategy)
  let phaseInstruction = "";
  if (phase === 'opening') {
    phaseInstruction = "Phase: OPENING. Goal: Grab attention instantly. Ignore greetings. State the stance firmly.";
  } else if (phase === 'debate') {
    phaseInstruction = "Phase: DEBATE. Goal: Attack the opponent's last point directly. Find logical fallacies.";
  } else {
    phaseInstruction = "Phase: CLOSING. Goal: Emotional appeal. No new arguments. Summarize why we win.";
  }

  // 4. 모드별 전략 (Mode Strategy)
  let modeInstruction = "";
  if (mode === '1v1') {
    modeInstruction = `Mode: 1v1 DEATHMATCH. Objective: Dominate ${opponentModel}. Do not agree. Be aggressive.`;
  } else {
    modeInstruction = `
    Mode: ROUNDTABLE. 
    **TACTIC: STEELMAN ARGUMENT (강철 인간 논증)**
    - Do not attack the opponent's weakest point.
    - Instead, take their STRONGEST point, admit it has value, and then explain why YOUR solution includes that value but goes further.
    - *Example*: "I accept Max's view on entropy, BUT here is how human will can reverse entropy locally..."
    `;
  }

  return `
[SYSTEM ROLE: ELITE DEBATE COACH]
You are the tactical brain behind an AI debater.
Your client is **${playerModel.toUpperCase()}** (${playerRole}).
Your opponent just spoke. You must tell your client EXACTLY what to say to win this turn.

---
### 1. CONTEXT ANALYSIS
- **Topic**: "${topic}"
- **Your Client's Style**: ${playerStyle} (Leverage this!)
- **${progressInfo}**${stageStrategy ? `\n  - ${stageStrategy}` : ''}
- **Current Situation**:
  - ${modeInstruction}
  - ${phaseInstruction}

---
### 2. RECENT DIALOGUE (Korean)
${historySummary}

---
### 3. KEYWORD BAN PROTOCOL (CRITICAL)
Your goal is to force your client to be creative by banning overused words.
Identify 2-3 **"Crutch Words"** from the [RECENT DIALOGUE] above.

**RULES for Forbidden Keywords:**
1. **Ban Generic Concepts**: If the opponent said "Cost" (비용), ban "비용" so your client MUST use "Expense" (지출) or "Burden" (부담). This makes the debate smarter.
2. **TARGET LANGUAGE ONLY**: The debate is in **Korean**. Output forbidden words in **Korean** (e.g., "경제", "미래", "도파민").
3. **NO META WORDS**: Do NOT ban generic words like "생각", "말씀", "저", "것", "때문".
4. **SUBSTANTIVE ONLY**: Ban specific nouns/verbs that carry meaning (e.g., "호르몬", "규제", "착각").
5. **Protect Proper Nouns**: Do NOT ban specific names or technical terms that have no synonyms (e.g., "Bitcoin", "Seoul", "Doppler Effect").
6. **Target "Lazy" Repetition**: Focus on words that make the speaker sound repetitive or unoriginal.

---
### 4. YOUR MISSION (Thinking Process)
1. **Analyze** the opponent's last argument for *Logical Fallacies*. Name them explicitly (e.g., "Straw Man", "False Dilemma", "Slippery Slope").
2. **Formulate** a counter-strategy that fits your Client's Style AND the current Stage.
3. **Identify** repetitive Korean words to ban.

---
### 5. OUTPUT FORMAT (JSON ONLY)
Return a valid JSON object. No markdown.

{
  "target_weakness": "Quote the weakness in English.",
  "tactical_instruction": "Direct order in English.",
  "forbidden_keywords": ["도파민", "착각", "단순화"]  // MUST BE KOREAN
}
`;
}

// ===== COACH OUTPUT FORMATTER =====

/**
 * [L5: Coach's Order]
 * Coach AI의 결과를 토론 프롬프트에 주입할 형식으로 변환.
 * 코치 지시가 있으면 '명령 수행', 없으면 대화 히스토리로 '자율 판단' 지시.
 * 
 * @param data - Coach AI의 분석 결과 (없으면 fallback)
 * @param fallbackContext - (Deprecated) 구버전 호환용
 * @param referenceContext - v4: 항상 전달되는 참조용 대화 로그
 */
export function formatCoachLayer(data?: CoachOutput, fallbackContext?: string, referenceContext?: string): string {

  // v4: Context Injection (참조용 로그 생성)
  // Coach 지시가 있더라도 문맥 파악을 위해 로그를 제공하되, '참조용'임을 명시하여 지시 우선순위를 지킴.
  const activeContext = referenceContext || fallbackContext;
  const referenceSection = activeContext
    ? `
[LAYER 5.5: CONTEXT REFERENCE]
(NOTE: The following is the recent dialogue log. Use it ONLY to understand the flow and find quotes to refute.)
(CRITICAL: Do NOT let this log dictate your strategy. Your strategy comes from the COACH below.)
--- START OF LOG ---
${activeContext}
--- END OF LOG ---
`
    : '';

  // 1. 코치의 지령이 있을 때 (정상)
  if (data) {
    const forbiddenSection = data.forbidden_keywords && data.forbidden_keywords.length > 0
      ? `\n- **Forbidden Words**: ${data.forbidden_keywords.join(', ')} (DO NOT use these!)`
      : '';

    return `
${referenceSection}
[LAYER 5: 🔥 IMMEDIATE TACTICAL INSTRUCTION]
The debate coach has analyzed the situation:
- Target to Attack: "${data.target_weakness}"
- Action Required: "${data.tactical_instruction}"${forbiddenSection}

(EXECUTE THIS INSTRUCTION IMMEDIATELY IN YOUR NEXT RESPONSE.)
`;
  }

  // 2. 코치 지령이 없을 때 (Fallback - 대화 히스토리 직접 제공)
  return `
[LAYER 5: ⚠ TACTICAL MODE: STANDARD]
No instruction from the Coach. You must analyze the situation yourself.
${referenceSection}
- Tactic: Apply the standard combat protocols defined in L2 (Tactics).
- Focus: Attack the opponent's logic directly. Reference their specific words.
`;
}
