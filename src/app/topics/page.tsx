'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Search, Shuffle, X } from 'lucide-react';
import TopicCard from '@/components/TopicCard';
import { RANDOM_TOPICS } from '@/lib/topics';
import { getTopicCategory, TOPIC_CATEGORIES } from '@/lib/topicCatalog';
import { useLibraryStore } from '@/store/libraryStore';
import { useHydrated } from '@/hooks/useHydrated';

function TopicExplorer() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(18);
  const category = params.get('category') || '전체';
  const savedOnly = params.get('saved') === 'true';
  const savedIds = useLibraryStore(state => state.savedTopicIds);
  const hydrated = useHydrated();
  const topics = RANDOM_TOPICS.filter(topic => (category === '전체' || getTopicCategory(topic) === category) && (!savedOnly || (hydrated && savedIds.includes(topic.id))) && topic.title.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  const filter = (key: string, value: string) => { const next = new URLSearchParams(params.toString()); next.set(key, value); setLimit(18); router.replace(`/topics?${next}`, { scroll: false }); };
  const random = () => { const topic = topics[Math.floor(Math.random() * topics.length)]; if (topic) router.push(`/tournament/new?topic=${topic.id}`); };
  return <div className="page-container"><header className="page-heading"><span className="eyebrow">PICK YOUR NEXT QUESTION</span><h1>AI가 맞붙을<br className="mobile-only" /> 주제를 골라 보세요</h1><p>같은 질문에 서로 다른 AI는 어떤 주장과 반박을 펼칠까요?</p></header><div className="explorer-toolbar"><div className="search-field"><Search size={18} /><input aria-label="주제 검색" value={query} onChange={event => { setQuery(event.target.value); setLimit(18); }} placeholder="궁금한 단어로 주제를 찾아보세요" />{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="검색어 지우기"><X size={16} /></button>}</div><button className="button button-secondary" disabled={!topics.length} onClick={random}><Shuffle size={17} />랜덤 주제</button></div><div className="filter-toolbar"><div className="filter-chips" aria-label="주제 카테고리">{TOPIC_CATEGORIES.map(item => <button key={item} aria-pressed={category === item} className={`filter-chip ${category === item ? 'active' : ''}`} onClick={() => filter('category', item)}>{item}</button>)}</div><button className={`filter-chip saved-filter ${savedOnly ? 'active' : ''}`} aria-pressed={savedOnly} onClick={() => filter('saved', String(!savedOnly))}><Bookmark size={16} />저장한 주제 {hydrated ? savedIds.length : 0}</button></div><p className="result-count" aria-live="polite">{topics.length}개의 주제</p>{topics.length ? <><div className="topic-grid">{topics.slice(0, limit).map(topic => <TopicCard key={topic.id} topic={topic} />)}</div>{limit < topics.length && <button className="button button-secondary load-more" onClick={() => setLimit(value => value + 18)}>주제 더 보기 ({topics.length - limit})</button>}</> : <div className="empty-state"><Search size={30} /><h2>{savedOnly ? '아직 저장한 주제가 없어요' : '검색 결과가 없어요'}</h2><p>{savedOnly ? '마음에 드는 주제의 저장 버튼을 눌러 모아 보세요' : '검색어나 카테고리를 바꾸면 다른 주제를 볼 수 있어요'}</p><button className="button button-secondary" onClick={() => { setQuery(''); router.replace('/topics'); }}>모든 주제 보기</button></div>}</div>;
}
export default function TopicsPage() { return <Suspense fallback={<div className="page-container">주제를 불러오는 중…</div>}><TopicExplorer /></Suspense>; }
