// src/lib/bareun.ts
// bareun.ai 형태소 분석 API 클라이언트

const BAREUN_API_URL = 'https://api.bareun.ai/bareun.LanguageService/AnalyzeSyntax';

// 형태소 분석 결과 인터페이스
interface Morpheme {
    text: string;           // 형태소 텍스트
    tag: string;            // 품사 태그 (NNG, NNP, VV, VA 등)
}

interface Token {
    text: string;           // 원본 어절
    morphemes: Morpheme[];  // 형태소 목록
}

interface BareunResponse {
    sentences: {
        tokens: {
            text: { content: string };
            morphemes: { text: { content: string }; tag: string }[];
        }[];
    }[];
}

// 품사 태그 그룹
const NOUN_TAGS = ['NNG', 'NNP', 'NNB', 'NR', 'NP']; // 전체 명사류 (기존 호환)
const KEYWORD_NOUN_TAGS = ['NNG', 'NNP']; // 키워드 추출용: 일반명사 + 고유명사만 (의존명사/수사/대명사 제외)
const VERB_TAGS = ['VV', 'VA', 'VX', 'VCP', 'VCN']; // 동사, 형용사, 보조용언, 긍정/부정 지정사
const JOSA_TAGS = ['JKS', 'JKC', 'JKG', 'JKO', 'JKB', 'JKV', 'JKQ', 'JX', 'JC']; // 조사
const ADJECTIVE_TAGS = ['VA']; // 형용사

/**
 * bareun.ai API로 형태소 분석 수행
 */
export async function analyzeMorphemes(text: string, apiKey?: string): Promise<Token[]> {
    const key = apiKey || process.env.BAREUN_API_KEY;

    if (!key) {
        console.warn('[Bareun] API key not configured, using fallback');
        return fallbackAnalyze(text);
    }

    try {
        const response = await fetch(BAREUN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': key,
            },
            body: JSON.stringify({
                document: { content: text },
                encoding_type: 'UTF8',
            }),
        });

        if (!response.ok) {
            console.error('[Bareun] API error:', response.status);
            return fallbackAnalyze(text);
        }

        const data: BareunResponse = await response.json();

        // 파싱
        const tokens: Token[] = [];
        for (const sentence of data.sentences || []) {
            for (const token of sentence.tokens || []) {
                tokens.push({
                    text: token.text?.content || '',
                    morphemes: (token.morphemes || []).map(m => ({
                        text: m.text?.content || '',
                        tag: m.tag || '',
                    })),
                });
            }
        }

        return tokens;
    } catch (error) {
        console.error('[Bareun] API call failed:', error);
        return fallbackAnalyze(text);
    }
}

/**
 * API 미설정 시 간단한 폴백 분석
 */
function fallbackAnalyze(text: string): Token[] {
    const words = text.split(/\s+/);
    return words.map(word => ({
        text: word,
        morphemes: [{ text: word, tag: 'UNKNOWN' }],
    }));
}

/**
 * 형태소 분석 결과에서 명사만 추출 (전체 명사류)
 */
export function extractNouns(tokens: Token[]): string[] {
    const nouns: string[] = [];
    for (const token of tokens) {
        for (const morpheme of token.morphemes) {
            if (NOUN_TAGS.includes(morpheme.tag) && morpheme.text.length >= 2) {
                nouns.push(morpheme.text);
            }
        }
    }
    return nouns;
}

/**
 * 키워드 추출용: 일반명사(NNG) + 고유명사(NNP)만 추출
 * 의존명사(NNB), 수사(NR), 대명사(NP)는 제외
 */
export function extractKeywordNouns(tokens: Token[]): string[] {
    const nouns: string[] = [];
    for (const token of tokens) {
        for (const morpheme of token.morphemes) {
            if (KEYWORD_NOUN_TAGS.includes(morpheme.tag) && morpheme.text.length >= 2) {
                nouns.push(morpheme.text);
            }
        }
    }
    return nouns;
}

/**
 * 형태소 분석 결과에서 내용어(명사/동사/형용사) 추출
 */
export function extractContentWords(tokens: Token[]): string[] {
    const contentWords: string[] = [];
    const contentTags = [...NOUN_TAGS, ...VERB_TAGS];

    for (const token of tokens) {
        for (const morpheme of token.morphemes) {
            if (contentTags.includes(morpheme.tag) && morpheme.text.length >= 2) {
                contentWords.push(morpheme.text);
            }
        }
    }
    return contentWords;
}

/**
 * 내용어 밀도 계산 (열정 점수 보조)
 */
export function calculateContentDensity(tokens: Token[]): number {
    let totalMorphemes = 0;
    let contentMorphemes = 0;
    const contentTags = [...NOUN_TAGS, ...VERB_TAGS];

    for (const token of tokens) {
        for (const morpheme of token.morphemes) {
            totalMorphemes++;
            if (contentTags.includes(morpheme.tag)) {
                contentMorphemes++;
            }
        }
    }

    return totalMorphemes > 0 ? contentMorphemes / totalMorphemes : 0;
}

// Named exports
export { NOUN_TAGS, VERB_TAGS, JOSA_TAGS, ADJECTIVE_TAGS };
export type { Token, Morpheme, BareunResponse };
