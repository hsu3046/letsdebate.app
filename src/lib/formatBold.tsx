'use client';

import React from 'react';

/**
 * AI의 마크다운 Bold 실수 수정
 * - *** (3개 이상) → ** (2개)
 * - 빈 볼드 제거
 * - 홀수개면 닫기
 */
export function fixMarkdownBold(text: string): string {
    let cleanText = text;

    // *** (3개 이상) → ** (2개)
    cleanText = cleanText.replace(/\*{3,}/g, '**');

    // 빈 볼드 제거 ("****" → "")
    cleanText = cleanText.replace(/\*\*\s*\*\*/g, '');

    // 볼드 안에 공백만 있는 경우 제거 ("** **" → " ")
    cleanText = cleanText.replace(/\*\*\s+\*\*/g, ' ');

    // 홀수개면 닫기
    const count = (cleanText.match(/\*\*/g) || []).length;
    if (count % 2 !== 0) {
        cleanText += '**';
    }

    return cleanText;
}

/**
 * Bold만 파싱하여 React 노드로 렌더링
 * 다른 마크다운(#, -, > 등)은 무시됨
 */
export function renderBoldText(text: string): React.ReactNode[] {
    const fixedText = fixMarkdownBold(text);
    const parts = fixedText.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const content = part.slice(2, -2);
            return React.createElement(
                'strong',
                { key: i, className: 'font-semibold text-text-primary' },
                content
            );
        }
        return part;
    }).filter(part => part !== ''); // 빈 문자열 제거
}
