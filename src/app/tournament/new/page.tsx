'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, Gavel, Shuffle, Trophy, X, Swords, SlidersHorizontal } from 'lucide-react';
import ModelPicker from '@/components/ModelPicker';
import ModelAvatar from '@/components/ModelAvatar';
import Dialog from '@/components/Dialog';
import { useModelCatalog } from '@/hooks/useModelCatalog';
import { useTournamentStore } from '@/store/tournamentStore';
import { RANDOM_TOPICS, getRandomTopic } from '@/lib/topics';
import { isContentAllowed } from '@/lib/topicFilter';
import { modelShortName, type OpenRouterModel } from '@/lib/tournament';
import { parsePlayerDraft } from '@/lib/players';

function TournamentBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const catalog = useModelCatalog();
  const initialTopic = RANDOM_TOPICS.find(topic => topic.id === Number(params.get('topic')))?.title || '';
  const [topic, setTopic] = useState(initialTopic);
  const [context, setContext] = useState('');
  const [size, setSize] = useState<4 | 8>(() => parsePlayerDraft(params.get('players')).length > 4 ? 8 : 4);
  // IDs initialize once; catalog arrival resolves metadata without overwriting the user's edits.
  const [entrantIds, setEntrantIds] = useState<string[]>(() => parsePlayerDraft(params.get('players')));
  const resolveEntrants = (ids: string[]) => ids.flatMap(id => catalog.models.filter(model => model.id === id));
  const entrants = resolveEntrants(entrantIds);
  const setEntrants = (update: (current: OpenRouterModel[]) => OpenRouterModel[]) => setEntrantIds(current => update(resolveEntrants(current)).map(model => model.id));
  const [judge, setJudge] = useState<OpenRouterModel | null>(null);
  const [showJudge, setShowJudge] = useState(false);
  const [turns, setTurns] = useState<2 | 3>(2);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const ready = !catalog.loading && !catalog.error && topic.trim().length >= 2 && entrants.length === size && !!judge && catalog.models.some(model => model.id === judge.id);
  const selectModel = (model: OpenRouterModel) => setEntrants(current => current.some(item => item.id === model.id) ? current.filter(item => item.id !== model.id) : current.length < size ? [...current, model] : current);
  const shuffle = () => setEntrants(current => { const shuffled = [...current]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; } return shuffled; });
  const create = () => {
    if (!ready || !judge || creating) return;
    const check = isContentAllowed(`${topic.trim()} ${context.trim()}`);
    if (!check.allowed) { setError(check.reason || '다른 주제를 입력해 주세요'); return; }
    setCreating(true);
    try {
      const id = useTournamentStore.getState().createTournament({ topic: topic.trim(), context: context.trim(), entrants, judge, turnsPerSide: turns });
      router.push(`/tournament?id=${id}`);
    } catch { setError('대진표를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); setCreating(false); }
  };
  return <div className="page-container builder-page"><Link href="/" className="text-link back-link"><ArrowLeft size={16} /> 발견하기</Link><header className="page-heading"><span className="eyebrow">BUILD YOUR BRACKET</span><h1>AI 토론 배틀 만들기</h1><p>맞붙이고 싶은 AI 모델 4개 또는 8개를 골라 토론 토너먼트를 열어 보세요</p></header><div className="builder-grid"><div className="builder-form"><section className="form-section"><div className="form-section-heading"><span className="step-number">01</span><h2>어떤 주제로 겨룰까요?</h2></div><div className="field-heading"><label htmlFor="tournament-topic">토론 주제</label><button className="text-link" onClick={() => setTopic(getRandomTopic().title)}><Shuffle size={14} /> 랜덤 추천</button></div><textarea id="tournament-topic" className="topic-input" value={topic} onChange={event => { setTopic(event.target.value); setError(''); }} placeholder="예: AI가 만든 작품도 예술이라고 할 수 있을까?" maxLength={200} rows={3} /><span className="field-counter">{topic.length} / 200</span><details className="context-details"><summary>배경 설명 추가 <span>선택</span></summary><textarea aria-label="토론 배경 설명" value={context} onChange={event => setContext(event.target.value)} maxLength={500} placeholder="함께 생각해 볼 상황이나 관점을 적어 주세요 (500자 이내)" rows={3} /></details></section><section className="form-section"><div className="form-section-heading"><span className="step-number">02</span><h2>어떤 AI 모델을 맞붙일까요?</h2></div><div className="format-options">{([4, 8] as const).map(value => <button key={value} className={`format-option ${size === value ? 'selected' : ''}`} aria-pressed={size === value} onClick={() => { if (value < entrants.length && !window.confirm('8강에서 4강으로 바꾸면 뒤의 네 모델이 선택 해제됩니다. 변경할까요?')) return; setSize(value); setEntrants(current => current.slice(0, value)); }}><Trophy size={22} /><strong>{value}강 토너먼트</strong><small>{value === 4 ? '가볍게 즐기는 3경기' : '더 많은 대결을 즐기는 7경기'}</small>{size === value && <Check className="format-check" size={17} />}</button>)}</div><p className="field-hint">대표 선수 15명 중에서 골라요 · <Link href="/characters" className="text-link">선수 카드와 능력치 보기</Link></p>{!catalog.loading && !catalog.error && entrantIds.some(id => !catalog.models.some(model => model.id === id)) && <p className="inline-alert" role="status">일부 선수가 지금은 출전할 수 없어 라인업에서 빠졌어요. 다른 선수를 골라 주세요.</p>}<ModelPicker {...catalog} selectedIds={entrants.map(model => model.id)} max={size} onSelect={selectModel} /></section><section className="form-section"><div className="form-section-heading"><span className="step-number">03</span><h2>경기 규칙을 정해 주세요</h2></div><div className="judge-official"><Image src="/avatars/avatar_mc.jpeg" width={96} height={96} sizes="48px" alt="" /><div><strong>AI 심판이 승자를 가려요</strong><p>심판을 맡을 AI와 선수별 발언 횟수를 정해 주세요</p></div></div><div className="setting-row"><div><strong><Gavel size={16} /> AI 심판</strong><p>모델 이름을 가리고 토론 내용만 평가해요</p></div><button className="button button-secondary" onClick={() => setShowJudge(true)}>{judge ? modelShortName(judge) : '심판 선택'}<ArrowRight size={15} /></button></div>{judge && entrants.some(model => model.id === judge.id) && <p className="field-hint">참가한 모델이 심판도 맡아요. 다른 모델을 심판으로 고를 수도 있어요.</p>}<div className="setting-row"><div><strong><SlidersHorizontal size={16} /> 발언 횟수</strong><p>두 선수는 같은 횟수만큼 발언해요</p></div><div className="segmented-control">{([2, 3] as const).map(value => <button key={value} className={turns === value ? 'active' : ''} aria-pressed={turns === value} onClick={() => setTurns(value)}>{value === 2 ? '퀵 매치' : '깊은 토론'}<small>각 {value}회 발언</small></button>)}</div></div></section></div><aside className="builder-summary" id="lineup-summary"><div className="summary-card"><span className="eyebrow"><Swords size={14} /> YOUR LINEUP</span><div className="summary-heading"><h2>출전할 AI 모델</h2><span>{entrants.length} / {size}</span></div><div className="lineup-slots">{Array.from({ length: size }, (_, index) => { const model = entrants[index]; return <div className={`lineup-slot ${model ? 'filled' : ''}`} key={index}><span className="slot-number">{String(index + 1).padStart(2, '0')}</span>{model ? <><ModelAvatar id={model.id} small /><strong>{modelShortName(model)}</strong><button className="icon-button" aria-label={`${model.name} 선택 해제`} onClick={() => selectModel(model)}><X size={15} /></button></> : <span>모델을 선택해 주세요</span>}</div>; })}</div><button className="text-link shuffle-lineup" disabled={entrants.length < 2} onClick={shuffle}><Shuffle size={15} /> 대진 순서 섞기</button><div className="summary-facts"><span>진행 방식<strong>1대1 · 단판 토너먼트</strong></span><span>전체 경기 수<strong>{size - 1}경기</strong></span><span>경기 구성<strong>토론 {turns * 2}회 + 판정 1회</strong></span><span>진행 순서<strong>한 경기씩 직접 시작</strong></span></div><div className="service-play-note"><Swords size={16} /><p>선택한 AI 모델들이 같은 주제로 1대1 토론을 펼쳐요. AI 심판의 판정에 따라 승자가 다음 라운드로 올라가요.</p></div>{error && <p role="alert" className="inline-error">{error}</p>}<button className="button button-primary create-tournament" disabled={!ready || creating} onClick={create}>{creating ? '대진표 만드는 중…' : '대진표 만들기'}<ArrowUpRightIcon /></button><p className="summary-caption">{ready ? '경기는 대진표에서 시작할 수 있어요' : !topic.trim() ? '주제를 입력하고 모델과 심판을 선택해 주세요' : entrants.length !== size ? `${size - entrants.length}개의 참가 모델을 더 선택해 주세요` : '심판을 맡을 AI 모델을 선택해 주세요'}</p></div></aside></div><div className="mobile-builder-bar"><span><strong>{entrants.length}/{size}</strong> 모델 선택 · {judge ? '심판 준비됨' : '심판 선택 필요'}</span><a href="#lineup-summary" className="button button-primary">라인업 확인 <ArrowRight size={16} /></a></div>{showJudge && <Dialog title="AI 심판 선택" onDismiss={() => setShowJudge(false)}><p className="dialog-intro">심판은 참가 모델의 이름을 보지 않고 A·B의 발언만 평가해요</p><ModelPicker {...catalog} selectedIds={judge ? [judge.id] : []} max={Infinity} onSelect={model => { setJudge(model); setShowJudge(false); }} /></Dialog>}</div>;
}
function ArrowUpRightIcon() { return <ArrowRight size={18} />; }
export default function NewTournamentPage() { return <Suspense fallback={<div className="page-container">토너먼트 준비 중…</div>}><TournamentBuilder /></Suspense>; }
