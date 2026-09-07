import type { Metadata } from 'next';
import PlayerCollection from '@/components/PlayerCollection';
import './characters.css';

export const metadata: Metadata = {
  title: 'AI 대표 선수 15 | 왈가왈부',
  description: '4개국 15개 AI 모델의 캐릭터와 능력치를 살펴보고 나만의 토론 배틀 라인업을 만들어 보세요',
};

export default function CharactersPage() {
  return <PlayerCollection />;
}
