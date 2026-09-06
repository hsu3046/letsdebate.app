'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LogOut, RefreshCw, Trophy } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import '../login/login.css';
interface Usage { match: { limit: number; remaining: number }; assist: { limit: number; remaining: number }; recent: { id: string; operation: string; status: string; createdAt: string }[] }

export default function AccountPage() {
    const auth = useAuth();
    const [usage, setUsage] = useState<Usage | null>(null);
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const sequence = useRef(0);
    const refresh = useCallback(async () => {
        const current = ++sequence.current;
        setPending(true); setError('');
        try {
            const response = await fetch('/api/account', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '이용 내역을 불러오지 못했어요.');
            if (current === sequence.current) setUsage(data);
        } catch (caught) { if (current === sequence.current) { setUsage(null); setError(caught instanceof Error ? caught.message : '이용 내역을 불러오지 못했어요.'); } }
        finally { if (current === sequence.current) setPending(false); }
    }, []);
    const userId = auth.user?.id;
    const invalidate = useCallback(() => { sequence.current++; }, []);
    useEffect(() => { if (userId) void refresh(); else setUsage(null); return invalidate; }, [userId, refresh, invalidate]);
    const logout = async () => {
        setPending(true); setError('');
        try { await auth.logout(); setUsage(null); }
        catch (caught) { setError(caught instanceof Error ? caught.message : '로그아웃하지 못했어요.'); }
        finally { setPending(false); }
    };
    return <div className="page-container"><header className="page-heading"><span className="eyebrow">MY CLUBHOUSE</span><h1>나의 계정</h1><p>{auth.user ? `${auth.user.name} 님의 AI 배틀 이용 내역` : '로그인하고 AI 토론 배틀을 시작해 보세요'}</p></header>{auth.loading ? <p role="status">로그인 상태를 확인하고 있어요…</p> : !auth.user ? <Link href="/login?next=%2Faccount" className="button button-primary">로그인하기 <ArrowRight size={18} /></Link> : <><section className="account-panel"><h2><Trophy size={24} /> 오늘의 배틀</h2>{usage ? <><p>오늘 남은 경기 <strong>{usage.match.remaining} / {usage.match.limit}</strong></p><p>4강 토너먼트는 총 3경기예요<br />경기를 시작하면 1회가 차감되고 매일 한국 시간 자정에 새로 채워져요</p></> : <p role="status">{pending ? '이용 내역을 불러오는 중…' : '이용 내역을 다시 확인해 주세요'}</p>}</section><div className="page-actions"><Link href="/tournament/new" className="button button-primary">토론 배틀 만들기 <ArrowRight size={18} /></Link><button className="button button-secondary" disabled={pending} onClick={() => void refresh()}><RefreshCw size={16} /> 새로고침</button></div>{usage && <section className="account-panel"><h2>최근 AI 이용 내역</h2>{usage.recent.length ? <ul className="account-history">{usage.recent.map(item => <li key={item.id}><span>{item.operation === 'match' ? '토너먼트 경기' : '캐릭터 토론'}<br /><small>{new Date(item.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</small></span><span>{item.status === 'completed' ? '완료' : item.status === 'running' ? '진행 중' : '중단'}</span></li>)}</ul> : <p>아직 시작한 AI 경기가 없어요</p>}</section>}<button className="text-link" disabled={pending} onClick={logout}><LogOut size={16} /> 로그아웃</button></>}{(error || auth.error) && <p className="inline-alert" role="alert">{error || auth.error}</p>}</div>;
}
