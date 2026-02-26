'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare } from 'lucide-react';

function LegalContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

    // URL query param에 따라 탭 설정
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'privacy') {
            setActiveTab('privacy');
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen">
            {/* Header + Tabs (sticky) */}
            <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm border-b border-glass-border z-10">
                {/* Header */}
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-text-tertiary hover:text-text-primary transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-text-primary">이용약관 및 정책</h1>
                </div>

                {/* Tabs - 중앙 정렬 */}
                <div className="max-w-3xl mx-auto px-4">
                    <div className="flex justify-center gap-2 border-t border-glass-border">
                        <button
                            onClick={() => setActiveTab('terms')}
                            className={`px-4 py-3 text-base font-bold transition-colors relative ${activeTab === 'terms'
                                ? 'text-primary-purple'
                                : 'text-text-tertiary hover:text-text-secondary'
                                }`}
                        >
                            이용약관
                            {activeTab === 'terms' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-purple" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`px-4 py-3 text-base font-bold transition-colors relative ${activeTab === 'privacy'
                                ? 'text-primary-purple'
                                : 'text-text-tertiary hover:text-text-secondary'
                                }`}
                        >
                            개인정보처리방침
                            {activeTab === 'privacy' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-purple" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-6">
                {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
        </div>
    );
}

// 이용약관 컴포넌트
function TermsContent() {
    return (
        <article className="space-y-6">
            <h1 className="text-2xl font-bold text-text-primary mb-6">베타 서비스 이용약관</h1>

            <Section title="제 1 조 (목적 및 정의)">
                <p>
                    본 약관은 &apos;왈가왈부&apos;(이하 &quot;서비스&quot;)의 베타 테스트 이용과 관련하여,
                    <strong> 서비스 제공자</strong>(이하 &quot;제공자&quot;)와 사용자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
                    본 서비스는 정식 출시 전 기술적 안정성을 검증하기 위한 오픈 베타 버전입니다.
                </p>
            </Section>

            <Section title="제 2 조 (서비스의 변경 및 운영)">
                <ol className="list-decimal list-outside ml-5 space-y-3">
                    <li>
                        <strong>기능 변경 : </strong> 제공자는 서비스의 향상이나 운영상의 필요(서버 비용, 트래픽 관리 등)에 따라,
                        사전 예고 없이 서비스의 기능, 인터페이스, 사용 가능한 AI 모델의 종류를 수정, 추가 또는 삭제할 수 있습니다.
                    </li>
                    <li>
                        <strong>이용 한도 : </strong> 무료로 제공되는 일일 이용 횟수나 토론의 길이는 API 비용 변동 및 정책 변경에 따라
                        사전 고지 없이 조정(증감)될 수 있습니다.
                    </li>
                    <li>
                        <strong>서비스 중단 : </strong> 제공자는 긴급한 시스템 점검, 통신 두절, 운영상의 불가피한 사유가 발생한 경우
                        서비스 이용을 일시적으로 중단할 수 있습니다.
                    </li>
                </ol>
            </Section>

            <Section title="제 3 조 (데이터의 수집 및 관리)">
                <ol className="list-decimal list-outside ml-5 space-y-3">
                    <li>
                        <strong>계정 미생성 : </strong> 본 서비스는 별도의 회원 가입 절차 없이 이용 가능하며,
                        제공자는 사용자의 이름, 연락처 등 개인 식별 정보를 수집하지 않습니다. (추후 소셜 로그인 도입 시 별도 안내)
                    </li>
                    <li>
                        <strong>로그 수집 : </strong> 서비스 품질 향상 및 AI 모델의 고도화를 위해,
                        사용자가 입력한 토론 주제와 AI가 생성한 대화 기록은 서버에 익명화된 상태로 저장 및 활용될 수 있습니다.
                    </li>
                    <li>
                        <strong>데이터 초기화 : </strong> 베타 테스트 기간 중 생성된 모든 데이터는 정식 출시 과정이나 서버 점검 시
                        사전 예고 없이 초기화(삭제)될 수 있으며, 제공자는 이에 대한 복구 의무를 지지 않습니다.
                    </li>
                </ol>
            </Section>

            <Section title="제 4 조 (AI 생성 콘텐츠에 대한 면책)">
                <ol className="list-decimal list-outside ml-5 space-y-3">
                    <li>
                        본 서비스의 모든 텍스트는 인공지능(생성형AI)에 의해 실시간으로 생성됩니다.
                        AI는 기술적 한계로 인해 사실과 다른 정보나 편향된 내용을 생성할 수 있습니다.
                    </li>
                    <li>
                        제공자는 AI가 생성한 정보의 정확성, 완전성, 적법성을 보장하지 않으며,
                        사용자가 이를 신뢰하여 발생한 결과에 대해 어떠한 책임도 지지 않습니다.
                    </li>
                </ol>
            </Section>

            <Section title="제 5 조 (권리 및 의무)">
                <ol className="list-decimal list-outside ml-5 space-y-3">
                    <li>
                        사용자가 서비스 내에서 제공한 피드백(버그 제보, 기능 제안 등)에 대한 지식재산권은 제공자에게 귀속되며,
                        이는 서비스 개선을 위해 자유롭게 활용될 수 있습니다.
                    </li>
                    <li>
                        사용자는 AI에게 욕설, 혐오 발언, 성적 수치심을 유발하는 내용, 범죄 모의 등 부적절한 입력을 해서는 안 되며,
                        위반 시 IP 차단 등의 조치를 받을 수 있습니다.
                    </li>
                </ol>
            </Section>

            <Section title="부칙">
                <p>본 약관은 2025년 12월 13일부터 적용됩니다.</p>
            </Section>
        </article>
    );
}

// 개인정보처리방침 컴포넌트
function PrivacyContent() {
    return (
        <article className="space-y-6">
            <h1 className="text-2xl font-bold text-text-primary mb-6">개인정보처리방침</h1>

            <Section title="1. 수집하는 정보의 항목">
                <p>
                    본 서비스는 별도의 회원가입 절차 없이 운영되며, 사용자의 이름, 연락처, 비밀번호 등
                    <strong> 개인 식별 정보(PII)를 수집하지 않습니다. </strong>
                    단, 서비스 이용 과정에서 아래와 같은 기술적 정보가 자동으로 생성되어 수집될 수 있습니다.
                </p>
                <ul className="list-disc ml-5 mt-3 space-y-1">
                    <li><strong>필수 수집 항목:</strong> 접속 IP 정보, 쿠키, 접속 로그, 브라우저 및 OS 정보</li>
                    <li><strong>서비스 이용 기록:</strong> 사용자가 입력한 토론 주제 및 AI와의 토론 내용</li>
                </ul>
            </Section>

            <Section title="2. 정보의 수집 및 이용 목적">
                <p>수집된 정보는 다음의 목적을 위해서만 이용됩니다.</p>
                <ul className="list-disc ml-5 mt-3 space-y-1">
                    <li>서비스 안정화 및 부정 이용 방지 (IP 차단 등)</li>
                    <li>AI 모델의 학습 및 토론 품질의 개선</li>
                    <li>서비스 이용 통계 분석</li>
                </ul>
            </Section>

            <Section title="3. 개인정보의 보유 및 이용 기간">
                <p>
                    원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
                    단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.
                </p>

                <SubSection title="(1) 서비스 개선 및 AI 학습 데이터">
                    <ul className="list-disc ml-5 space-y-1">
                        <li><strong>보존 항목:</strong> 사용자가 입력한 토론 주제 및 AI와의 토론 내용</li>
                        <li><strong>보존 근거:</strong> 서비스 품질 향상 및 AI 모델 고도화</li>
                        <li><strong>보존 기간:</strong> 서비스 종료 시까지 (단, 익명화된 데이터는 준영구 보관)</li>
                    </ul>
                </SubSection>

                <SubSection title="(2) 관계 법령 및 시스템 보안">
                    <ul className="list-disc ml-5 space-y-1">
                        <li><strong>보존 항목:</strong> 접속 로그, 접속 IP 정보, 불량 이용 기록</li>
                        <li><strong>보존 근거:</strong> 통신비밀보호법 및 서비스 보안 유지</li>
                        <li><strong>보존 기간:</strong> 3개월</li>
                    </ul>
                </SubSection>
            </Section>

            <Section title="4. 제3자 제공 및 위탁">
                <p>
                    제공자는 사용자의 정보를 원칙적으로 외부에 제공하지 않습니다.
                    단, 서버 운영을 위해 클라우드 서비스를 이용할 수 있으며,
                    이 경우에도 데이터는 암호화되어 안전하게 관리됩니다.
                </p>
            </Section>

            <Section title="5. 사용자의 권리 및 행사 방법">
                <ol className="list-decimal list-outside ml-5 space-y-3">
                    <li>
                        <strong>수집 거부 : </strong> 사용자는 언제든지 서비스 이용을 중단하거나,
                        개인의 브라우저의 쿠키 및 저장소 기록을 삭제함으로써 더 이상의 정보 수집을 거부할 수 있습니다.
                    </li>
                    <li>
                        <strong>삭제 요청의 한계 : </strong> 본 서비스는 오픈 베타 기간 중 별도의 회원가입 없이 익명으로 운영되므로,
                        <strong> 서비스 제공자는 특정 사용자의 로그를 식별하여 검색하거나 삭제할 수 없습니다.</strong>
                    </li>
                    <li>
                        <strong>데이터의 귀속 : </strong> 따라서 사용자가 서비스 이용을 중단하더라도,
                        <strong> 이전에 수집된 익명화된 대화 기록 및 토론 데이터는 삭제되지 않으며</strong>,
                        서비스 품질 향상 및 AI 연구 목적으로 계속 활용될 수 있습니다.
                    </li>
                </ol>
            </Section>

            <Section title="6. 개인정보 보호책임 및 고충처리">
                <p>
                    서비스 이용 중 발생하는 모든 개인정보 보호 관련 문의, 불만 처리, 피해 구제 등에 관한 사항은
                    아래의 창구를 통해 문의해 주시기 바랍니다. 제공자는 사용자의 문의에 대해 신속하고 성실하게 답변하겠습니다.
                </p>
                <div className="flex justify-center mt-4">
                    <Link
                        href="/feedback"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors"
                    >
                        <MessageSquare size={20} />
                        문의하기
                    </Link>
                </div>
            </Section>

            {/* 피드백 버튼 */}
            <div className="pt-6 border-t border-glass-border">
                <Link
                    href="/feedback"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-primary-purple text-white font-bold rounded-xl hover:bg-primary-purple/90 transition-colors"
                >
                    <MessageSquare size={20} />
                    고객센터 및 피드백 문의하기
                </Link>
            </div>
        </article>
    );
}

// 섹션 컴포넌트
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            <div className="text-base text-text-secondary leading-relaxed space-y-3">
                {children}
            </div>
        </section>
    );
}

// 서브섹션 컴포넌트
function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-4 ml-4 space-y-2">
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            <div className="text-base text-text-secondary">
                {children}
            </div>
        </div>
    );
}

export default function LegalPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
            <LegalContent />
        </Suspense>
    );
}
