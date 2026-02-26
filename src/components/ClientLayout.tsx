'use client';

import { ReactNode } from 'react';
import SmoothScroll from '@/components/SmoothScroll';
import BlobBackground from '@/components/BlobBackground';

interface ClientLayoutProps {
    children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <SmoothScroll>
            <BlobBackground />
            {children}
        </SmoothScroll>
    );
}
