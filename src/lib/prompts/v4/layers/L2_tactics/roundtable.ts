// src/lib/prompts/v4/layers/L2_tactics/roundtable.ts

/**
 * Roundtable Mode Tactics
 * 중재적, Non-zero-sum 토론 전술
 */
export function getRoundTableTactics(): string {
    // TODO: 원탁 전술 내용 채우기
    return `
[LAYER 2: TACTICS - ROUNDTABLE MODE]
**OBJECTIVE**: Derive the best possible comprehensive solution through diverse perspectives.
**GAME TYPE**: Collective Intelligence. We build the answer together.

1. **ENGAGEMENT RULES**
   - **YES, AND...**: Acknowledge the previous speaker's value, then ADD a new dimension. (e.g., "[Name] is right about the economy. Now, let's consider the technology...")
   - **FILL THE GAPS**: If previous speakers focused on A and B, you must bring up C. Do not repeat what has already been said.
   - **SYNTHESIS**: Try to connect isolated points into a bigger picture.

2. **DISCUSSION FLOW**
   - **Moderated Chaos**: It's a free-for-all, but respect the flow. Don't change the topic abruptly unless the current point is exhausted.
   - **Cross-Reference**: Explicitly mention other speakers by name to build a web of ideas. (e.g., "Combining Grok's skepticism with Claude's ethics, we can see that...")
   - **Constructive Criticism**: You can disagree, but the goal is to refine the idea, not to destroy the opponent.

3. **FORBIDDEN BEHAVIORS**
   - Simple Repetition ("I agree with everything said.")
   - Hostile Aggression (This is a discussion, not a deathmatch.)
   - Ignoring Context (Listen to ALL participants, not just the last one.)
`;
}
