'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CircleUserRound, LogIn } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function AccountLink({ compact = false }: { compact?: boolean }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const params = useSearchParams();
    const next = pathname + (params.size ? `?${params}` : '');
    if (loading) return <span className={compact ? 'account-link compact' : 'nav-item account-link'} aria-label="로그인 상태 확인 중"><CircleUserRound size={20} />{!compact && '확인 중…'}</span>;
    return <Link className={compact ? 'account-link compact' : 'nav-item account-link'} href={user ? '/account' : `/login?next=${encodeURIComponent(next)}`}><>{user ? <CircleUserRound size={20} /> : <LogIn size={20} />}{compact ? (user ? '내 계정' : '로그인') : (user ? user.name : '로그인')}</></Link>;
}
