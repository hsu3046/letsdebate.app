// src/lib/prompts/v4/layers/L4_director/index.ts

import type { DirectorOutput } from '../../types';
import { CHARACTERS } from '@/lib/characters';

// ===== MODEL PROFILES =====
const MODEL_PROFILES = {
  grok: "Personality: Rebellious, sarcastic, anti-woke. Strength: Challenging status quo & harsh truths.",
  claude: "Personality: Ethical, nuanced, philosophical. Strength: Safety, human values & deep insight.",
  deepseek: "Personality: Cold, logical, code-centric. Strength: Hard data, efficiency & structural analysis.",
  gemini: "Personality: Adaptive, connecting dots. Strength: Multimodal synthesis & future trends.",
  chatgpt: "Personality: Professional, balanced. Strength: Standard view, comprehensive structure & policy."
};

/**
 * 캐릭터를 ID 또는 이름으로 검색
 * @param idOrName 캐릭터 ID (예: 'henry') 또는 이름 (예: '헨리')
 */
function findCharacter(idOrName: string) {
  return CHARACTERS.find(c => c.id === idOrName || c.name === idOrName);
}

/**
 * [Director System Prompt Generator]
 * Director AI를 호출할 때 사용하는 시스템 프롬프트 생성.
 * @param topic 토론 주제
 * @param participants 참가자 ID 또는 이름 목록
 * @param mode '1v1' | 'vs' | 'roundtable'
 */
export function buildDirectorSystemPrompt(
  topic: string,
  participants: string[],
  mode: '1v1' | 'vs' | 'roundtable'
): string {

  const castingNotes = participants.map(idOrName => {
    // 캐릭터 데이터에서 실제 AI 모델명 가져오기 (ID 또는 이름으로 검색)
    const character = findCharacter(idOrName);
    const aiModel = character?.aiModel?.toLowerCase() || '';

    // AI 모델명으로 프로필 매칭 (예: 'Claude' → 'claude' 프로필)
    const key = Object.keys(MODEL_PROFILES).find(k => aiModel.includes(k)) || 'chatgpt';
    const modelDisplay = character?.aiModel || 'Unknown';

    return `- Model "${idOrName}" (${modelDisplay}): ${MODEL_PROFILES[key as keyof typeof MODEL_PROFILES]}`;
  }).join("\n");

  // --- 모드별 지시 사항 분기 (Strategy Switch) ---
  let strategyInstruction = "";

  // 'vs'와 '1v1' 둘 다 VS 모드로 처리 (정규화)
  if (mode === '1v1' || mode === 'vs') {
    // [Mode A: 1:1 Battle] - 극단적 대립 유도
    strategyInstruction = `
    **STRATEGY: ASYMMETRIC WARFARE (VS MODE)**
    1. **Analyze the Topic**: Identify the "Third Rail" (the most controversial/sensitive sub-issue) of the topic: "${topic}".
    2. **Assign Specific Angles**: Do NOT just say "Economic Angle". Be specific like "The risk of Hyper-Inflation due to UBI".
    3. **Design a Conflict**: Assign roles so that Model A's strength directly attacks Model B's weakness.
    `;
  } else {
    // [Mode B: Roundtable] - 5인 5색 스펙트럼 (Collective Intelligence)
    strategyInstruction = `
    **STRATEGY: 360-DEGREE SPECTRUM**
    - Create a multi-dimensional discussion by assigning distinct intellectual personalities to each participant.
    - Do NOT just split Pro/Con. We need a spectrum of diverse perspectives.
    - Examples of perspectives to assign (based on their character profiles):
      - **The Ethicist**: Focus on moral values and human impact.
      - **The Disruptor**: Focus on radical innovation and challenging norms.
      - **The Logician**: Focus on efficiency, cost-benefit, and hard data.
      - **The Visionary**: Focus on long-term trends and global paradigm shifts.
      - **The Pragmatist**: Focus on feasibility and current regulatory frameworks.
      
    - **SPECIAL INSTRUCTION**: If "Victor" (ChatGPT) is present, consider assigning him the role of **"Active Integrator"**. 
      - His Mission: Connect conflicting ideas (e.g., Data vs. Ethics) into a unified system. 
      - He is the bridge, not just a neutral observer.

    - **Goal**: Ensure no two participants have the same "Lens". Each must attack the topic from a unique angle.
    `;
  }

  return `
[SYSTEM ROLE: THE DEBATE DIRECTOR]
You are the visionary director of a high-stakes AI debate show.
Current Mode: **${mode.toUpperCase()}**

---
### 1. INPUT DATA
- **Topic**: "${topic}"
- **Cast (${participants.length} Models)**:
${castingNotes}

---
### 2. YOUR MISSION
${strategyInstruction}

**CORE TASK: DYNAMIC ROLE ASSIGNMENT**
Analyze the specific nuances of the topic "${topic}" and assign the following to EACH participant:

1. **Role**: Pro / Con / Skeptic / Mediator
2. **Stance**: A sharp, one-sentence core belief.
3. **Angle (Crucial)**: A HIGHLY SPECIFIC lens. (e.g., instead of "Ethics", use "The ethical dilemma of autonomous killing").
4. **Secret Mission**: A specific tactical goal they must achieve.
   - *Bad Example*: "Win the debate."
   - *Good Example*: "Force the opponent to admit that [X] is expensive." or "Use a metaphor about 'Boiling Frog' to explain the danger."

**CRITICAL RULES**:
- Use ONLY the participant names provided: ${participants.join(', ')}.
- Do NOT generate generic roles. Tailor them to the specific topic.

---
### 3. OUTPUT FORMAT (JSON ONLY)
Return a valid JSON object.

{
  "topic_context": "Brief background of the topic (2 sentences).",
  "assignments": {
    "model_id_1": {
      "role": "pro" | "con" | "neutral" | "skeptic", 
      "stance": "Detailed 1-2 sentences explaining their core belief and logic.",
      "core_slogan": "A punchy, short slogan for UI display (Korean: max 20-30 chars). MUST be a complete sentence or catchy phrase. (e.g., '비만세는 현대판 가혹행위입니다', '건강을 위한 작은 투자가 필요합니다')",
      "angle": "The specific lens (e.g., Economic, Ethical, Technical)",
      "secret_mission": "A specific tactical goal (e.g., 'Expose the opponent's lack of data').",      
      "win_condition": "What unique insight must they provide to 'win' the audience?"
    },
    ... (repeat for all participants)
  }
}
`;
}

// ===== DIRECTOR OUTPUT FORMATTER =====

/**
 * [L4: Director's Script]
 * Director AI의 결과를 토론 프롬프트에 주입할 형식으로 변환.
 * Director AI 설정값이 있으면 적용하고, 없으면 '자율 모드'로 작동.
 */
import type { TurnInfo } from '../../types';

/**
 * [L4: Director's Script]
 * Director AI의 결과를 토론 프롬프트에 주입할 형식으로 변환.
 * Director AI 설정값이 있으면 적용하고, 없으면 '자율 모드'로 작동.
 * + Roundtable 모드의 경우, 후반부(Turn 16+)에 '통합(Synthesis)' 지시를 강제 주입.
 */
export function formatDirectorLayer(data?: DirectorOutput, mode?: string, turnInfo?: TurnInfo): string {
  // 1. 정상적인 데이터가 들어왔을 때 (Happy Path)
  if (data) {
    // [Roundtable Phase 2 Logic] - Convergence Force
    if (mode === 'roundtable' && turnInfo && turnInfo.current >= 11) {
      return `
[LAYER 4: ★ ASSIGNED ROLE & STANCE]
You are explicitly assigned to the side: "${data.role.toUpperCase()}".
- Your Core Stance: "${data.stance}"
- Your Strategic Angle: "${data.angle}"

${data.secret_mission ? `- Original Secret Mission: "${data.secret_mission}"` : ''}

[★ PHASE 2: THE GREAT SYNTHESIS (통합 단계)]
We are entering the final stage. The time for divergence is over.
1. **Stop Repeating**: Do not just restate your core stance.
2. **Absorb & Evolve**: Explicitly acknowledge a valid point from an opponent (especially one you disagree with) and merge it into your theory.
3. **Goal**: We need a "Unified Theory". Try to build a bridge between [Logic/Data] and [Ethics/Humanity].
(WARNING: Pure conflict is now a failure. You MUST attempt synthesis.)
`;
    }

    return `
[LAYER 4: ★ ASSIGNED ROLE & STANCE]
You are explicitly assigned to the side: "${data.role.toUpperCase()}".
- Your Core Stance: "${data.stance}"
- Your Strategic Angle: "${data.angle}"
- Your Secret Mission: "${data.secret_mission}"
- Win Condition: "${data.win_condition}"

(WARNING: You must stick to this stance even if it conflicts with your base persona.)
`;
  }

  // 2. 데이터가 없을 때 (Fallback: Safety Net)
  return `
[LAYER 4: ★ ROLE: AUTONOMOUS MODE]
No specific stance has been assigned by the Director.
- Action: Choose the stance (Pro/Con) that best fits your Persona (L1).
- Goal: Defend your chosen stance aggressively using standard debate tactics.
(You are free to decide your own path.)
`;
}
