'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface Session { configured: boolean; user: { id: string; name: string } | null }
interface AuthState extends Session { loading: boolean; error: string; refresh: () => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session>({ configured: false, user: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const sequence = useRef(0);
    const refresh = useCallback(async () => {
        const current = ++sequence.current;
        try {
            const response = await fetch('/api/auth/session', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '로그인 상태를 확인하지 못했어요.');
            if (current === sequence.current) { setSession(data); setError(''); }
        } catch (caught) {
            if (current === sequence.current) { setSession({ configured: true, user: null }); setError(caught instanceof Error ? caught.message : '로그인 상태를 확인하지 못했어요.'); }
        } finally { if (current === sequence.current) setLoading(false); }
    }, []);
    const invalidate = useCallback(() => { sequence.current++; }, []);
    useEffect(() => {
        void refresh();
        const check = () => { void refresh(); };
        window.addEventListener('focus', check);
        return () => { invalidate(); window.removeEventListener('focus', check); };
    }, [refresh, invalidate]);
    const logout = async () => {
        sequence.current++;
        const response = await fetch('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(8000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '로그아웃하지 못했어요.');
        sequence.current++;
        setSession(value => ({ ...value, user: null }));
        setError('');
    };
    return <AuthContext.Provider value={{ ...session, loading, error, refresh, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('AuthProvider is required');
    return context;
}
