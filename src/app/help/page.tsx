import Link from 'next/link';
import { ArrowUpRight, BookOpen, Gavel, Swords, Trophy } from 'lucide-react';

const steps = [
  { icon: BookOpen, title: '토론할 주제를 골라 보세요', body: '추천 주제 100개를 둘러보거나 직접 질문을 적어 보세요. 마음에 드는 주제는 저장해 두었다가 다시 꺼내 볼 수 있어요.' },
  { icon: Swords, title: '대결할 AI 모델을 골라 보세요', body: 'AI 모델 4개 또는 8개를 고르면 1대1 토론 대진표를 만들 수 있어요. 선택한 순서대로 대진이 정해지며 순서를 섞어 상대를 바꿀 수도 있어요.' },
  { icon: Gavel, title: '경기를 보고 심판의 판정을 확인하세요', body: '퀵 매치는 선수마다 2회씩 발언하고 깊은 토론은 3회씩 발언해요. 심판은 모델 이름을 가린 기록을 보고 논리성·근거·반박·주제 충실도·설득력을 각 20점씩 평가해요.' },
  { icon: Trophy, title: '결승까지 함께하고 기록을 남기세요', body: '판정이 끝나면 승자가 다음 라운드로 올라가요. 다음 경기는 직접 시작해 주세요. 경기 기록은 이 브라우저에 저장되며 Markdown 파일로 내보낼 수 있어요.' },
];
export default function HelpPage() {
  return <div className="page-container guide-page"><header className="page-heading"><span className="eyebrow">WELCOME TO THE DEBATE CLUB</span><h1>AI끼리 맞붙는<br />토론 배틀</h1><p>여러 AI 모델이 같은 주제로 주장과 반박을 주고받으며 우승을 겨뤄요</p></header><div className="guide-steps">{steps.map(({ icon: Icon, title, body }, index) => <section key={title}><span className="guide-number">0{index + 1}</span><Icon size={25} strokeWidth={1.5} /><div><h2>{title}</h2><p>{body}</p></div></section>)}</div><section className="guide-faq"><h2>자주 묻는 질문</h2><details><summary>누가 누구와 토론하나요?</summary><p>GPT·Claude·Gemini 등 선택한 AI 모델들이 서로 토론해요. 사용자는 주제와 참가 모델을 고르고 대결을 지켜봐요. 각 AI는 자신의 입장을 주장하고 상대의 논거를 반박하며 AI 심판이 승자를 가려요.</p></details><details><summary>참가한 모델을 심판으로 골라도 되나요?</summary><p>가능해요. 심판에게는 모델 이름 대신 A·B의 발언만 보여 줘요. 다만 심판의 판단에 편향이 생길 수는 있어요. 다른 모델을 심판으로 골라 결과를 비교해 보세요.</p></details><details><summary>경기 중 페이지를 닫으면 어떻게 되나요?</summary><p>진행 중인 경기가 중단되고 완료된 발언은 보관돼요. 다시 시작하면 그 경기의 발언을 처음부터 생성해요. 판정이 끝나기 전에는 다음 라운드로 진출하지 않아요.</p></details><details><summary>AI를 사용하려면 따로 준비할 게 있나요?</summary><p>AI 연결은 왈가왈부가 준비해요. 별도의 외부 계정을 연결할 필요 없이 제공되는 모델을 골라 시작하면 돼요.</p></details><details><summary>우승한 모델이 가장 뛰어난 AI인가요?</summary><p>우승 결과는 이번 주제와 입장에 따라 달라져요. 심판과 발언 규칙도 결과에 영향을 주므로 모델의 전체 성능 순위로 보기는 어려워요. AI의 발언에 담긴 중요한 정보는 직접 확인해 주세요.</p></details><details><summary>기존 캐릭터 토론도 사용할 수 있나요?</summary><p>이전 기록은 ‘나의 토론’에서 볼 수 있어요. 기존 캐릭터 토론도 아래 버튼을 눌러 시작할 수 있어요.</p><Link href="/setup?new=true" className="text-link">기존 캐릭터 토론 열기 <ArrowUpRight size={15} /></Link></details></section><Link href="/tournament/new" className="button button-primary">첫 토너먼트 만들기 <ArrowUpRight size={18} /></Link></div>;
}
