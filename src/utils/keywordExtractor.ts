// src/utils/keywordExtractor.ts

import { analyzeMorphemes, extractKeywordNouns } from '@/lib/bareun';

// =============================================================================
// 1. 설정 및 상수 정의
// =============================================================================

// 분석에서 아예 제외할 고정적인 이름들 (캐릭터, 사회자 등)
const FIXED_EXCLUDES = new Set([
    // 캐릭터 8종
    "클로이", "그렉", "제니", "맥스", "소피", "레오", "헨리", "빅터",
    // 사회자 및 호칭
    "사회자", "사회자님", "진행자", "모더레이터", "AI", "인공지능",
    "당신", "너", "자네", "그쪽", "본인", "저희", "우리"
]);

// 한국어 불용어 (Stopwords) - 문맥상 의미 없는 단어들
const STOP_WORDS = new Set([
    // 대명사/지시어
    "나", "저", "제", "이것", "저것", "그것", "무엇", "어디", "언제", "누구",
    "이거", "저거", "그거", "여기", "저기", "거기", "이런", "저런", "그런", "어떤",

    // 의존 명사 및 단위
    "것", "거", "수", "줄", "적", "때", "곳", "바", "뿐", "만", "만큼",
    "중", "등", "등등", "들", "채", "체", "데", "번", "개", "명", "분",

    // 접속사 및 연결어
    "그리고", "그러나", "하지만", "그런데", "근데", "그래서", "그러니까",
    "따라서", "또는", "혹은", "및", "즉", "게다가", "오히려", "비록", "결국", "아무튼",

    // 부사/감탄사 (감정, 강조, 정도/비교)
    "진짜", "정말", "매우", "너무", "엄청", "아주", "상당히", "특히", "딱", "좀",
    "그냥", "막", "약간", "다소", "거의", "전혀", "별로", "아", "음", "어", "참", "자",
    "가장", "더", "덜", "훨씬", "조금", "많이", "적어도", "완전", "완전히", "절대",

    // 보조 용언 등 서술어
    "있다", "없다", "이다", "아니다", "되다", "하다", "같다", "싶다", "않다",
    "보다", "가다", "오다", "주다", "받다", "말다", "위해", "대해", "통해",

    // 토론 상투어 (의미 없는 메타 언어)
    "생각", "의견", "말씀", "이야기", "얘기", "질문", "답변", "문제", "내용",
    "부분", "가지", "경우", "정도", "때문", "관점", "사실", "관련", "사람",
    "지금", "현재", "오늘", "이번", "지난", "다음", "일단", "우선", "혹시", "역시",

    // 추가 불용어 (동사/형용사 활용형, 자주 나오는 무의미 단어)
    "아니라", "할까요", "있습니다", "없습니다", "합니다", "됩니다", "입니다",
    "봅니다", "겁니다", "됩니까", "습니까", "습니다", "것입니다",
    "한다면", "된다면", "라면", "한다", "된다", "인지", "인가",
    "그래요", "그렇죠", "맞죠", "아닌가요", "아닐까요",
    "어떻게", "왜냐하면", "물론", "아마", "모든", "각자", "각각",

    // 토론에서 자주 등장하지만 의미 없는 일반 단어
    "자리", "모두", "세상", "방법", "방향", "측면", "상황", "점",
    "이유", "필요", "중요", "가능", "불가능", "최소한", "최대한",
    "단순", "복잡", "분명", "확실", "기본", "핵심", "일반", "특별",
    "실제", "실질", "본질", "원칙", "원래", "처음", "마지막", "끝",
    "시작", "과정", "결과", "영향", "변화", "발전", "성장", "선택",
    "비워두", "아이들", "동물", "식물", "자연",  // 특정 주제에서 너무 일반적인 단어

    // 동사/형용사 어간 조각 (형태소 분석 후 남는 무의미한 어근)
    "하지", "않지", "되지", "없지", "있지", "같지", "다르지",
    "보지", "오지", "가지", "주지", "받지", "알지", "모르지",
    "하고", "되고", "하며", "되며", "하면서", "되면서",
    "하는", "되는", "있는", "없는", "같은", "다른",
    "하여", "되어", "하기", "되기", "하니", "되니",
    "해서", "돼서", "해야", "되야", "해도", "되도",
]);

// 동사/형용사 어미 패턴 (단어 끝이 이 패턴이면 제외)
const VERB_ENDING_REGEX = /^.*(합니다|습니다|입니다|겠습니다|하세요|하죠|할까요|인가요|일까요|볼까요|라고|라는|라면|하면|되면|으면|했다|했고|했는데|하는|되는|라서|해서|하여|니까|으니까|아야|어야|해야|잖아|거든|잖아요|거든요|네요|군요)$/;

// 동의어 사전 (이 단어들은 오른쪽 단어로 통합해서 카운팅)
const SYNONYMS: Record<string, string> = {
    "핸드폰": "스마트폰",
    "휴대폰": "스마트폰",
    "모바일": "스마트폰",
    "차량": "자동차",
    "리스크": "위험",
    // 필요시 계속 추가
};

// 조사 제거를 위한 정규식 (끝에 붙은 조사만 떼어냄)
const JOSA_REGEX = /(은|는|이|가|을|를|의|에|에게|에서|로|으로|만|도|과|와|고|하고|나|이나|이나마|한테|께서|조차|마저|밖에|이랑|랑)$/;

// 호칭 접미사 제거를 위한 정규식 (조사 제거 후 적용)
const HONORIFIC_REGEX = /(님|씨|군|양|선생|교수|박사|대표|사장|팀장|부장|과장|차장)$/;


// =============================================================================
// 2. 메인 함수 (bareun.ai 형태소 분석 통합)
// =============================================================================

/**
 * [신규] bareun.ai 형태소 분석을 사용한 키워드 추출 (비동기)
 * API 설정 시 정확한 명사 추출, 미설정 시 기존 방식으로 폴백
 */
export async function extractKeywordsAsync(
    text: string,
    userName: string = "",
    topic: string = "",
    topN: number = 10
): Promise<{ word: string; count: number }[]> {
    // 클라이언트 환경에서는 바로 폴백 사용 (process.env 접근 불가)
    if (typeof window !== 'undefined') {
        console.log('[KeywordExtractor] Client-side, using fallback');
        return extractKeywords(text, userName, topic, topN);
    }

    try {
        // bareun.ai 형태소 분석 수행
        const tokens = await analyzeMorphemes(text);

        // 키워드용 명사만 추출 (NNG + NNP)
        const nouns = extractKeywordNouns(tokens);

        // nouns가 비어있으면 폴백 (API 미설정 시)
        if (nouns.length === 0) {
            console.log('[KeywordExtractor] No nouns extracted, using fallback');
            return extractKeywords(text, userName, topic, topN);
        }

        // 필터링 및 카운팅
        const userTarget = userName.trim().replace(HONORIFIC_REGEX, "");
        const topicBanList = new Set<string>();
        if (topic) {
            const topicTokens = await analyzeMorphemes(topic);
            extractKeywordNouns(topicTokens).forEach((noun: string) => topicBanList.add(noun));
        }

        const wordCounts: Record<string, number> = {};

        for (let noun of nouns) {
            // 동의어 처리
            if (SYNONYMS[noun]) {
                noun = SYNONYMS[noun];
            }

            // 필터링
            if (
                noun.length < 2 ||
                STOP_WORDS.has(noun) ||
                FIXED_EXCLUDES.has(noun) ||
                topicBanList.has(noun) ||
                noun === userTarget ||
                noun === userTarget + "님"
            ) {
                continue;
            }

            wordCounts[noun] = (wordCounts[noun] || 0) + 1;
        }

        // 정렬 및 반환
        return Object.entries(wordCounts)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, topN)
            .map(([word, count]) => ({ word, count }));

    } catch (error) {
        console.error('[KeywordExtractor] bareun.ai failed, using fallback:', error);
        // 폴백: 기존 동기 함수 사용
        return extractKeywords(text, userName, topic, topN);
    }
}


// =============================================================================
// 3. 기존 함수 (폴백용)
// =============================================================================

/**
 * [기존] 토론 로그에서 핵심 키워드를 추출합니다. (동기, 폴백용)
 */
export function extractKeywords(
    text: string,
    userName: string = "",
    topic: string = "",
    topN: number = 10
): { word: string; count: number }[] {
    // 1. 유저 이름 타겟팅 (공백 제거, 호칭 제거도 준비)
    const userTarget = userName.trim();
    const userTargetBase = userTarget.replace(HONORIFIC_REGEX, "");

    // 2. [주제어 필터링] 주제 문장에서 명사만 추출하여 금지어 목록(Set) 생성
    const topicBanList = new Set<string>();
    if (topic) {
        const cleanTopic = topic.replace(/[^\w\s가-힣]/g, " ");
        cleanTopic.split(/\s+/).forEach(word => {
            let root = word.replace(JOSA_REGEX, ""); // 주제어에서도 조사 제거
            root = root.replace(HONORIFIC_REGEX, ""); // 호칭 제거
            if (root.length >= 2) {
                topicBanList.add(root);
            }
        });
    }

    // 3. 텍스트 정제 (특수문자 제거, 이모지 제거)
    const cleanText = text.replace(/[^\w\s가-힣]/g, " ");
    const words = cleanText.split(/\s+/);

    const wordCounts: Record<string, number> = {};

    // 4. 단어 순회 및 카운팅
    words.forEach((word) => {
        // A. 조사 제거 (형태소 분석 흉내)
        let rootWord = word.replace(JOSA_REGEX, "");

        // A-2. 호칭 접미사 제거 (빅터님 → 빅터)
        const rootWordWithoutHonorific = rootWord.replace(HONORIFIC_REGEX, "");

        // B. 동의어 처리 (매핑된 단어가 있으면 교체)
        if (SYNONYMS[rootWord]) {
            rootWord = SYNONYMS[rootWord];
        }

        // C. 필터링 (제외 조건 확인)
        if (
            rootWord.length < 2 ||                   // 1. 한 글자 제외
            STOP_WORDS.has(rootWord) ||              // 2. 불용어 사전에 포함됨
            FIXED_EXCLUDES.has(rootWord) ||          // 3. 캐릭터/사회자 이름 포함됨
            FIXED_EXCLUDES.has(rootWordWithoutHonorific) ||  // 3-2. 호칭 제거 후 캐릭터 이름임 (빅터님 → 빅터)
            topicBanList.has(rootWord) ||            // 4. ★ 주제에 포함된 단어임 (뻔한 결과 방지)
            topicBanList.has(rootWordWithoutHonorific) ||    // 4-2. 호칭 제거 후에도 체크
            rootWord === userTarget ||               // 5. 유저 본인 이름
            rootWord === userTarget + "님" ||        // 6. 유저 호칭
            rootWordWithoutHonorific === userTargetBase ||   // 6-2. 호칭 제거 후 유저 이름
            /^\d+$/.test(rootWord) ||                // 7. 숫자만 있는 경우
            VERB_ENDING_REGEX.test(rootWord)         // 8. 동사/형용사 어미로 끝나는 경우
        ) {
            return; // 카운트하지 않고 건너뜀
        }

        // D. 카운팅
        wordCounts[rootWord] = (wordCounts[rootWord] || 0) + 1;
    });

    // 5. 정렬 (많이 나온 순) 및 Top N 자르기
    return Object.entries(wordCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, topN)
        .map(([word, count]) => ({ word, count }));
}

