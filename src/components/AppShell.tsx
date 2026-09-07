'use client';

import { Suspense, type ReactNode } from 'react';
import AccountLink from './AccountLink';
import '@/app/login/login.css';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Compass, House, Library, CircleHelp, MessageCircle, Bell, Trophy, UsersRound } from 'lucide-react';

const navigation = [
    { href: '/', label: '메인', icon: House },
    { href: '/tournament', label: '토론 배틀', icon: Trophy },
    { href: '/topics', label: '토론 주제 찾기', icon: Compass },
    { href: '/history', label: '경기 결과', icon: Library },
];

const desktopNavigation = [...navigation.slice(0, 1), { href: '/characters', label: '출전 선수', icon: UsersRound }, ...navigation.slice(1)];

export default function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    // A live debate owns its viewport and controls; navigation could interrupt it.
    if (pathname === '/arena') return <main id="main-content" className="arena-shell">{children}</main>;

    return (
        <div className="app-shell">
            <a className="skip-link" href="#main-content">본문으로 바로가기</a>
            <aside className="desktop-sidebar" aria-label="주 탐색">
                <Link href="/" className="brand"><Image src="/logo_light.svg" width={42} height={42} alt="" /><span>왈가왈부</span></Link>
                <nav>{desktopNavigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`nav-item ${pathname === href ? 'active' : ''}`}><Icon size={19} />{label}{pathname === href && <span className="nav-dot" />}</Link>)}</nav>
                <div className="sidebar-bottom"><Suspense fallback={null}><AccountLink /></Suspense>
                    <Link className="nav-item" href="/notice"><Bell size={18} /> 공지사항</Link>
                    <Link className="nav-item" href="/help"><CircleHelp size={18} /> 이용 가이드</Link>
                    <Link className="nav-item" href="/feedback"><MessageCircle size={18} /> 의견 보내기</Link>

                </div>
            </aside>
            <header className="mobile-header"><Link href="/" className="brand"><Image src="/logo_light.svg" width={34} height={34} alt="" /><span>왈가왈부</span></Link><Suspense fallback={null}><AccountLink compact /></Suspense></header>
            <div className="app-content">
                <main id="main-content" tabIndex={-1}>{children}</main>
                <footer className="app-footer"><div><strong>왈가왈부</strong><span>최신 AI들의 진검 토론 승부</span></div><nav aria-label="서비스 정보"><Link className="mobile-feedback-link" href="/feedback"><MessageCircle size={13} /> 의견 보내기</Link><Link href="/legal">이용약관</Link><Link href="/legal?tab=privacy">개인정보처리방침</Link></nav><small>© 2026 <a href="https://aib.vote/" target="_blank" rel="noopener noreferrer">에이아이비 주식회사</a></small></footer>
            </div>
            <nav className="mobile-nav" aria-label="모바일 주 탐색">{navigation.map(({ href, label, icon: Icon }) => <Link href={href} key={href} aria-current={pathname === href ? 'page' : undefined} className={pathname === href ? 'active' : ''}><Icon size={21} /><span>{label}</span></Link>)}</nav>
        </div>
    );
}
