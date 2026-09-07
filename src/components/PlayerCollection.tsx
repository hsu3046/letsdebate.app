'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownUp, ChevronDown, Check, Download, Info, Plus, Search, Shield, X } from 'lucide-react';
import Dialog from '@/components/Dialog';
import ModelAvatar from '@/components/ModelAvatar';
import PlayerRadar from '@/components/PlayerRadar';
import ModelLogo from '@/components/ModelLogo';
import { useModelCatalog } from '@/hooks/useModelCatalog';
import { COUNTRIES, PLAYERS, INTELLIGENCE_REFERENCES, PLAYER_DATA_DATE, RESERVE_CHARACTERS, type CountryCode } from '@/lib/players';

const RECOMMENDED_FAMILIES: readonly string[] = ['Gemini', 'GPT', 'Grok', 'DeepSeek', 'Solar', 'Nemotron', 'Muse', 'Claude'];
const recommendationRank = (family: string) => {
  const rank = RECOMMENDED_FAMILIES.indexOf(family);
  return rank < 0 ? RECOMMENDED_FAMILIES.length : rank;
};

const SORT_OPTIONS = { name: '이름순', country: '국가순', recommended: '추천순' } as const;
type PlayerSort = keyof typeof SORT_OPTIONS;

const dollars = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;

export default function PlayerCollection() {
  const router = useRouter();
  const catalog = useModelCatalog();
  const [sort, setSort] = useState<PlayerSort>('recommended');
  const [sortOpen, setSortOpen] = useState(false);
  const sortButton = useRef<HTMLButtonElement>(null);
  const closeSort = () => { setSortOpen(false); sortButton.current?.focus(); };
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<CountryCode | 'all'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const available = new Set(catalog.models.map(model => model.id));
  const eligible = selected.filter(id => available.has(id));
  const visible = PLAYERS.filter(player => (country === 'all' || player.country === country) &&
    `${player.name} ${player.id} ${player.developer} ${player.character.name} ${player.playStyle}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => {
      // Unlisted families retain their relative order after the curated recommendations.
      if (sort === 'recommended') return recommendationRank(a.family) - recommendationRank(b.family);
      if (sort === 'country') {
        const byCountry = COUNTRIES[a.country].name.localeCompare(COUNTRIES[b.country].name, 'ko');
        if (byCountry) return byCountry;
      }
      return a.name.localeCompare(b.name, 'ko', { numeric: true, sensitivity: 'base' });
    });
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 8 ? [...current, id] : current);
  const continueDraft = () => {
    if (!eligible.length || catalog.loading || catalog.error) return;
    router.push(`/tournament/new?${new URLSearchParams({ players: eligible.join(',') })}`);
  };

  return <div className="page-container player-collection">
    <Link href="/" className="text-link back-link"><ArrowLeft size={16} /> 메인으로</Link>
    <header className="player-collection-heading">
      <div><span className="eyebrow"><Shield size={15} /> THE AI ALL-STARS · SEASON 01</span><h1>15명의 최신 AI<br /><em>토론으로 진검 승부</em></h1><p>미국, 중국, 한국, 일본을 대표하는 최신 AI 중 나만의 &apos;최애&apos;를 골라보세요.</p></div>
      <div className="roster-pass" aria-label="각 나라의 국가 대표 AI 15명, 1대1 토론 배틀"><span>OFFICIAL LINEUP</span><strong>15</strong><div>AI CONTENDERS</div><p>각 나라의 국가 대표 AI<br />1대1 토론 배틀</p></div>
    </header>
    <div className="player-toolbar">
      <div className="player-search-controls">
      <div className="search-field"><Search size={18} /><input aria-label="AI 선수 검색" placeholder="모델이나 캐릭터 이름으로 검색" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="player-sort" onKeyDown={event => { if (event.key === 'Escape' && sortOpen) { event.preventDefault(); closeSort(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSortOpen(false); }}>
        <button ref={sortButton} className="player-sort-trigger" aria-label={`선수 정렬: ${SORT_OPTIONS[sort]}`} aria-expanded={sortOpen} aria-controls="player-sort-options" onClick={() => setSortOpen(open => !open)}><ArrowDownUp size={16} />{SORT_OPTIONS[sort]}<ChevronDown size={15} /></button>
        {sortOpen && <>
          <div className="player-sort-backdrop" onClick={closeSort} aria-hidden="true" />
          <div id="player-sort-options" className="player-sort-options" role="group" aria-label="정렬 기준">
            {(Object.keys(SORT_OPTIONS) as PlayerSort[]).map(value => <button key={value} aria-pressed={sort === value} onClick={() => { setSort(value); closeSort(); }}>{SORT_OPTIONS[value]}{sort === value && <Check size={16} />}</button>)}
          </div>
        </>}
      </div>
      </div>
      <div className="player-country-filters" aria-label="개발사 국가별 선수">
        <button aria-pressed={country === 'all'} onClick={() => setCountry('all')}>전체 <small>15</small></button>
        {(Object.keys(COUNTRIES) as CountryCode[]).map(code => <button key={code} aria-pressed={country === code} onClick={() => setCountry(code)}><span aria-hidden="true">{COUNTRIES[code].flag}</span> {COUNTRIES[code].name} <small>{PLAYERS.filter(player => player.country === code).length}</small></button>)}
      </div>
    </div>
    <div className="player-results"><div className="player-results-summary"><span aria-live="polite">대표 선수 {visible.length}명</span><button className="text-link" onClick={() => setShowGuide(true)}><Info size={16} /> 능력치 보는 법</button></div><div className="player-results-actions"><span>마지막 갱신: {PLAYER_DATA_DATE.split('-').map(Number).join('.')}</span>

    </div></div>
    {catalog.error && <div className="inline-alert" role="alert"><p>{catalog.error}</p><button className="button button-secondary" onClick={catalog.retry}>선수 목록 다시 확인</button></div>}
    {visible.length ? <ol className="player-grid" aria-label="AI 대표 선수 카드">
      {visible.map(player => {
        const character = player.character;
        const intelligenceReference = INTELLIGENCE_REFERENCES[player.id];
        const chosen = selected.includes(player.id);
        const ready = available.has(player.id) && !catalog.loading && !catalog.error;
        const unavailable = !catalog.loading && !catalog.error && !available.has(player.id);
        return <li key={player.id}>
          <article className={`scouting-card ${chosen ? 'is-selected' : ''}`} style={{ '--player-color': character.color } as CSSProperties}>
            <div className="scouting-card-top"><span className="player-country"><span aria-hidden="true">{COUNTRIES[player.country].flag}</span> {COUNTRIES[player.country].name}</span><span>{player.developer}</span></div>
            <div className="scouting-portrait"><Image src={character.image} width={1254} height={1254} sizes="(max-width: 600px) 90vw, (max-width: 1200px) 40vw, 360px" alt={`${player.name}의 캐릭터 ${character.name}`} /><span className="player-style">{player.playStyle}</span>{chosen && <span className="player-picked"><Check size={14} /> MY PICK</span>}</div>
            <div className="scouting-identity"><div><span>TEAM {player.developer}</span><h2>{character.name}</h2><p>{character.tagline}</p></div><div><h3><ModelLogo id={player.id} /><span>{player.name}</span></h3></div></div>
            <div className="scouting-stats"><div className="scouting-stats-heading"><span>PLAYER STATS</span><span>왈가왈부 자체 평가</span></div><PlayerRadar player={player} />{player.intelligence === null && <p className="scouting-stat-note">지능 점수 미공개 · 해당 축은 비워 두었어요</p>}</div>
            <details className="scouting-source"><summary>몸값과 성능 원자료 <Info size={14} /></summary><dl><div><dt>생성 속도</dt><dd>{player.tokensPerSecond} tokens/s</dd></div><div><dt>속도 측정 경로</dt><dd>{player.speedProvider} · 1주 P50</dd></div><div><dt>입력 / 출력 단가</dt><dd>{dollars(player.inputPerMillion)} / {dollars(player.outputPerMillion)}</dd></div><div><dt>AA Intelligence Index</dt><dd>{player.intelligence ?? '미공개'}{intelligenceReference && <small className="intelligence-method">{intelligenceReference.note}</small>}</dd></div></dl><p>단가는 100만 토큰 기준 미국 달러예요. OpenRouter 공개 카탈로그 기준으로 할인과 연결 경로에 따라 바뀔 수 있어요. 속도는 표시된 경로의 참고값이며 실제 경기에서 보장되는 값은 아니에요.</p><a className="text-link" href={player.source} target="_blank" rel="noreferrer">OpenRouter 공식 자료 <ArrowUpRight size={14} /></a>{intelligenceReference && <a className="text-link" href={intelligenceReference.url} target="_blank" rel="noreferrer">Artificial Analysis 지능 원자료 <ArrowUpRight size={14} /></a>}</details>
            <div className="scouting-actions"><button className={`button ${chosen ? 'button-primary' : 'button-secondary'}`} aria-label={`${player.name} ${chosen ? '선택 해제' : '선택'}`} aria-pressed={chosen} disabled={!chosen && (!ready || selected.length >= 8)} onClick={() => toggle(player.id)}>{chosen ? <Check size={17} /> : <Plus size={17} />}{chosen ? '내 라인업에 합류' : catalog.loading ? '선수 확인 중' : catalog.error ? '목록 재확인 필요' : unavailable ? '지금은 출전 준비 중' : selected.length >= 8 ? '라인업 8명 선택 완료' : '선수 선택'}</button><a className="icon-button" href={character.image} download={`${character.id}.png`} aria-label={`${character.name} 원본 이미지 저장`}><Download size={17} /></a></div>
          </article>
        </li>;
      })}
    </ol> : <div className="empty-state"><Search size={30} /><h2>찾는 선수가 없어요</h2><p>이름이나 국가를 바꿔 다시 찾아보세요</p><button className="button button-secondary" onClick={() => { setQuery(''); setCountry('all'); }}>전체 선수 보기</button></div>}
    <section className="reserve-characters" aria-labelledby="reserve-heading"><h2 id="reserve-heading"><span>출전 대기 중인 후보 선수들 <strong>{RESERVE_CHARACTERS.length}</strong></span></h2><p>20종의 캐릭터 중 15종이 대표 선수와 만났어요<br />남은 다섯 친구도 여기서 만날 수 있어요</p><div>{RESERVE_CHARACTERS.map(character => <article key={character.id}><Image src={character.image} width={300} height={300} sizes="(max-width: 600px) 40vw, 180px" alt={character.name} /><h3>{character.name}</h3><p>{character.tagline}</p><a href={character.image} download={`${character.id}.png`} className="text-link">이미지 저장 <Download size={13} /></a></article>)}</div></section>
    {selected.length > 0 && <div className="player-draft-bar" aria-label="선택한 AI 선수 라인업"><div className="draft-info"><span className="eyebrow">YOUR LINEUP</span><strong aria-live="polite">{selected.length ? `${selected.length}명 선택 · ${selected.length > 4 ? '8' : '4'}강 준비` : '누구와 누구를 맞붙일까요?'}</strong><p>{selected.length ? '주제와 심판은 다음 단계에서 골라요' : '최대 8명까지 골라 나만의 배틀을 열어 보세요'}</p></div>{!!selected.length && <div className="draft-avatars">{selected.map(id => <button key={id} className="draft-avatar" aria-label={`${PLAYERS.find(player => player.id === id)?.name} 라인업에서 제외`} onClick={() => toggle(id)}><ModelAvatar id={id} small /><X size={10} /></button>)}</div>}<button className="button button-primary draft-continue" aria-label="이 선수들로 배틀 만들기" disabled={!eligible.length || catalog.loading || !!catalog.error} onClick={continueDraft}><span className="draft-cta-long">이 선수들로 배틀 만들기</span><span className="draft-cta-short">배틀 만들기</span><ArrowUpRight size={17} /></button></div>}
    {showGuide && <Dialog title="능력치 보는 법" onDismiss={() => setShowGuide(false)}><div className="scouting-guide"><p>서로 다른 AI를 가볍게 비교하는 스카우팅 카드예요<br />몸값은 낮을수록 저렴하고 나머지 능력치는 높을수록 좋아요</p><dl><div><dt>속도</dt><dd>OpenRouter 모델 페이지의 생성 속도 · 표시된 제공 경로의 최근 1주 중앙값(P50)이며 초당 150토큰을 100점으로 환산해요. 응답이 시작되기까지의 대기 시간은 포함하지 않아요.</dd></div><div><dt>몸값</dt><dd>낮을수록 저렴해요. 입력 2 : 출력 1 비율의 평균 단가를 사용해 100 × 평균 단가 ÷ (평균 단가 + 2)로 환산해요. 단가는 100만 토큰당 달러 기준이며 추론 토큰과 도구 사용 비용은 별도예요.</dd></div><div><dt>지능</dt><dd>OpenRouter 공개 자료와 Artificial Analysis 모델 페이지의 Intelligence Index를 참고해요. 평가 버전과 추론 설정은 출처마다 다를 수 있어요. 원점수 60을 차트의 100점으로 환산하며 미공개 모델은 비워 두어요. 한국어 토론 능력이나 승률을 직접 측정한 점수는 아니에요.</dd></div><div><dt>지명도 · 개성</dt><dd>왈가왈부의 재미용 설정이에요. 지명도는 개발사의 인지도를 떠올리며 정했고 개성은 캐릭터의 표현 스타일을 수치로 만들었어요. 공식 순위나 실측 성능과는 관계가 없어요.</dd></div></dl><p>국가는 개발사의 출신 국가를 표시해요. 캐릭터와 모델의 연결은 재미를 위한 설정이며 공식 제휴를 뜻하지 않아요.</p><p>자료 확인일 {PLAYER_DATA_DATE} · 실시간 수치가 아니에요. 할인과 제공 경로에 따라 몸값과 속도가 달라져요. 각 카드의 원자료에서 출처와 실제 수치를 확인할 수 있어요.</p><a href="https://openrouter.ai/api/v1/models" target="_blank" rel="noreferrer" className="text-link">OpenRouter 모델 카탈로그 <ArrowUpRight size={15} /></a></div></Dialog>}
  </div>;
}
