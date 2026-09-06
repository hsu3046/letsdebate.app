import type { Topic } from './types';

export const TOPIC_CATEGORIES = ['전체', 'AI와 미래', '사회와 일', '관계와 일상', '생각과 철학'] as const;
export type TopicCategory = typeof TOPIC_CATEGORIES[number];

export function getTopicCategory(topic: Topic): Exclude<TopicCategory, '전체'> {
    if (topic.id === 95) return '관계와 일상';
    if (/AI|인공지능|로봇|기술|우주|외계|타임머신|인터넷|SNS|발명|가상/.test(topic.title)) return 'AI와 미래';
    if (/사회|직장|근무|조직|기업|일자리|노동|교육|학교|경제|소득|빈곤|가난|법|정치|기후|환경|지구|범죄|정부|세금|운전|문화|리더|국가/.test(topic.title)) return '사회와 일';
    if (/사랑|우정|친구|관계|결혼|가족|자녀|반려|행복|인맥|연애|여행|외모/.test(topic.title)) return '관계와 일상';
    return '생각과 철학';
}

export const TOPIC_TYPE_LABELS: Record<Topic['type'], string> = {
    PROS_CONS: '찬반 토론', A_VS_B: '양자택일', OPEN_ENDED: '자유 토론',
};

export const FEATURED_TOPIC_IDS = [85, 88, 95];
export const AVAILABLE_CHARACTER_IDS = ['henry', 'sophie', 'victor', 'leo', 'max'];
export const CHARACTER_TAGLINES: Record<string, string> = {
    henry: '연결하는 통찰', sophie: '섬세한 시선', victor: '균형 잡힌 논리', leo: '거침없는 한마디', max: '빈틈없는 추론',
};
