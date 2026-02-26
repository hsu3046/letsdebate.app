'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Bell, Lightbulb, Rocket, Users, ChevronDown, ChevronUp, Sparkles, Calendar, AlertCircle, ArrowLeft } from 'lucide-react';
import FadeInView from '@/components/FadeInView';

// 캐릭터 데이터 (characters.ts 기반)
const characters = [
    { id: 'henry', name: '헨리', avatarImage: '/avatars/avatar_henry.jpeg', aiModel: 'Gemini', trait: '쉬운설명', desc: '초등학교 선생님. 미래의 아이들에게 부끄럽지 않은 선택이 무엇인지 따뜻하게 질문합니다.', color: 'bg-red-100' },
    { id: 'sophie', name: '소피', avatarImage: '/avatars/avatar_sophie.jpeg', aiModel: 'Claude', trait: '정의로움', desc: '인권 변호사. 공익이라는 이름 아래 소외된 약자들의 권리를 끝까지 대변합니다.', color: 'bg-purple-100' },
    { id: 'victor', name: '빅터', avatarImage: '/avatars/avatar_victor.jpeg', aiModel: 'ChatGPT', trait: '기술전문', desc: 'AI 엔지니어. 인간의 불완전한 감정보다 데이터와 알고리즘의 완벽함을 신뢰합니다.', color: 'bg-cyan-100' },
    { id: 'leo', name: '레오', avatarImage: '/avatars/avatar_leo.jpeg', aiModel: 'Grok', trait: '팩트폭격', desc: '베테랑 회계사. 감정을 배제하고 모든 것을 숫자와 기회비용으로 계산합니다.', color: 'bg-emerald-100' },
    { id: 'max', name: '맥스', avatarImage: '/avatars/avatar_max.jpeg', aiModel: 'DeepSeek', trait: '비전지향', desc: '스타트업 창업가. 현실의 제약은 무시하고 세상을 바꿀 거대한 혁신을 이야기합니다.', color: 'bg-amber-100' },

    { id: 'chloe', name: '클로이', avatarImage: '/avatars/avatar_chloe.jpeg', aiModel: '준비중', trait: '원칙주의', desc: '윤리학 교수. 눈앞의 이익보다 옳고 그름의 도덕적 가치를 최우선으로 따집니다.', color: 'bg-indigo-100' },
    { id: 'greg', name: '그렉', avatarImage: '/avatars/avatar_grek.jpeg', aiModel: '준비중', trait: '풍자+유머', desc: 'SNL 작가 출신 칼럼니스트. 날카로운 풍자와 유머로 세상을 비꼬아 버립니다.', color: 'bg-orange-100' },
    { id: 'jenny', name: '제니', avatarImage: '/avatars/avatar_jenny.jpeg', aiModel: '준비중', trait: '감성충만', desc: '베스트셀러 에세이 작가. 차가운 논리보다 따뜻한 이야기로 마음을 움직입니다.', color: 'bg-pink-100' },
];

// 추천 매치업
const recommendedMatchups = [
    { chars: ['빅터', '제니'], reason: '논리 vs 감성의 극과극 대결', icon: '🔥' },
    { chars: ['레오', '소피'], reason: '현실 vs 정의, 치열한 가치 충돌', icon: '⚔️' },
    { chars: ['그렉', '헨리'], reason: '냉소 vs 희망, 세대 관점 충돌', icon: '💥' },
    { chars: ['맥스', '클로이'], reason: '실행 vs 신중, 속도와 깊이의 대결', icon: '🎯' },
];

// 업데이트 로그
const updates = [
    {
        date: '2024.12.19',
        version: 'v0.2.0',
        title: '각 캐릭터의 토론 성능 개선',
        desc: 'AI모델 및 프롬프트 대폭 수정',
        type: 'feature'
    },
    {
        date: '2024.12.16',
        version: 'v0.1.3',
        title: '토론 엔진 추가',
        desc: '시스템 전면 개편 & MVP 선정 기능 탑재',
        type: 'feature'
    },
    {
        date: '2024.12.14',
        version: 'v0.1.2',
        title: 'AI 두뇌 업그레이드',
        desc: '모델 성능 개선 & 각종 편의 UI 대공사',
        type: 'feature'
    },
    { date: '2024.12.12', version: 'v0.1.1', title: '캐릭터 시스템 개편', desc: '8종 캐릭터의 말투와 성격이 더욱 뚜렷해졌습니다.', type: 'feature' },
    { date: '2024.12.10', version: 'v0.1.0', title: '베타 서비스 오픈', desc: '왈가왈부가 세상에 첫 발을 내딛었습니다!', type: 'release' },
];

// 로드맵
const roadmap = [
    // ✅ 완료된 기능 (Done)
    {
        status: 'done',
        title: '개성 만점 AI 논객 5인',
        desc: '성격 확실한 5명의 캐릭터 × 5종류의 최신 AI'
    },
    {
        status: 'done',
        title: '탈탈 터는 토론 분석',
        desc: '오늘의 MVP는 누구? 승패와 스탯 완벽 시각화'
    },

    // 🚀 개발 중 (In Progress)
    {
        status: 'done',
        title: '당신의 \'최애\'는 누구?',
        desc: '내가 응원하는 캐릭터에게 한 표! 인기투표 기능'
    },
    {
        status: 'progress',
        title: 'AI 두뇌 풀업그레이드',
        desc: '더 똑똑하게, 더 인간미 넘치게 성능 개선'
    },
    // 📅 예정된 기능 (Planned)
    {
        status: 'planned',
        title: '거짓말 탐지기 & 뉴스 장착',
        desc: '실시간 최신 정보 반영과 칼 같은 팩트체크'
    },
    {
        status: 'planned',
        title: '"인간 승리" 인증샷 공유',
        desc: '치열했던 토론 성적표, 이미지로 멋지게 자랑하기'
    },
    {
        status: 'planned',
        title: '비밀 업데이트 대기 중',
        desc: '더 재미있는 기능들을 몰래 개발하고 있어요...'
    },
];

export default function NoticePage() {
    const router = useRouter();
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [selectedChar, setSelectedChar] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <section className="min-h-screen overflow-y-auto p-4 pt-3 pb-20">
            <div className="max-w-[420px] mx-auto pb-6">
                {/* 헤더 */}
                <FadeInView delay={0.1}>
                    <div className="flex items-center mb-6">
                        <motion.button
                            onClick={() => router.back()}
                            className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-text-primary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <ArrowLeft size={18} />
                        </motion.button>
                        <h2 className="flex-1 text-center font-title text-2xl">알림판</h2>
                        <div className="w-10" />
                    </div>
                </FadeInView>

                {/* 베타 배너 */}
                <FadeInView delay={0.2} className="mb-4">
                    <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 text-white shadow-lg">
                        <div className="flex items-start gap-3">
                            <div className="bg-white/20 rounded-full p-2">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="font-bold text-lg">베타 서비스 안내</h2>
                                    <span className="bg-white/30 text-xs px-2 py-0.5 rounded-full">BETA</span>
                                </div>
                                <p className="text-amber-50 text-sm leading-relaxed">
                                    지금은 <strong>&apos;왈가왈부&apos;</strong>가 성장하는 중이에요!
                                    더 재미있는 토론을 위해 예고 없이 새로운 기능이 생기거나,
                                    기존 기능이 변경될 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeInView>

                {/* 꿀잼 토론 팁 */}
                <FadeInView delay={0.3} className="mb-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => toggleSection('tips')}
                            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="bg-yellow-100 rounded-full p-2">
                                <Lightbulb className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="font-bold text-text-primary">좋은 토론을 위한 노하우</h2>
                                <p className="text-sm text-text-secondary">어떻게 하면 더 유익하고 재미있는 결과가 나올까요?</p>
                            </div>
                            {expandedSection === 'tips' ?
                                <ChevronUp className="w-5 h-5 text-text-tertiary" /> :
                                <ChevronDown className="w-5 h-5 text-text-tertiary" />
                            }
                        </button>

                        {expandedSection === 'tips' && (
                            <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                                {/* 팁 1 */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                                        <span className="bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                                        주제는 구체적일수록 좋아요!
                                    </h3>
                                    <div className="ml-8 space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg">
                                            <span>👎</span>
                                            <span className="line-through">&quot;점심 메뉴&quot;</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg">
                                            <span>👍</span>
                                            <span>&quot;비 오는 날 점심: 파전에 막걸리 vs 뜨끈한 짬뽕&quot;</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 팁 2 */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                                        <span className="bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                                        상극인 캐릭터를 붙여보세요!
                                    </h3>
                                    <div className="ml-8 space-y-2">
                                        {recommendedMatchups.map((match, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg text-sm">
                                                <span>{match.icon}</span>
                                                <span className="font-medium text-text-primary">{match.chars.join(' vs ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </FadeInView>

                {/* AI 캐릭터 소개 */}
                <FadeInView delay={0.4} className="mb-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => toggleSection('characters')}
                            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="bg-purple-100 rounded-full p-2">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="font-bold text-text-primary">AI 토론자들 소개</h2>
                                <p className="text-sm text-text-secondary">개성 넘치는 토론 AI들을 만나보세요</p>
                            </div>
                            {expandedSection === 'characters' ?
                                <ChevronUp className="w-5 h-5 text-text-tertiary" /> :
                                <ChevronDown className="w-5 h-5 text-text-tertiary" />
                            }
                        </button>

                        {expandedSection === 'characters' && (
                            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {characters.map((char) => (
                                        <motion.button
                                            key={char.id}
                                            onClick={() => setSelectedChar(selectedChar === char.id ? null : char.id)}
                                            className={`p-3 rounded-2xl text-left transition-all ${char.color} ${selectedChar === char.id ? 'ring-2 ring-accent' : ''}`}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* 왼쪽: 큰 아바타 */}
                                                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                                                    <Image src={char.avatarImage} alt={char.name} width={80} height={80} className="w-full h-full object-cover" />
                                                </div>
                                                {/* 오른쪽: 이름, AI모델, 성격 세로 배치 */}
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-text-primary text-lg leading-tight">{char.name}</span>
                                                    <span className="bg-white/70 px-2 py-0.5 rounded text-xs font-medium w-fit mt-1">{char.aiModel}</span>
                                                    <span className="text-xs text-text-secondary mt-1">{char.trait}</span>
                                                </div>
                                            </div>
                                            {selectedChar === char.id && (
                                                <p className="text-xs text-text-secondary mt-3 pt-2 border-t border-gray-200/50">
                                                    {char.desc}
                                                </p>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </FadeInView>

                {/* 로드맵 */}
                <FadeInView delay={0.5} className="mb-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => toggleSection('roadmap')}
                            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="bg-green-100 rounded-full p-2">
                                <Rocket className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="font-bold text-text-primary">앞으로의 계획</h2>
                                <p className="text-sm text-text-secondary">왈가왈부는 계속 진화합니다</p>
                            </div>
                            {expandedSection === 'roadmap' ?
                                <ChevronUp className="w-5 h-5 text-text-tertiary" /> :
                                <ChevronDown className="w-5 h-5 text-text-tertiary" />
                            }
                        </button>

                        {expandedSection === 'roadmap' && (
                            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                                <div className="space-y-3">
                                    {roadmap.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className={`w-3 h-3 rounded-full mt-1.5 ${item.status === 'done' ? 'bg-green-500' :
                                                item.status === 'progress' ? 'bg-yellow-500 animate-pulse' :
                                                    'bg-gray-300'
                                                }`} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-text-primary">{item.title}</span>
                                                    {item.status === 'done' && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">완료</span>
                                                    )}
                                                    {item.status === 'progress' && (
                                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">진행중</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-text-secondary">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </FadeInView>

                {/* 업데이트 로그 */}
                <FadeInView delay={0.6} className="mb-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => toggleSection('updates')}
                            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="bg-blue-100 rounded-full p-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="font-bold text-text-primary">업데이트 기록</h2>
                                <p className="text-sm text-text-secondary">최근 변경 사항을 확인하세요</p>
                            </div>
                            {expandedSection === 'updates' ?
                                <ChevronUp className="w-5 h-5 text-text-tertiary" /> :
                                <ChevronDown className="w-5 h-5 text-text-tertiary" />
                            }
                        </button>

                        {expandedSection === 'updates' && (
                            <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
                                {updates.map((update, i) => (
                                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                        <div className="text-center">
                                            <div className="text-xs text-text-tertiary">{update.date}</div>
                                            <div className={`text-xs font-mono mt-1 px-2 py-0.5 rounded ${update.type === 'feature' ? 'bg-purple-100 text-purple-700' :
                                                update.type === 'improve' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                {update.version}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-medium text-text-primary text-sm">{update.title}</div>
                                            <div className="text-xs text-text-secondary">{update.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </FadeInView>

                {/* 피드백 유도 */}
                <FadeInView delay={0.7} className="mb-4">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-5 text-white">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 mt-0.5" />
                            <div>
                                <h3 className="font-bold mb-1">의견을 들려주세요!</h3>
                                <p className="text-blue-100 text-sm">
                                    버그 신고, 기능 제안, 또는 그냥 하고 싶은 말이 있다면 언제든 연락주세요.
                                </p>
                                <Link href="/feedback">
                                    <button className="mt-3 bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                                        피드백 보내기 →
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </FadeInView>

                {/* Footer */}
                <FadeInView delay={0.8}>
                    <footer className="mt-8 pt-5 border-t border-gray-200 text-center">
                        <p className="text-xs text-text-tertiary/80 leading-relaxed mb-3">
                            이곳의 토론은 정답이 아닌, 다양한 가능성을 탐구하는 과정입니다.
                        </p>
                        <p className="text-[9px] text-text-tertiary/60 leading-relaxed mb-2">
                            본 서비스는 베타 테스트 중인 AI 시뮬레이션입니다. 생성된 콘텐츠는 사실과 다르거나 편향될 수 있으며,
                            왈가왈부는 정보의 정확성이나 신뢰성을 보장하지 않습니다. 특히 법률, 의료, 금융 등 전문적인 조언으로
                            활용하여 발생한 결과에 대해 서비스 제공자는 어떠한 법적 책임도 지지 않습니다.
                        </p>
                        <p className="text-[11px] text-text-secondary font-medium mb-2">
                            <Link href="/legal" className="hover:text-accent transition-colors underline underline-offset-2">이용약관</Link>
                            {' | '}
                            <Link href="/legal?tab=privacy" className="hover:text-accent transition-colors underline underline-offset-2">개인정보처리방침</Link>
                        </p>
                        {/* Powered by */}
                        <div className="flex items-center justify-center gap-2 mt-[10px] mb-4">
                            <span className="text-xs text-text-primary">Powered by</span>
                            <div className="flex items-center gap-3 ml-1">
                                <img src="/logos/gemini.svg" alt="Gemini" className="h-6" />
                                <img src="/logos/anthropic.svg" alt="Claude" className="h-6" />
                                <img src="/logos/openai.svg" alt="OpenAI" className="h-6" />
                                <img src="/logos/xai.svg" alt="Grok" className="h-6" />
                                <img src="/DeepSeek_logo.svg" alt="DeepSeek" className="h-6" />
                            </div>
                        </div>
                        <p className="text-[0.625rem] text-text-tertiary opacity-70">
                            © 2025 왈가왈부(WalGaWalBu) · v0.2.0
                        </p>
                    </footer>
                </FadeInView>
            </div>
        </section>
    );
}
