// src/lib/prompts/v4/layers/L3_phase/debate.ts

/**
 * Debate Phase Rules
 * 본론 토론, 반박 - 모드별 목표/행동 지침 분기
 */
export function getDebateRules(mode: '1v1' | 'roundtable'): string {
    // 1. 모드에 따른 목표 설정 (이 부분이 핵심!)
    const objective = mode === '1v1'
        ? "**CURRENT OBJECTIVE**: Dismantle the opponent's logic AND expose the underlying contradiction in their premise."
        : "**CURRENT OBJECTIVE**: Deepen the discussion by adding new perspectives or synthesizing existing ideas.";

    // 2. 모드에 따른 행동 지침 (뉘앙스 차이)
    const actionGuide = mode === '1v1'
        ? "- **ATTACK PREMISE**: Don't just counter-punch. Attack the foundation of their argument.\n    - **NO REPEAT**: Do NOT repeat specific examples/analogies used in previous turns."
        : "- **BUILD & CHALLENGE**: Validate others' points before adding your twist. Challenge ideas, not people.";

    return `
[LAYER 3: PHASE - MID-GAME DEBATE - INTENSIFY]
${objective}

1. **EXECUTE TACTICS**: Strictly follow the engagement protocols defined in **L2 (Tactics)**.

2. **INTERACTION RULES**:
    ${actionGuide}
    - **LISTEN**: Reference specific keywords used by the previous speaker.
    - **NO MONOLOGUE**: Keep it interactive. Do not ignore the flow.

3. **USE THE COACH**: If **L5 (Coach Order)** provides a specific instruction, prioritize it over everything else.

(Tip: Use the "Pivot" technique if you feel the conversation is stalling.)
`;
}
