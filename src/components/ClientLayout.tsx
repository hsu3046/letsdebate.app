'use client';

import { ReactNode, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import AppShell from '@/components/AppShell';

interface ClientLayoutProps {
    children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
    useEffect(() => {
        // Retire only the old credential store; debate records and bookmarks stay intact.
        try { localStorage.removeItem('letsdebate_api_keys'); }
        catch { console.warn('이전 API 연결 정보를 지우지 못했습니다. 브라우저 저장소를 확인해주세요.'); }
    }, []);
    return (
        <MotionConfig reducedMotion="user">
            <AppShell>{children}</AppShell>
        </MotionConfig>
    );
}
