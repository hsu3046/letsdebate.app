import { createAuthClient, authJSON, AUTH_UNAVAILABLE } from '@/lib/auth/server';
import { isSameOrigin, safeReturnTo } from '@/lib/auth/policy';

export async function POST(request: Request) {
    if (!isSameOrigin(request)) return authJSON({ error: '요청한 페이지를 확인해 주세요.' }, 403);
    try {
        const body = await request.json().catch(() => ({}));
        const origin = new URL(request.url).origin;
        const callback = new URL('/api/auth/callback', origin);
        callback.searchParams.set('next', safeReturnTo(body.next));
        const client = await createAuthClient();
        const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback.toString(), skipBrowserRedirect: true } });
        if (error || !data.url) throw new Error('OAUTH_START_FAILED');
        return authJSON({ url: data.url });
    } catch { return authJSON({ error: AUTH_UNAVAILABLE }, 503); }
}
