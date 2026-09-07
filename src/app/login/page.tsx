'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, LogIn, ShieldCheck, Trophy } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { safeReturnTo } from '@/lib/auth/policy';
import './login.css';

function Login() {
    const params = useSearchParams();
    const auth = useAuth();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const next = safeReturnTo(params.get('next'));
    const login = async () => {
        setPending(true); setError('');
        try {
            const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ next }), signal: AbortSignal.timeout(8000) });
            const data = await response.json();
            if (!response.ok || !data.url) throw new Error(data.error || '로그인을 시작하지 못했어요.');
            window.location.assign(data.url);
        } catch (caught) { setError(caught instanceof Error ? caught.message : '로그인을 시작하지 못했어요.'); setPending(false); }
    };
    return <div className="page-container login-page"><section className="login-card"><div className="login-art"><span className="eyebrow"><Trophy size={15} /> JOIN THE AI ARENA</span><Image src="/characters/series-01/01-lumi.png" width={500} height={500} alt="손을 내밀며 반기는 캐릭터 루미" priority /><span className="login-sticker">어떤 AI를 응원하나요?</span></div><div className="login-copy"><span className="eyebrow">WELCOME TO THE CLUB</span><h1>로그인하고<br />AI 배틀을 시작해요</h1><p>대진표는 자유롭게 만들고<br />로그인한 계정으로 AI들의 진검승부를 열어 보세요</p><div className="login-perks"><span><Trophy size={17} /> 다양한 AI 모델과 토론 배틀</span><span><ShieldCheck size={17} /> 내 계정으로 이용 내역 확인</span></div>{auth.loading ? <p role="status">로그인 상태를 확인하고 있어요…</p> : auth.user ? <Link href={next} className="button button-primary">배틀로 돌아가기 <ArrowRight size={18} /></Link> : <button className="button google-login" onClick={login} disabled={pending || !auth.configured}>{pending ? <Loader2 size={20} className="spin" /> : <LogIn size={20} />}{pending ? 'Google로 이동하는 중…' : 'Google로 계속하기'}</button>}{!auth.loading && !auth.configured && <p className="inline-alert" role="status">로그인 오픈을 준비하고 있어요<br />주제와 캐릭터는 지금 둘러볼 수 있어요</p>}{(error || auth.error || params.has('error')) && <div className="inline-alert" role="alert">{error || auth.error || '로그인을 완료하지 못했어요. 다시 시도해 주세요.'}{auth.error && <button onClick={() => void auth.refresh()} className="text-link">다시 확인</button>}</div>}<p className="login-legal"><Link href="/legal">이용약관</Link>과 <Link href="/legal?tab=privacy">개인정보처리방침</Link>을 확인해 주세요</p><Link href="/topics" className="text-link">먼저 주제 둘러보기 <ArrowRight size={16} /></Link></div></section></div>;
}
export default function LoginPage() { return <Suspense fallback={<div className="page-container">로그인을 준비하고 있어요…</div>}><Login /></Suspense>; }
