'use client';

import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <div>
            {children}
        </div>
    );
}

// Hook for compatibility (always returns light)
export function useTheme() {
    return {
        theme: 'light' as const,
        mounted: true,
    };
}

