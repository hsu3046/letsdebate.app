'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Plus, Trophy, Clock3, Flag, Search } from 'lucide-react';
import TopicCard from '@/components/TopicCard';
import ModelAvatar from '@/components/ModelAvatar';
import ModelLogo from '@/components/ModelLogo';
import BurstIcon from '@/components/BurstIcon';
import CupShowcase, { TeamRoster } from '@/components/CupShowcase';
import { RANDOM_TOPICS } from '@/lib/topics';
import { FEATURED_TOPIC_IDS } from '@/lib/topicCatalog';
import { MASCOT_TEAMS } from '@/lib/mascots';
import { useTournamentStore } from '@/store/tournamentStore';
import { useHydrated } from '@/hooks/useHydrated';

const featured = FEATURED_TOPIC_IDS.flatMap(id => RANDOM_TOPICS.filter(topic => topic.id === id));

export default function HomePage() {
  const hydrated = useHydrated();
  const { tournaments, setActive } = useTournamentStore();

  const recent = hydrated ? tournaments.slice(0, 3) : [];

  return (
    <div className="page-container home-page">
      <div className="page-topline"><span>왈가왈부 ・ 최신 AI들의 진검 토론 승부</span><Link href="/help" className="connection-chip">시작하기<ArrowUpRight size={13} /></Link></div>
      <section className="home-hero cup-hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <h1 id="hero-heading">AI 모델들의<br /><span>토론 <span className="title-cup">배틀!</span></span></h1>
          <ul className="hero-models" aria-label="토론에 참여하는 AI 모델 계열">
            {MASCOT_TEAMS.slice(0, 4).map(team => <li key={team.provider} className="hero-model-icon" aria-label={team.family} title={team.family}><ModelLogo id={team.modelId} /><span>{team.family}</span></li>)}<li className="hero-model-all"><Link href="/characters">모든 선수 프로필 ↗</Link></li>
          </ul>
          <p>같은 주제를 두고 서로 다른 AI가 주장하고 반박해요<br />4강·8강 토너먼트로 우승 모델을 가려 보세요</p>
          <div className="hero-actions"><Link href="/tournament/new" className="button button-primary">토론 배틀 시작하기 <ArrowRight size={20} /></Link><Link href="/topics" className="button button-text">토론 주제 고르기 <Search size={20} /></Link></div>
          <div className="hero-footnote"><span className="avatar-symbols"><ModelAvatar id="google/demo" small /><ModelAvatar id="x-ai/demo" small /><ModelAvatar id="deepseek/demo" small /></span><span>대결은 AI 모델이 <span className="footnote-divider">/</span> 주제와 대진은 당신이</span></div>
        </div>
        <CupShowcase />
      </section>

      <section className="cup-ticket" aria-label="토너먼트 진행 방법">
        <div className="ticket-title"><Flag size={24} /><span>How to Debate<strong>AI 토론 배틀은 이렇게</strong></span></div>
        <ol><li><span>01</span><div><strong>AI 모델 선택</strong><p>주제와 참가 모델 고르기</p></div></li><li><span>02</span><div><strong>1대1 토론 배틀</strong><p>같은 주제로 주장과 반박</p></div></li><li><span>03</span><div><strong>승자 진출</strong><p>AI 심판의 판정으로 결승까지</p></div></li></ol>
      </section>

      <section className="home-topics" aria-labelledby="topics-heading">
        <div className="section-heading"><div><span className="eyebrow">PICK A DEBATE</span><h2 id="topics-heading">토론 주제 고르기<span className="heading-flower" aria-hidden="true"><BurstIcon /></span></h2></div><Link href="/topics" className="text-link">전체 주제 <ArrowUpRight size={16} /></Link></div>
        <div className="topic-grid">{featured.map(topic => <TopicCard key={topic.id} topic={topic} featured />)}</div>
      </section>

      <section className="home-roster" aria-labelledby="roster-heading">
        <div className="section-heading"><div><span className="eyebrow">MEET THE AI CONTENDERS</span><h2 id="roster-heading">출전 선수 고르기</h2></div><Link href="/characters" className="text-link roster-hint">대표 선수 15명 보기 <ArrowUpRight size={15} /></Link></div>
        <TeamRoster />
        <p className="roster-note">15개 AI 모델이 각자의 캐릭터로 출전해요<br />선수 카드에서 국가와 능력치를 보고 라인업을 골라 보세요</p>
      </section>

      <div className="home-bottom-grid">
        <section className="recent-section"><div className="section-heading"><h2><Clock3 size={19} /> 최근 토너먼트</h2><Link href="/history" className="text-link">전체 보기 <ArrowRight size={15} /></Link></div>
          {recent.length ? <div className="recent-list">{recent.map(item => <Link href={`/tournament?id=${item.id}`} onClick={() => setActive(item.id)} key={item.id} className="recent-item"><span className="recent-icon"><Trophy size={20} /></span><span><strong>{item.topic}</strong><small>{item.entrants.length}강 · {item.matches.filter(match => match.status === 'completed').length}/{item.matches.length} 경기 완료</small></span><ArrowUpRight size={17} /></Link>)}</div> :
            <div className="empty-state compact"><span className="club-empty-mascot"><Image src="/logo_light.svg" alt="" width={65} height={65} /></span><h3>어떤 AI가 우승할까요?</h3><p>맞붙이고 싶은 AI 모델을 골라 첫 배틀을 열어 보세요</p><Link href="/tournament/new" className="button button-primary first-tournament-button">첫 토론 배틀 만들기 <Plus size={19} /></Link></div>}
        </section>
        <section className="openrouter-note"><div><span className="eyebrow"><Image src="/logos/openrouter.svg" width={19} height={14} alt="" /> POWERED BY OPENROUTER</span><h2>다양한 AI를<br />한 경기장에</h2><p>다양한 AI 모델을 한곳에서 골라 보세요<br />모델 연결부터 AI 심판까지 왈가왈부가 준비해요</p><Link href="/tournament/new" className="text-link">대결할 AI 고르기 <ArrowUpRight size={17} /></Link></div><div className="referee-portrait"><Image src="/avatars/avatar_mc.jpeg" width={180} height={180} sizes="140px" alt="노란 로봇 진행자" /><span>토론으로 승부해요!</span></div></section>
      </div>
    </div>
  );
}
