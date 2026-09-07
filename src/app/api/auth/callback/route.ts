import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/auth/server';
import { safeReturnTo } from '@/lib/auth/policy';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const next = safeReturnTo(url.searchParams.get('next'));
    try {
        const code = url.searchParams.get('code');
        if (!code || url.searchParams.has('error')) throw new Error('OAUTH_DENIED');
        const client = await createAuthClient();
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw new Error('OAUTH_EXCHANGE_FAILED');
        return NextResponse.redirect(new URL(next, url.origin), { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        const retry = new URL('/login', url.origin);
        retry.searchParams.set('error', 'callback');
        retry.searchParams.set('next', next);
        return NextResponse.redirect(retry, { headers: { 'Cache-Control': 'no-store' } });
    }
}
