import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { COUNTRIES } from '@/lib/players';
import { Flag, Trophy } from 'lucide-react';
import { MASCOT_TEAMS } from '@/lib/mascots';
import ModelLogo from '@/components/ModelLogo';

export default function CupShowcase() {
  return (
    <div className="cup-showcase" aria-label="Claude와 GPT의 1대1 토론 배틀 예시">
      <div className="pitch-lines" aria-hidden="true"><span /></div>
      <div className="cup-scoreboard"><span><Flag size={13} fill="currentColor" /> Let&apos;s Debate AI</span><span>추천 대결</span></div>
      <div className="cup-debate-topic"><span>이번 대결의 주제</span><strong>AI가 만든 작품도 예술일까?</strong></div>
      <div className="cup-matchup">
        {MASCOT_TEAMS.slice(0, 2).map(team => (
          <figure className={`cup-player-card ${team.color}`} key={team.provider} style={{ '--team-color': team.background } as CSSProperties}>
            <div className="player-card-top"><span>TEAM {team.family.toUpperCase()}</span><strong>{team.number}</strong></div>
            <div className="player-card-art"><Image src={team.image} alt={`${team.name}, ${team.family} 팀의 노란 로봇 마스코트`} width={400} height={400} sizes="(max-width: 767px) 190px, 240px" priority /></div>
            <figcaption><strong><ModelLogo id={team.modelId} />{team.family}</strong><span>{team.name}<span aria-hidden="true"> ★</span></span></figcaption>
          </figure>
        ))}
        <span className="cup-vs" aria-hidden="true">VS</span>
      </div>
      <div className="cup-champion-sticker"><Trophy size={25} strokeWidth={2.1} /><span>우승은<br /><strong>누구?</strong></span></div>
    </div>
  );
}

export function TeamRoster() {
  return <div className="team-roster">{MASCOT_TEAMS.slice(0, 5).map(team => (
    <article key={team.provider} className={`roster-card ${team.color}`} style={{ '--team-color': team.background } as CSSProperties}>
      <div className="roster-card-top"><span>TEAM {team.family.toUpperCase()}</span><strong>{team.number}</strong></div>
      <div className="roster-art"><Image src={team.image} width={400} height={400} sizes="(max-width: 767px) 170px, 210px" alt={`${team.family} 팀 마스코트 ${team.name}`} /></div>
      <div className="roster-caption"><h3><Link href="/characters"><ModelLogo id={team.modelId} />{team.family}</Link><span>{COUNTRIES[team.country].flag} {team.name}</span></h3><p>{team.motto}</p></div>
    </article>
  ))}</div>;
}
