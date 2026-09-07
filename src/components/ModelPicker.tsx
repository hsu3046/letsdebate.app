'use client';

import { useState } from 'react';
import { Check, Search, Plus, Loader2, RefreshCw } from 'lucide-react';
import ModelAvatar from '@/components/ModelAvatar';
import ModelLogo from '@/components/ModelLogo';
import { COUNTRIES, getPlayer } from '@/lib/players';
import { modelShortName, getProvider, type OpenRouterModel } from '@/lib/tournament';

interface ModelPickerProps {
  models: OpenRouterModel[];
  loading: boolean;
  error: string;
  retry: () => void;
  selectedIds: string[];
  onSelect: (model: OpenRouterModel) => void;
  max: number;
}

export default function ModelPicker({ models, loading, error, retry, selectedIds, onSelect, max }: ModelPickerProps) {
  const [providerOpen, setProviderOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('all');
  const [limit, setLimit] = useState(24);
  const providers = [...new Set(models.map(model => getProvider(model.id)))].sort();
  const filtered = models.filter(model => (provider === 'all' || getProvider(model.id) === provider) && `${model.name} ${model.id} ${getPlayer(model.id)?.character.name || ''}`.toLowerCase().includes(query.toLowerCase().trim())).sort((a, b) => a.name.localeCompare(b.name));
  return <div className="model-picker"><div className="search-field"><Search size={18} /><input aria-label="AI 모델 검색" placeholder="모델이나 캐릭터 이름으로 검색" value={query} onChange={event => { setQuery(event.target.value); setLimit(24); }} /></div><div className="model-filters"><details className="provider-select" onToggle={event => setProviderOpen(event.currentTarget.open)}><summary>{provider === 'all' ? '모든 제공사' : provider}<span>⌄</span></summary>{providerOpen && <div className="provider-backdrop" aria-hidden="true" onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')} />}<div className="provider-options">{['all', ...providers].map(item => <button key={item} aria-pressed={provider === item} onClick={event => { setProvider(item); setLimit(24); event.currentTarget.closest('details')?.removeAttribute('open'); }}>{item === 'all' ? '모든 제공사' : item}</button>)}</div></details></div><div className="model-list-info"><span aria-live="polite">{loading ? '모델 목록을 불러오는 중…' : `${filtered.length}개 모델`}</span><span>왈가왈부 제공</span></div>{loading ? <div className="empty-state compact" role="status"><Loader2 className="spin" size={24} /><p>AI 모델을 불러오고 있어요…</p></div> : error ? <div className="inline-alert" role="alert"><p>{error}</p><button className="button button-secondary" onClick={retry}><RefreshCw size={16} />다시 불러오기</button></div> : filtered.length ? <><div className="model-list">{filtered.slice(0, limit).map(model => { const player = getPlayer(model.id); const selected = selectedIds.includes(model.id); const disabled = !selected && selectedIds.length >= max; return <button type="button" className={`model-option ${selected ? 'selected' : ''}`} key={model.id} disabled={disabled} aria-pressed={selected} onClick={() => onSelect(model)}><ModelAvatar id={model.id} small /><span className="model-option-name"><strong><ModelLogo id={model.id} /><span>{modelShortName(model)}</span></strong><small>{player ? `${COUNTRIES[player.country].flag} ${COUNTRIES[player.country].name} · ${player.character.name}` : getProvider(model.id)}</small></span><span className={`selection-circle ${selected ? 'selected' : ''}`}>{selected ? <Check size={14} /> : <Plus size={14} />}</span></button>; })}</div>{filtered.length > limit && <button className="button button-secondary load-more" onClick={() => setLimit(value => value + 24)}>모델 더 보기</button>}</> : <div className="empty-state compact"><Search size={24} /><h3>일치하는 모델이 없어요</h3><p>검색어나 제공사를 바꿔 보세요</p></div>}</div>;
}
