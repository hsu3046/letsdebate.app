// src/lib/prompts/v4/judge/prompt.ts

/**
 * Judge Prompt Generator
 * AI 심판을 위한 배치 채점 프롬프트 생성
 */

import type { JudgeInput } from './types';

/**
 * 배치 채점 프롬프트 생성
 * @param historyContext 전체 대화 맥락 (요약본 또는 전문)
 * @param players 각 참가자별 채점 입력 데이터
 */
export function buildBatchJudgePrompt(
  historyContext: string,
  players: JudgeInput[]
): string {
  const criteriaText = players.map(p => `
[TARGET: ${p.modelId}]
- **Their Full Log**:
"""
${p.fullLog.substring(0, 2000)}${p.fullLog.length > 2000 ? '... (truncated)' : ''}
"""
- **REQUIRED Stance (from Director)**: "${p.orders.directorStance}"
- **REQUIRED Angle**: "${p.orders.directorAngle}"
- **Secret Mission**: "${p.orders.secretMission}"
- **Coach Instructions Received**: ${p.orders.coachInstructions.length > 0 ? p.orders.coachInstructions.slice(-3).map(c => `"${c}"`).join(', ') : 'None'}
- **FORBIDDEN Words**: ${JSON.stringify(p.orders.forbiddenWords)}
`).join('\n---\n');

  return `
[SYSTEM ROLE: THE SUPREME AI JUDGE]
You are the impartial judge of an AI Debate. Be critical but fair.
Evaluate each participant based on their debate logs and the orders they received.

---
### 1. DEBATE CONTEXT
${historyContext.substring(0, 3000)}${historyContext.length > 3000 ? '\n... (context truncated)' : ''}

---
### 2. PARTICIPANTS TO EVALUATE
${criteriaText}

---
### 3. SCORING CRITERIA (0-10 each)

| Metric | Weight | What to Evaluate |
|--------|--------|------------------|
| **Logic** | 30% | Logical consistency, evidence, reasoning quality |
| **Persuasion** | 30% | Rhetorical skill, emotional appeal, memorable phrases |
| **Adherence** | 20% | Did they follow Director's stance/angle? Did they execute Coach's instructions? |
| **Flow** | 10% | Did they listen to opponents? Did they reference previous points? |
| **Impact** | 10% | Creativity, boldness, "mic drop" moments |

---
### 4. PENALTY FLAGS

Check for violations and report:
1. **instruction_fail** (bool): True if they clearly ignored Director/Coach orders.
2. **context_fail** (bool): True if they hallucinated, contradicted themselves, or ignored the opponent.
3. **forbidden_word_count** (int): Count exact usages of forbidden words in their log.

---
### 5. OUTPUT FORMAT (JSON ONLY)
Return a valid JSON object. NO markdown code blocks. NO extra text.

{
  "results": [
    {
      "modelId": "participant_name",
      "scores": { "logic": 8, "persuasion": 7, "adherence": 9, "flow": 8, "impact": 7 },
      "penalties": { "instruction_fail": false, "context_fail": false, "forbidden_word_count": 0 },
      "review": "Sharp logic but lacked memorable punch lines."
    }
  ]
}

CRITICAL: 
- Return results for ALL ${players.length} participants. 
- Keep "review" under 15 words.
- **IMPORTANT**: Write "review" in KOREAN (한국어). Example: "논리는 명확했으나 마무리 임팩트가 아쉬웠습니다."
`;
}
