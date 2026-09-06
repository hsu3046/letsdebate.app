'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Compass, House, Library, Plus, CircleHelp, MessageCircle, Bell, Trophy } from 'lucide-react';

const navigation = [
    { href: '/', label: '발견하기', icon: House },
    { href: '/tournament', label: '토너먼트', icon: Trophy },
    { href: '/topics', label: '주제 둘러보기', icon: Compass },
    { href: '/history', label: '나의 토론', icon: Library },
];

export default function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    // A live debate owns its viewport and controls; navigation could interrupt it.
    if (pathname === '/arena') return <main id="main-content" className="arena-shell">{children}</main>;

    return (
        <div className="app-shell">
            <a className="skip-link" href="#main-content">본문으로 바로가기</a>
            <aside className="desktop-sidebar" aria-label="주 탐색">
                <Link href="/" className="brand"><Image src="/logo_light.svg" width={42} height={42} alt="" /><span>왈가왈부<small>AI 모델들의 토론 배틀</small></span></Link>
                <Link className="button button-primary sidebar-start" href="/tournament/new"><Plus size={18} /> 토너먼트 만들기</Link>
                <span className="nav-caption">THE CLUBHOUSE</span>
                <nav>{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`nav-item ${pathname === href ? 'active' : ''}`}><Icon size={19} />{label}{pathname === href && <span className="nav-dot" />}</Link>)}</nav>
                <div className="sidebar-bottom">
                    <div className="sidebar-note"><div className="sidebar-mascot"><Image src="/avatars/avatar_mc.jpeg" width={120} height={120} alt="" /><span>READY?</span></div><p>어떤 AI가 이길까요?<br /><strong>토론으로 확인해 보세요</strong></p><Link href="/help">경기 방법 알아보기 <ArrowUpRight size={15} /></Link></div>
                    <Link className="nav-item" href="/notice"><Bell size={18} /> 알림판</Link>
                    <Link className="nav-item" href="/help"><CircleHelp size={18} /> 이용 가이드</Link>

                    <div className="sidebar-credit"><Trophy size={10} />WALGAWALBU CUP <span>BETA</span></div>
                </div>
            </aside>
            <header className="mobile-header"><Link href="/" className="brand"><Image src="/logo_light.svg" width={34} height={34} alt="" /><span>왈가왈부</span></Link><Link href="/help" className="icon-button" aria-label="이용 가이드"><CircleHelp size={20} /></Link></header>
            <div className="app-content">
                <main id="main-content" tabIndex={-1}>{children}</main>
                <footer className="app-footer"><div><strong>왈가왈부</strong><span>여러 AI가 맞붙는 토론 배틀</span></div><nav aria-label="서비스 정보"><Link href="/feedback"><MessageCircle size={13} /> 의견 보내기</Link><Link href="/legal">이용약관</Link><Link href="/legal?tab=privacy">개인정보처리방침</Link></nav><p>AI의 답변에는 오류가 있을 수 있어요. 중요한 정보는 직접 확인해 주세요.</p><small>© 2026 <a href="https://aib.vote/" target="_blank" rel="noopener noreferrer">에이아이비 주식회사</a></small></footer>
            </div>
            <nav className="mobile-nav" aria-label="모바일 주 탐색">{navigation.map(({ href, label, icon: Icon }) => <Link href={href} key={href} aria-current={pathname === href ? 'page' : undefined} className={pathname === href ? 'active' : ''}><Icon size={21} /><span>{label}</span></Link>)}</nav>
        </div>
    );
}
