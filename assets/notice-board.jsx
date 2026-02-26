import React, { useState } from 'react';
import { Bell, Lightbulb, Rocket, Users, ChevronDown, ChevronUp, Sparkles, Calendar, AlertCircle } from 'lucide-react';

// 캐릭터 데이터
const characters = [
  { id: 'claude', name: '클로드 교수', emoji: '🎓', mbti: 'INFJ', trait: '논리+공감', desc: '깊이 있는 분석과 따뜻한 시선. 본질적인 질문을 던집니다.', color: 'bg-indigo-100 border-indigo-300' },
  { id: 'grok', name: '그록 기자', emoji: '📰', mbti: 'ENTP', trait: '팩트폭격', desc: '냉소적이고 직설적. 데이터와 트렌드로 상대를 압박합니다.', color: 'bg-orange-100 border-orange-300' },
  { id: 'jenny', name: '지니 작가', emoji: '✍️', mbti: 'ENFP', trait: '감성충만', desc: '이야기와 비유의 달인. 사람 중심의 따뜻한 관점을 제시합니다.', color: 'bg-pink-100 border-pink-300' },
  { id: 'max', name: '맥스 대표', emoji: '💼', mbti: 'ENTJ', trait: '결론지향', desc: '효율과 실행력의 화신. "그래서 어쩌자고?"를 외칩니다.', color: 'bg-slate-100 border-slate-300' },
  { id: 'sophie', name: '소피 변호사', emoji: '⚖️', mbti: 'INFJ', trait: '정의로움', desc: '약자의 편에 서서 권리와 윤리를 이야기합니다.', color: 'bg-purple-100 border-purple-300' },
  { id: 'leo', name: '레오 트레이더', emoji: '📈', mbti: 'ENTP', trait: '현실주의', desc: '숫자로 말하는 냉정한 현실주의자. 감정은 빼고 손익만 따집니다.', color: 'bg-emerald-100 border-emerald-300' },
  { id: 'hana', name: '하나 선생님', emoji: '🍎', mbti: 'ENFP', trait: '쉬운설명', desc: '어려운 것도 쉽게! 아이들과 미래를 생각하는 따뜻한 시선.', color: 'bg-red-100 border-red-300' },
  { id: 'victor', name: '빅터 박사', emoji: '🤖', mbti: 'ENTJ', trait: '기술전문', desc: 'AI 연구의 최전선. 과장과 공포 모두를 경계하는 냉철한 분석가.', color: 'bg-cyan-100 border-cyan-300' },
];

// 추천 매치업
const recommendedMatchups = [
  { chars: ['빅터 박사', '지니 작가'], reason: '논리 vs 감성의 극과극 대결', icon: '🔥' },
  { chars: ['레오 트레이더', '소피 변호사'], reason: '현실 vs 정의, 치열한 가치 충돌', icon: '⚔️' },
  { chars: ['그록 기자', '하나 선생님'], reason: '냉소 vs 희망, 세대 관점 충돌', icon: '💥' },
  { chars: ['맥스 대표', '클로드 교수'], reason: '실행 vs 신중, 속도와 깊이의 대결', icon: '🎯' },
];

// 업데이트 로그
const updates = [
  { date: '2024.12.12', version: 'v0.2.0', title: '캐릭터 시스템 개편', desc: '8종 캐릭터의 말투와 성격이 더욱 뚜렷해졌습니다.', type: 'feature' },
  { date: '2024.12.10', version: 'v0.1.5', title: '토론 속도 개선', desc: 'AI 응답 속도가 평균 40% 빨라졌습니다.', type: 'improve' },
  { date: '2024.12.08', version: 'v0.1.0', title: '베타 서비스 오픈', desc: '왈가왈부가 세상에 첫 발을 내딛었습니다!', type: 'release' },
];

// 로드맵
const roadmap = [
  { status: 'done', title: '8종 캐릭터 시스템', desc: '개성 넘치는 AI 토론자들' },
  { status: 'progress', title: '토론 결과 통계', desc: 'MVP 선정, 능력치 분석' },
  { status: 'planned', title: '실시간 투표', desc: '누가 이겼는지 직접 투표' },
  { status: 'planned', title: '새 캐릭터 영입', desc: '더 다양한 관점의 토론자들' },
  { status: 'planned', title: '토론 공유하기', desc: 'VS 배틀 카드 생성' },
];

export default function NoticeBoard() {
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedChar, setSelectedChar] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Bell className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-800">알림판</h1>
          <span className="text-sm text-slate-500 ml-auto">왈가왈부</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {/* 베타 배너 */}
        <section className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 text-white shadow-lg">
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
                지금은 <strong>'왈가왈부'</strong>가 성장하는 중이에요! 
                더 재미있는 토론을 위해 예고 없이 새로운 기능이 생기거나, 
                기존 기능이 변경될 수 있습니다. 
                가끔 엉뚱한 대답을 하더라도 너그럽게 이해해 주시고, 
                함께 성장하는 과정을 지켜봐 주세요!
              </p>
            </div>
          </div>
        </section>

        {/* 꿀잼 토론 팁 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            onClick={() => toggleSection('tips')}
            className="w-full p-5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <div className="bg-yellow-100 rounded-full p-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-left flex-1">
              <h2 className="font-bold text-slate-800">꿀잼 토론 만드는 노하우</h2>
              <p className="text-sm text-slate-500">어떻게 하면 더 치열하고 재밌는 결과가 나올까요?</p>
            </div>
            {expandedSection === 'tips' ? 
              <ChevronUp className="w-5 h-5 text-slate-400" /> : 
              <ChevronDown className="w-5 h-5 text-slate-400" />
            }
          </button>
          
          {expandedSection === 'tips' && (
            <div className="px-5 pb-5 space-y-5 border-t border-slate-100 pt-4">
              {/* 팁 1 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  주제는 구체적일수록 좋아요!
                </h3>
                <div className="ml-8 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg">
                    <span>👎</span>
                    <span className="line-through">"점심 메뉴"</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg">
                    <span>👍</span>
                    <span>"비 오는 날 점심: 파전에 막걸리 vs 뜨끈한 짬뽕"</span>
                  </div>
                  <p className="text-slate-500 mt-2">
                    주제가 구체적일수록 참가자들의 입담이 훨씬 더 생생해집니다.
                  </p>
                </div>
              </div>

              {/* 팁 2 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  상극인 캐릭터를 붙여보세요!
                </h3>
                <div className="ml-8 space-y-2">
                  {recommendedMatchups.map((match, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg text-sm">
                      <span>{match.icon}</span>
                      <span className="font-medium text-slate-700">{match.chars.join(' vs ')}</span>
                      <span className="text-slate-500">— {match.reason}</span>
                    </div>
                  ))}
                  <p className="text-slate-500 text-sm mt-2">
                    너무 비슷한 성격끼리 붙으면 서로 칭찬만 하다가 끝날 수도 있어요! (그것도 나름 재미있지만요.)
                  </p>
                </div>
              </div>

              {/* 팁 3 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                  밸런스 붕괴 질문을 던져보세요!
                </h3>
                <div className="ml-8">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg text-sm">
                    <p className="text-purple-700 font-medium">
                      "평생 고기만 먹기 vs 평생 밀가루만 먹기"
                    </p>
                    <p className="text-slate-500 mt-1">
                      정답이 없는 황당한 밸런스 게임을 던져주면, 
                      AI들이 진지하게 논리적으로 싸우는 엉뚱한 모습을 볼 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* AI 캐릭터 소개 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            onClick={() => toggleSection('characters')}
            className="w-full p-5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <div className="bg-purple-100 rounded-full p-2">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left flex-1">
              <h2 className="font-bold text-slate-800">AI 토론자들 소개</h2>
              <p className="text-sm text-slate-500">8명의 개성 넘치는 토론 참가자들을 만나보세요</p>
            </div>
            {expandedSection === 'characters' ? 
              <ChevronUp className="w-5 h-5 text-slate-400" /> : 
              <ChevronDown className="w-5 h-5 text-slate-400" />
            }
          </button>
          
          {expandedSection === 'characters' && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-2 gap-3">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedChar(selectedChar === char.id ? null : char.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${char.color} ${
                      selectedChar === char.id ? 'ring-2 ring-blue-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{char.emoji}</span>
                      <span className="font-semibold text-slate-800 text-sm">{char.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="bg-white/60 px-1.5 py-0.5 rounded">{char.mbti}</span>
                      <span className="text-slate-600">{char.trait}</span>
                    </div>
                    {selectedChar === char.id && (
                      <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200/50">
                        {char.desc}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 로드맵 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            onClick={() => toggleSection('roadmap')}
            className="w-full p-5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <div className="bg-green-100 rounded-full p-2">
              <Rocket className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left flex-1">
              <h2 className="font-bold text-slate-800">앞으로의 계획</h2>
              <p className="text-sm text-slate-500">왈가왈부는 계속 진화합니다</p>
            </div>
            {expandedSection === 'roadmap' ? 
              <ChevronUp className="w-5 h-5 text-slate-400" /> : 
              <ChevronDown className="w-5 h-5 text-slate-400" />
            }
          </button>
          
          {expandedSection === 'roadmap' && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <div className="space-y-3">
                {roadmap.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      item.status === 'done' ? 'bg-green-500' :
                      item.status === 'progress' ? 'bg-yellow-500 animate-pulse' :
                      'bg-slate-300'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{item.title}</span>
                        {item.status === 'done' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">완료</span>
                        )}
                        {item.status === 'progress' && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">진행중</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 업데이트 로그 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            onClick={() => toggleSection('updates')}
            className="w-full p-5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <div className="bg-blue-100 rounded-full p-2">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left flex-1">
              <h2 className="font-bold text-slate-800">업데이트 기록</h2>
              <p className="text-sm text-slate-500">최근 변경 사항을 확인하세요</p>
            </div>
            {expandedSection === 'updates' ? 
              <ChevronUp className="w-5 h-5 text-slate-400" /> : 
              <ChevronDown className="w-5 h-5 text-slate-400" />
            }
          </button>
          
          {expandedSection === 'updates' && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
              {updates.map((update, i) => (
                <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="text-center">
                    <div className="text-xs text-slate-500">{update.date}</div>
                    <div className={`text-xs font-mono mt-1 px-2 py-0.5 rounded ${
                      update.type === 'feature' ? 'bg-purple-100 text-purple-700' :
                      update.type === 'improve' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {update.version}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{update.title}</div>
                    <div className="text-xs text-slate-500">{update.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 피드백 유도 */}
        <section className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <h3 className="font-bold mb-1">의견을 들려주세요!</h3>
              <p className="text-blue-100 text-sm">
                버그 신고, 기능 제안, 또는 그냥 하고 싶은 말이 있다면 언제든 연락주세요. 
                여러분의 피드백이 왈가왈부를 더 재미있게 만듭니다.
              </p>
              <button className="mt-3 bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                피드백 보내기 →
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* 푸터 */}
      <footer className="text-center py-6 text-sm text-slate-400">
        <p>왈가왈부 Beta v0.2.0</p>
        <p className="mt-1">© 2024 Let's Debate. All rights reserved.</p>
      </footer>
    </div>
  );
}
