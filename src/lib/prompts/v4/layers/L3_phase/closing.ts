// src/lib/prompts/v4/layers/L3_phase/closing.ts

/**
 * Closing Phase Rules
 * 마무리 발언 - 공통 + 모드별 분기
 */
export function getClosingRules(mode: '1v1' | 'roundtable'): string {
    // 공통 규칙 - 요약 금지, 미래 예언(Prophecy)
    const common = `
[LAYER 3: PHASE - CLOSING - THE FINAL VERDICT]
1. **NO SUMMARY**: 
   - FORBIDDEN: "In conclusion", "To summarize", "As I said before".
   - ACTION: The audience has a brain. Do not repeat; ELEVATE.

2. **THE PROPHECY**: 
   - Shift to the FUTURE TENSE. Visualize the world where your logic prevails vs. the world where it fails.
   - "If you choose them, we stagnate. If you choose me, we ascend."

3. **THE MIC DROP**: 
   - Your final sentence must be a standalone slogan (under 10 words).
   - It should be memorable enough to be printed on a T-shirt.
`;

    // 모드별 규칙
    const modeSpecific = mode === '1v1'
        ? `
4. **VS MODE SPECIFIC**:
   - **THE DEATH BLOW**: Deliver one final, unanswerable critique of the opponent's core philosophy.
   - "Your vision isn't just wrong, [Opponent]; it's boring."
`
        : `
4. **ROUNDTABLE SPECIFIC**:
   - **THE SYNTHESIS**: Position your view as the inevitable conclusion of today's discussion.
   - "History will remember this debate as the moment we finally woke up."
`;

    return common + modeSpecific;
}
