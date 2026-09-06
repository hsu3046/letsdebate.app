import { getVerifiedUser, isAuthConfigured, authJSON, AUTH_UNAVAILABLE } from '@/lib/auth/server';

export async function GET() {
    if (!isAuthConfigured()) return authJSON({ configured: false, user: null });
    try {
        const user = await getVerifiedUser();
        return authJSON({ configured: true, user: user ? { id: user.id, name: String(user.user_metadata.full_name || user.user_metadata.name || '토론 팬').slice(0,80) } : null });
    } catch { return authJSON({ error: AUTH_UNAVAILABLE }, 503); }
}
