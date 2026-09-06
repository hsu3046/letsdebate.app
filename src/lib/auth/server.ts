import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const AUTH_UNAVAILABLE = '로그인을 준비하고 있어요. 잠시 후 다시 시도해 주세요.';
export function isAuthConfigured() {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
}

const timedFetch: typeof fetch = (input, init) => fetch(input, {
    ...init, cache: 'no-store', signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(2500)]),
});

// Used only in Route Handlers, where refreshed cookies can be written.
// Public pages do not call Auth during server rendering.
export async function createAuthClient() {
    if (!isAuthConfigured()) throw new Error('AUTH_NOT_CONFIGURED');
    const jar = await cookies();
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        global: { fetch: timedFetch },
        cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
        cookies: {
            getAll: () => jar.getAll(),
            setAll: values => { for (const { name, value, options } of values) jar.set(name, value, options); },
        },
    });
}

export async function getVerifiedUser() {
    const client = await createAuthClient();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([client.auth.getUser(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 2500); })]).finally(() => clearTimeout(timeout));
    const { data, error } = result;
    if (error) {
        if (error.name === 'AuthSessionMissingError' || error.status === 400 || error.status === 401 || error.status === 403) return null;
        throw new Error('AUTH_UNAVAILABLE');
    }
    return data.user?.is_anonymous ? null : data.user;
}

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SECRET_KEY?.trim();
    if (!url || !key) throw new Error('USAGE_NOT_CONFIGURED');
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: timedFetch } });
}

export function authJSON(body: unknown, status = 200) {
    return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}
