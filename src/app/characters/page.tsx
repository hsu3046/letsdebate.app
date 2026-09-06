import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Download, Sparkles } from 'lucide-react';
import { CHARACTER_CARDS } from '@/lib/characterCards';
import './characters.css';

export const metadata: Metadata = {
  title: '캐릭터 카드 20종 | 왈가왈부',
  description: '서로 다른 표정과 개성을 가진 노란 로봇 20종을 만나 보세요',
};

export default function CharactersPage() {
  return (
    <div className="page-container character-collection">
      <Link href="/" className="text-link back-link"><ArrowLeft size={16} /> 메인으로</Link>
      <header className="page-heading">
        <span className="eyebrow">CHARACTER CLUB · SERIES 01</span>
        <h1>20가지 개성의<br />AI 캐릭터</h1>
        <p>차분한 한마디부터 장난스러운 반박까지<br />토론 배틀을 함께할 노란 로봇들을 만나 보세요</p>
      </header>
      <div className="character-collection-meta">
        <span><Sparkles size={16} /> 캐릭터 카드 {CHARACTER_CARDS.length}종</span>
        <span>마음에 드는 캐릭터를 저장해 보세요</span>
      </div>
      <ol className="character-grid" aria-label="캐릭터 카드 20종">
        {CHARACTER_CARDS.map(character => (
          <li key={character.id}>
            <article className="character-card" style={{ '--character-color': character.color } as CSSProperties}>
              <div className="character-card-top"><span>WALGAWALBU CLUB</span><strong>{character.number}</strong></div>
              <Image className="character-portrait" src={character.image} width={1254} height={1254} sizes="(max-width: 599px) 45vw, (max-width: 1023px) 28vw, (max-width: 1399px) 20vw, 230px" alt={`${character.name} · ${character.tagline}`} />
              <div className="character-card-caption">
                <div><h2>{character.name}</h2><a href={character.image} download={`${character.id}.png`} className="icon-button" aria-label={`${character.name} 원본 PNG 저장`}><Download size={17} /></a></div>
                <p>{character.tagline}</p>
              </div>
            </article>
          </li>
        ))}
      </ol>
      <div className="character-collection-footer"><p>각 캐릭터는 AI 팀을 표현하는 마스코트예요</p><Link href="/tournament/new" className="button button-primary">AI 토론 배틀 만들기 <ArrowUpRight size={18} /></Link></div>
    </div>
  );
}
