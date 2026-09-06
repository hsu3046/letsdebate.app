'use client';

import Link from 'next/link';
import { ArrowUpRight, Bookmark } from 'lucide-react';
import ModelAvatar from '@/components/ModelAvatar';
import { useLibraryStore } from '@/store/libraryStore';
import { useHydrated } from '@/hooks/useHydrated';
import { getTopicCategory } from '@/lib/topicCatalog';
import type { Topic } from '@/lib/types';

const categoryStyles = {
    'AI와 미래': { teams: ['openai', 'google'], tone: 'sage' },
    '사회와 일': { teams: ['anthropic', 'deepseek'], tone: 'peach' },
    '관계와 일상': { teams: ['x-ai', 'anthropic'], tone: 'lavender' },
    '생각과 철학': { teams: ['google', 'deepseek'], tone: 'butter' },
};

export default function TopicCard({ topic, featured = false }: { topic: Topic; featured?: boolean }) {
    const { savedTopicIds, toggleTopic } = useLibraryStore();
    const hydrated = useHydrated();
    const saved = hydrated && savedTopicIds.includes(topic.id);
    const category = getTopicCategory(topic);
    const { teams, tone } = categoryStyles[category];
    return (
        <article className={`topic-card ${tone} ${featured ? 'featured' : ''}`}>
            <div className="topic-card-top"><span className="topic-category">{category}</span><button className="icon-button bookmark-button" aria-label={`${topic.title} ${saved ? '저장 해제' : '저장'}`} aria-pressed={saved} onClick={() => toggleTopic(topic.id)}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button></div>
            {featured && <div className="topic-faceoff" aria-hidden="true">
                {teams.map(provider => <ModelAvatar key={provider} id={`${provider}/demo`} large />)}
                <span className="topic-vs">VS</span>
            </div>}
            <Link href={`/tournament/new?topic=${topic.id}`} className="topic-card-link"><h3>{topic.title}</h3><div className="topic-card-bottom"><span>이 주제로 토론하기</span><span className="topic-arrow"><ArrowUpRight size={19} /></span></div></Link>
        </article>
    );
}
