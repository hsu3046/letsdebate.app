export interface ParsedSummary {
    conclusion: string;
    openQuestions: string[];
}

export function parseSummary(text: string): ParsedSummary {
    if (!text) {
        return { conclusion: '', openQuestions: [] };
    }

    let conclusion = text;
    const openQuestions: string[] = [];

    // "더 생각해볼 질문" 섹션 찾기
    // 패턴: **더 생각해볼 질문** ... (질문들) ... 다음 섹션 또는 끝
    const questionSectionRegex = /\*\*더 생각해볼 질문\*\*([\s\S]*?)(?=\*\*|$)/;
    const match = text.match(questionSectionRegex);

    if (match) {
        const sectionContent = match[1];

        // 질문 추출 (숫자 목록 또는 글머리 기호)
        const lines = sectionContent.split('\n');
        lines.forEach(line => {
            const cleanLine = line.trim();
            // 1. 질문, - 질문, • 질문 등 매칭
            const questionMatch = cleanLine.match(/^(\d+\.|-|•)\s*(.+)$/);
            if (questionMatch) {
                openQuestions.push(questionMatch[2].trim());
            }
        });

        // 원본 텍스트에서 해당 섹션 제거 (선택 사항: UI에서 중복 표시 막기 위해 제거)
        // 정규식으로 해당 섹션 전체 제거 (제목 포함)
        conclusion = text.replace(questionSectionRegex, '').trim();

        // 연속된 줄바꿈 정리
        conclusion = conclusion.replace(/\n{3,}/g, '\n\n');
    }

    // 만약 질문이 JSON 배열 형식이면 (혹시 몰라 대비)
    if (openQuestions.length === 0) {
        // [ "질문1", "질문2" ] 패턴 시도
        const jsonMatch = text.match(/\[\s*".*?"\s*(,\s*".*?"\s*)*\]/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    parsed.forEach(q => openQuestions.push(String(q)));
                }
            } catch (e) {
                // ignore
            }
        }
    }

    return {
        conclusion,
        openQuestions
    };
}
